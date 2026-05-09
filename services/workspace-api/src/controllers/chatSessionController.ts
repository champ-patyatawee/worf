import { Response } from 'express';
import { chatSessionService } from '../services/chatSessionService';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/database';

export class ChatSessionController {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const sessions = await chatSessionService.listByUser(req.user.userId);
      res.json({ success: true, data: sessions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async get(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { id } = req.params;
      const session = await chatSessionService.get(id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Chat session not found' });
      }
      if (session.userId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      res.json({ success: true, data: session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { title, modelId, promptTemplateId } = req.body;

      const result = await chatSessionService.create(req.user.userId, {
        title,
        modelId,
        promptTemplateId,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { id } = req.params;
      const { title, modelId, promptTemplateId } = req.body;

      const result = await chatSessionService.update(id, req.user.userId, {
        title,
        modelId,
        promptTemplateId,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'Chat session not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { id } = req.params;

      await chatSessionService.delete(id, req.user.userId);

      res.json({ success: true, message: 'Chat session deleted' });
    } catch (error: any) {
      if (error.message === 'Chat session not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { id } = req.params;
      const { before, limit } = req.query;

      const result = await chatSessionService.getMessages(
        id,
        req.user.userId,
        before as string | undefined,
        limit ? parseInt(limit as string, 10) : 50,
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'Chat session not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { id } = req.params;
      const { content, toolName, toolParams, toolContext } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required',
        });
      }

      const result = await chatSessionService.sendMessage(id, req.user.userId, content, toolName, toolParams, toolContext);

      if (result.error) {
        return res.json({
          success: true,
          data: {
            userMessage: result.userMessage,
            assistantMessage: result.assistantMessage,
            error: result.error,
          },
        });
      }

      res.json({
        success: true,
        data: {
          userMessage: result.userMessage,
          assistantMessage: result.assistantMessage,
        },
      });
    } catch (error: any) {
      if (error.message === 'Chat session not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async streamMessage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { id } = req.params;
      const { content, toolContext } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      const result = await chatSessionService.streamMessage(id, req.user.userId, content, toolContext);

      if (result.error) {
        return res.json({
          success: true,
          data: { userMessage: result.userMessage, assistantMessage: null, error: result.error },
        });
      }

      // SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // Send user message event
      res.write(`data: ${JSON.stringify({ type: 'user', message: result.userMessage })}\n\n`);

      // Stream AI response chunks
      const reader = result.streamResponse!.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const chunk = parsed.choices?.[0]?.delta?.content || '';
                if (chunk) {
                  fullContent += chunk;
                  res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('[StreamMessage] Stream read error:', err);
      }

      // Save assistant message
      let assistantMessage = null;
      if (fullContent) {
        assistantMessage = await prisma.chatMessage.create({
          data: { chatId: id, role: 'assistant', content: fullContent },
        });
      }

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMessage })}\n\n`);
      res.end();
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: error.message });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
    }
  }
}

export const chatSessionController = new ChatSessionController();
