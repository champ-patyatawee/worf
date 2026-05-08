import { Response } from 'express';
import { chatSessionService } from '../services/chatSessionService';
import { AuthenticatedRequest } from '../types';

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
        // Partial success - user message saved but AI failed
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
}

export const chatSessionController = new ChatSessionController();
