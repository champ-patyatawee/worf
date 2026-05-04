import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { agentService } from '../services/agentService';

const prisma = new PrismaClient();

export class AgentController {
  /**
   * GET /api/agents - List all agents
   */
  async getAgents(_req: Request, res: Response) {
    try {
      const agents = await agentService.list();
      res.json({ success: true, data: agents });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/agents/:id - Get agent by ID
   */
  async getAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agent = await agentService.get(id);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }
      res.json({ success: true, data: agent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/agents/name/:name - Get agent by name (for @mention)
   */
  async getAgentByName(req: Request, res: Response) {
    try {
      const { name } = req.params;
      const agent = await agentService.getByName(name);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }
      res.json({ success: true, data: agent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/agents - Create new agent
   */
  async createAgent(req: Request, res: Response) {
    try {
      const { name, displayName, description, systemPrompt, avatar, providerId, agentUrl, agentType, slashCommand, webViewUrl } = req.body;
      
      if (!name || !systemPrompt) {
        return res.status(400).json({ 
          success: false, 
          error: 'name and systemPrompt are required' 
        });
      }

      const agent = await agentService.create({
        name,
        displayName,
        description,
        systemPrompt,
        avatar,
        providerId,
        agentUrl,
        agentType,
        slashCommand,
        webViewUrl,
      });
      
      // Notify external agents to reload their config on creation too
      if (agent?.agentType === 'external' && agent?.agentUrl) {
        try {
          const reloadUrl = `${agent.agentUrl.replace(/\/$/, '')}/reload-config`;
          const response = await fetch(reloadUrl, { method: 'POST' });
          if (response.ok) {
            console.log(`[AgentController] Notified ${agent.name} to load initial config`);
          }
        } catch (err) {
          console.error(`[AgentController] Failed to notify agent ${agent?.name} to load config:`, err);
        }
      }
      
      // Create a corresponding user for the agent (so agent can send messages)
      try {
        const agentUserEmail = `agent-${name}@worf.dev`;
        const existingUser = await prisma.user.findUnique({
          where: { email: agentUserEmail },
        });
        
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: agentUserEmail,
              name: displayName || name.replace('Agent', ''),
              password: 'agent-placeholder', // placeholder - agent users can't login
              status: 'online',
              role: 'agent',
            },
          });
          console.log(`[AgentController] Created agent user: ${agentUserEmail}`);
        }
      } catch (userErr) {
        console.error('[AgentController] Failed to create agent user:', userErr);
        // Continue - agent was created successfully even if user creation failed
      }
      
      res.json({ success: true, data: agent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/agents/:id - Update agent
   */
  async updateAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { displayName, description, systemPrompt, avatar, isActive, providerId, agentUrl, agentType, slashCommand, webViewUrl } = req.body;
      
      const agent = await agentService.update(id, {
        displayName,
        description,
        systemPrompt,
        skills,
        avatar,
        isActive,
        providerId,
        agentUrl,
        agentType,
        slashCommand,
        webViewUrl,
      });
      
      // Update the corresponding agent user if displayName changed
      if (displayName) {
        try {
          const agentName = agent?.name;
          if (agentName) {
            await prisma.user.updateMany({
              where: { email: `agent-${agentName}@worf.dev` },
              data: { name: displayName },
            });
          }
        } catch (userErr) {
          console.error('[AgentController] Failed to update agent user:', userErr);
        }
      }
      
      // Notify external agents to reload their config
      if (agent?.agentType === 'external' && agent?.agentUrl) {
        try {
          const reloadUrl = `${agent.agentUrl.replace(/\/$/, '')}/reload-config`;
          const response = await fetch(reloadUrl, { method: 'POST' });
          if (response.ok) {
            console.log(`[AgentController] Notified ${agent.name} to reload config`);
          } else {
            console.warn(`[AgentController] Agent ${agent.name} reload returned ${response.status}`);
          }
        } catch (err) {
          console.error(`[AgentController] Failed to notify agent ${agent?.name} to reload config:`, err);
        }
      }
      
      res.json({ success: true, data: agent });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/agents/:id - Delete agent
   */
  async deleteAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Get agent name before deleting
      const agent = await agentService.get(id);
      const agentName = agent?.name;
      
      await agentService.delete(id);
      
      // Delete the corresponding agent user
      if (agentName) {
        try {
          await prisma.user.delete({
            where: { email: `agent-${agentName}@worf.dev` },
          });
          console.log(`[AgentController] Deleted agent user: agent-${agentName}@worf.dev`);
        } catch (userErr) {
          console.error('[AgentController] Failed to delete agent user:', userErr);
          // Continue - agent was deleted successfully even if user deletion failed
        }
      }
      
      res.json({ success: true, message: 'Agent deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const agentController = new AgentController();