import { Response } from 'express';
import { promptTemplateService } from '../services/promptTemplateService';
import { AuthenticatedRequest } from '../types';

export class PromptTemplateController {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const templates = await promptTemplateService.listByUser(req.user.userId);
      res.json({ success: true, data: templates });
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
      const template = await promptTemplateService.get(id);
      if (!template) {
        return res.status(404).json({ success: false, error: 'Prompt template not found' });
      }
      // Verify ownership
      if (template.userId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      res.json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { name, content, description, isDefault } = req.body;

      if (!name || !content) {
        return res.status(400).json({
          success: false,
          error: 'name and content are required',
        });
      }

      const result = await promptTemplateService.create(req.user.userId, {
        name,
        content,
        description,
        isDefault,
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
      const { name, content, description, isDefault } = req.body;

      const result = await promptTemplateService.update(id, req.user.userId, {
        name,
        content,
        description,
        isDefault,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'Prompt template not found') {
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

      await promptTemplateService.delete(id, req.user.userId);

      res.json({ success: true, message: 'Prompt template deleted' });
    } catch (error: any) {
      if (error.message === 'Prompt template not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const promptTemplateController = new PromptTemplateController();
