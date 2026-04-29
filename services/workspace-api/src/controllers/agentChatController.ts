import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { agentService } from '../services/agentService';
import { aiProviderService } from '../services/aiProviderService';
import { messageService } from '../services/messageService';
import { emitToChannel } from '../socket/socket';
import { emitToDM } from '../socket/socket';

/**
 * POST /api/agents/:name/chat - Chat with an agent (channel thread)
 * Supports both embedded (LLM) and external (microservice) agents
 */
export async function chatWithAgent(req: Request, res: Response) {
  const { name } = req.params;
  const { task, history, threadId, channelId } = req.body;
  
  if (!task) {
    return res.status(400).json({ success: false, error: 'task is required' });
  }
  
  // Get agent by name
  const agent = await agentService.getByName(name);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  if (!agent.isActive) {
    return res.status(400).json({ success: false, error: 'Agent is inactive' });
  }
  
  // Check if external agent (microservice)
  if (agent.agentUrl && agent.agentType === 'external') {
    return handleExternalAgentChat(req, res, agent, 'channel');
  }
  
  // Embedded agent - use LLM
  return handleEmbeddedAgentChat(req, res, agent);
}

/**
 * POST /api/agents/:name/dm - Chat with agent in DM
 * Supports both embedded (LLM) and external (microservice) agents
 */
export async function chatWithAgentDM(req: Request, res: Response) {
  const { name } = req.params;
  const { task, history, userId, recipientId } = req.body;
  
  if (!task) {
    return res.status(400).json({ success: false, error: 'task is required' });
  }
  
  if (!userId || !recipientId) {
    return res.status(400).json({ success: false, error: 'userId and recipientId are required' });
  }
  
  // Get agent by name
  const agent = await agentService.getByName(name);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  if (!agent.isActive) {
    return res.status(400).json({ success: false, error: 'Agent is inactive' });
  }
  
  // Check if external agent (microservice)
  if (agent.agentUrl && agent.agentType === 'external') {
    return handleExternalAgentChat(req, res, agent, 'dm');
  }
  
  // Embedded agent - use LLM
  return handleEmbeddedAgentDM(req, res, agent);
}

/**
 * Handle external agent (microservice) - proxy to agent service
 */
async function handleExternalAgentChat(
  req: Request, 
  res: Response, 
  agent: any, 
  mode: 'channel' | 'dm'
) {
  const { task, history, threadId, channelId, userId, recipientId } = req.body;
  
  try {
    // Build request to external agent service
    const agentRequest = {
      task,
      history: history || [],
      threadId,
      channelId,
      userId,
      recipientId,
    };
    
    // Call external agent service /chat endpoint
    const agentUrl = agent.agentUrl.replace(/\/$/, '');
    const response = await fetch(`${agentUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentRequest),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(502).json({ success: false, error: `Agent service error: ${error}` });
    }
    
    const result = await response.json() as { success?: boolean; data?: { content?: string }; error?: string };
    
    if (!result.success || !result.data?.content) {
      return res.status(500).json({ success: false, error: result.error || 'No response from agent' });
    }
    
    const fullResponse = result.data.content;
    
    // Get or create agent user
    const agentUserId = await getOrCreateAgentUser(agent);
    
    // Save response based on mode
    if (mode === 'channel' && threadId && channelId) {
      // Save as thread reply
      const agentMessage = await messageService.sendMessage(channelId, agentUserId, {
        content: fullResponse,
        threadId,
      });
      console.log(`[External Agent] Saved response as thread reply, threadId: ${threadId}`);
      
      // Emit socket event
      emitToChannel(channelId, 'receive_message', agentMessage);
      
      return res.json({ success: true, data: { content: fullResponse, message: agentMessage } });
    } else if (mode === 'dm' && userId) {
      // Save as DM message
      const agentMessage = await messageService.sendDMMessage(agentUserId, userId, fullResponse);
      console.log(`[External Agent DM] Saved response as DM message, from: ${agentUserId}, to: ${userId}`);
      
      // Emit socket event
      emitToDM(agentUserId, userId, 'new_dm_message', agentMessage);
      
      return res.json({ success: true, data: { content: fullResponse, message: agentMessage } });
    }
    
    // No thread/channel - just return
    return res.json({ success: true, data: { content: fullResponse } });
    
  } catch (error: any) {
    console.error('[External Agent] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle embedded agent - use LLM (original logic)
 */
async function handleEmbeddedAgentChat(req: Request, res: Response, agent: any) {
  const { task, history, threadId, channelId } = req.body;
  
  // Get AI provider - use agent's selected provider, or fall back to default
  let provider = null;
  if (agent.providerId) {
    provider = await aiProviderService.get(agent.providerId);
  }
  if (!provider) {
    provider = await aiProviderService.getActive();
  }
  
  if (!provider) {
    return res.status(400).json({ 
      success: false, 
      error: 'No AI provider configured. Go to Settings > AI Provider to add one.' 
    });
  }
  
  // Build full prompt
  const systemPrompt = `${agent.systemPrompt}\n\n${agent.skills}`;
  
  try {
    const apiUrl = provider.apiUrl;
    const apiKey = provider.apiKey;
    const model = provider.model;
    
    let endpoint = '';
    let authHeader = '';
    let body: Record<string, unknown> = {};
    
    if (provider.provider === 'openai' || provider.provider === 'azure' || provider.provider === 'openrouter') {
      const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
      endpoint = `${baseUrl}/chat/completions`;
      authHeader = `Bearer ${apiKey}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(history || []).map((h: { role: string; content: string }) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        })),
        { role: 'user', content: task },
      ];
      
      body = { model, messages, stream: false };
    } else {
      const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
      endpoint = `${baseUrl}/chat/completions`;
      authHeader = `Bearer ${apiKey}`;
      body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: task },
        ],
        stream: false,
      };
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ success: false, error: `API error: ${error}` });
    }
    
    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string; block?: { text?: string } } }>;
    };
    
    let fullResponse = '';
    if (data.choices?.[0]?.message?.content) {
      fullResponse = data.choices[0].message.content;
    } else if (data.choices?.[0]?.message?.block?.text) {
      fullResponse = data.choices[0].message!.block!.text;
    }
    
    if (!fullResponse) {
      return res.status(500).json({ success: false, error: 'No response content from AI' });
    }
    
    // Save the response as a thread reply in the database
    if (threadId && channelId) {
      try {
        const agentUserId = await getOrCreateAgentUser(agent);
        const agentMessage = await messageService.sendMessage(channelId, agentUserId, {
          content: fullResponse,
          threadId,
        });
        console.log(`[Agent] Saved response as thread reply, threadId: ${threadId}`);
        emitToChannel(channelId, 'receive_message', agentMessage);
        return res.json({ success: true, data: { content: fullResponse, message: agentMessage } });
      } catch (saveErr) {
        console.error('[Agent] Failed to save thread reply:', saveErr);
        return res.status(500).json({ success: false, error: 'Failed to save thread reply' });
      }
    }
    
    return res.json({ success: true, data: { content: fullResponse } });
    
  } catch (error: any) {
    console.error('[Agent] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle embedded agent DM - use LLM (original logic)
 */
async function handleEmbeddedAgentDM(req: Request, res: Response, agent: any) {
  const { task, history, userId } = req.body;
  
  // Get AI provider
  let provider = null;
  if (agent.providerId) {
    provider = await aiProviderService.get(agent.providerId);
  }
  if (!provider) {
    provider = await aiProviderService.getActive();
  }
  
  if (!provider) {
    return res.status(400).json({ 
      success: false, 
      error: 'No AI provider configured. Go to Settings > AI Provider to add one.' 
    });
  }
  
  // Build full prompt
  const systemPrompt = `${agent.systemPrompt}\n\n${agent.skills}`;
  
  try {
    const apiUrl = provider.apiUrl;
    const apiKey = provider.apiKey;
    const model = provider.model;
    
    let endpoint = '';
    let authHeader = '';
    let body: Record<string, unknown> = {};
    
    if (provider.provider === 'openai' || provider.provider === 'azure' || provider.provider === 'openrouter') {
      const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
      endpoint = `${baseUrl}/chat/completions`;
      authHeader = `Bearer ${apiKey}`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(history || []).map((h: { role: string; content: string }) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        })),
        { role: 'user', content: task },
      ];
      
      body = { model, messages, stream: false };
    } else {
      const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
      endpoint = `${baseUrl}/chat/completions`;
      authHeader = `Bearer ${apiKey}`;
      body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: task },
        ],
        stream: false,
      };
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ success: false, error: `API error: ${error}` });
    }
    
    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string; block?: { text?: string } } }>;
    };
    
    let fullResponse = '';
    if (data.choices?.[0]?.message?.content) {
      fullResponse = data.choices[0].message.content;
    } else if (data.choices?.[0]?.message?.block?.text) {
      fullResponse = data.choices[0].message!.block!.text;
    }
    
    if (!fullResponse) {
      return res.status(500).json({ success: false, error: 'No response content from AI' });
    }
    
    // Save the response as a DM message in the database
    try {
      const agentUserId = await getOrCreateAgentUser(agent);
      const agentMessage = await messageService.sendDMMessage(agentUserId, userId, fullResponse);
      console.log(`[Agent DM] Saved response as DM message, from: ${agentUserId}, to: ${userId}`);
      emitToDM(agentUserId, userId, 'new_dm_message', agentMessage);
      return res.json({ success: true, data: { content: fullResponse, message: agentMessage } });
    } catch (saveErr) {
      console.error('[Agent DM] Failed to save DM message:', saveErr);
      return res.status(500).json({ success: false, error: 'Failed to save DM message' });
    }
    
  } catch (error: any) {
    console.error('[Agent DM] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get or create a system user for the agent
 */
async function getOrCreateAgentUser(agent: any): Promise<string> {
  const prisma = new PrismaClient();
  
  try {
    // Try to find existing agent user
    const existingUser = await prisma.user.findUnique({
      where: { email: `agent-${agent.name}@worf.dev` },
    });
    
    if (existingUser) {
      return existingUser.id;
    }
    
    // Create new agent user
    const newUser = await prisma.user.create({
      data: {
        email: `agent-${agent.name}@worf.dev`,
        name: agent.displayName || agent.name.replace('Agent', ''),
        password: 'agent-placeholder',
        status: 'online',
        role: 'agent',
      },
    });
    
    return newUser.id;
  } finally {
    await prisma.$disconnect();
  }
}