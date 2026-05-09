import { prisma } from '../config/database';
import { aiProviderService } from './aiProviderService';
import { getTool, getToolSkills } from '../tools/registry';
import { loadToolConfig } from '../tools/config';

export interface CreateChatSessionInput {
  title?: string;
  modelId?: string;
  promptTemplateId?: string;
}

export interface UpdateChatSessionInput {
  title?: string;
  modelId?: string;
  promptTemplateId?: string;
}

export class ChatSessionService {
  async listByUser(userId: string) {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string) {
    return prisma.chatSession.findUnique({
      where: { id },
      include: {
        promptTemplate: true,
      },
    });
  }

  async create(userId: string, data: CreateChatSessionInput) {
    return prisma.chatSession.create({
      data: {
        userId,
        title: data.title,
        modelId: data.modelId,
        promptTemplateId: data.promptTemplateId,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateChatSessionInput) {
    const existing = await prisma.chatSession.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Chat session not found');
    }

    return prisma.chatSession.update({
      where: { id },
      data: {
        title: data.title,
        modelId: data.modelId,
        promptTemplateId: data.promptTemplateId,
      },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.chatSession.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Chat session not found');
    }

    return prisma.chatSession.delete({
      where: { id },
    });
  }

  async getMessages(chatId: string, userId: string, before?: string, limit = 50) {
    const session = await prisma.chatSession.findFirst({
      where: { id: chatId, userId },
    });
    if (!session) {
      throw new Error('Chat session not found');
    }

    const where: any = { chatId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const hasMore = messages.length === limit;

    return {
      messages: messages.reverse(),
      pagination: { hasMore },
    };
  }

  async sendMessage(chatId: string, userId: string, content: string, toolName?: string, toolParams?: Record<string, unknown>, toolContext?: string) {
    const session = await prisma.chatSession.findFirst({
      where: { id: chatId, userId },
      include: {
        promptTemplate: true,
      },
    });
    if (!session) {
      throw new Error('Chat session not found');
    }

    if (!content?.trim()) {
      throw new Error('Message content is required');
    }

    // 1. Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        chatId,
        role: 'user',
        content: content.trim(),
      },
    });

    // 2. If a tool is specified, execute it
    let toolResultContent = '';
    if (toolName) {
      const tool = getTool(toolName);
      if (!tool) {
        return { userMessage, assistantMessage: null, error: `Tool '${toolName}' not found` };
      }

      const toolConfig = await loadToolConfig(toolName);
      if (!toolConfig.isEnabled) {
        return { userMessage, assistantMessage: null, error: `Tool '${toolName}' is disabled` };
      }

      try {
        const toolResult = await tool.handler(toolParams || {}, toolConfig.config);

        if (toolName === 'image_gen') {
          const assistantMessage = await prisma.chatMessage.create({
            data: {
              chatId,
              role: 'assistant',
              content: toolResult.content,
            },
          });

          if (!session.title) {
            const truncatedTitle = content.trim().substring(0, 60);
            await prisma.chatSession.update({
              where: { id: chatId },
              data: { title: truncatedTitle + (content.trim().length > 60 ? '...' : '') },
            });
          }

          return { userMessage, assistantMessage, error: null };
        }

        toolResultContent = toolResult.content;
      } catch (error: any) {
        toolResultContent = `[Tool Error — ${toolName}]:\n${error.message}`;
      }
    }

    // 3. Get AI provider
    let provider = null;
    if (session.modelId) {
      provider = await aiProviderService.get(session.modelId);
    }
    if (!provider) {
      provider = await aiProviderService.getActive();
    }
    if (!provider) {
      return {
        userMessage,
        assistantMessage: null,
        error: 'No AI provider configured. Go to Settings > AI Provider to add one.',
      };
    }

    // 4. Build system prompt from template + tool skills
    let systemPrompt = 'You are a helpful AI assistant.';
    if (session.promptTemplate?.content) {
      systemPrompt = session.promptTemplate.content;
    }

    try {
      const toolConfigs = await prisma.toolConfig.findMany({ where: { isEnabled: true } });
      const enabledToolNames = toolConfigs.map((tc: { toolName: string }) => tc.toolName);
      const toolSkills = getToolSkills(enabledToolNames);
      if (toolSkills) {
        systemPrompt += `\n\n${toolSkills}`;
      }
    } catch (err) {
      console.error('[ChatSession] Failed to load tool skills:', err);
    }

    // 5. Get conversation history
    const history = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // 6. Call the LLM
    try {
      const apiUrl = provider.apiUrl;
      const apiKey = provider.apiKey;
      const model = provider.model;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...(toolContext ? [{ role: 'system' as const, content: `[Persisted Web Fetch Context — previously fetched pages]:\n${toolContext}` }] : []),
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      if (toolResultContent) {
        messages.push({ role: 'system' as const, content: `[Tool Result — context for the conversation]:\n${toolResultContent}` });
      }

      const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
      const endpoint = `${baseUrl}/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          userMessage,
          assistantMessage: null,
          error: `AI API error: ${error}`,
        };
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      let assistantContent = '';
      if (data.choices?.[0]?.message?.content) {
        assistantContent = data.choices[0].message.content;
      }

      if (!assistantContent) {
        return {
          userMessage,
          assistantMessage: null,
          error: 'No response content from AI',
        };
      }

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          chatId,
          role: 'assistant',
          content: assistantContent,
        },
      });

      if (!session.title && history.length <= 1) {
        const truncatedTitle = content.trim().substring(0, 60);
        await prisma.chatSession.update({
          where: { id: chatId },
          data: { title: truncatedTitle + (content.trim().length > 60 ? '...' : '') },
        });
      }

      return {
        userMessage,
        assistantMessage,
        error: null,
      };
    } catch (error: any) {
      return {
        userMessage,
        assistantMessage: null,
        error: error.message,
      };
    }
  }

  // New streaming method
  async streamMessage(
    chatId: string,
    userId: string,
    content: string,
    toolContext?: string,
  ): Promise<{
    userMessage: any;
    assistantMessage: any | null;
    error?: string;
    streamResponse: Response | null;
  }> {
    const session = await prisma.chatSession.findFirst({
      where: { id: chatId, userId },
      include: { promptTemplate: true },
    });
    if (!session) throw new Error('Chat session not found');
    if (!content?.trim()) throw new Error('Message content is required');

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: { chatId, role: 'user', content: content.trim() },
    });

    // Get AI provider
    let provider = null;
    if (session.modelId) provider = await aiProviderService.get(session.modelId);
    if (!provider) provider = await aiProviderService.getActive();
    if (!provider) {
      return { userMessage, assistantMessage: null, error: 'No AI provider configured. Go to Settings > AI Provider to add one.', streamResponse: null };
    }

    // Build system prompt
    let systemPrompt = 'You are a helpful AI assistant.';
    if (session.promptTemplate?.content) systemPrompt = session.promptTemplate.content;

    // Append tool skills
    try {
      const toolConfigs = await prisma.toolConfig.findMany({ where: { isEnabled: true } });
      const enabledToolNames = toolConfigs.map((tc: { toolName: string }) => tc.toolName);
      const toolSkills = getToolSkills(enabledToolNames);
      if (toolSkills) systemPrompt += `\n\n${toolSkills}`;
    } catch (err) {
      console.error('[ChatSession] Failed to load tool skills:', err);
    }

    // Get conversation history
    const history = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(toolContext ? [{ role: 'system' as const, content: `[Persisted Web Fetch Context — previously fetched pages]:\n${toolContext}` }] : []),
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    // Call LLM with streaming
    const apiUrl = provider.apiUrl;
    const apiKey = provider.apiKey;
    const model = provider.model;
    const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
    const endpoint = `${baseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { userMessage, assistantMessage: null, error: `AI API error: ${errorText}`, streamResponse: null };
    }

    // Auto-generate title if first exchange
    if (!session.title && history.length <= 1) {
      const truncatedTitle = content.trim().substring(0, 60);
      await prisma.chatSession.update({
        where: { id: chatId },
        data: { title: truncatedTitle + (content.trim().length > 60 ? '...' : '') },
      });
    }

    return { userMessage, assistantMessage: null, error: null, streamResponse: response };
  }
}

export const chatSessionService = new ChatSessionService();
