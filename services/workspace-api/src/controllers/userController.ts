import { Response } from 'express';
import { z } from 'zod';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../types';
import { formatResponse, formatError } from '../utils';

export const updateStatusSchema = z.object({
  status: z.enum(['online', 'offline', 'busy', 'away']),
});

export class UserController {
  async list(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const users = await userService.list();
    res.json(formatResponse(users));
  }

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = await userService.get(req.params.id);
    res.json(formatResponse(user));
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    
    const user = await userService.updateStatus(req.params.id, req.body);
    res.json(formatResponse(user));
  }

  async getPresence(req: AuthenticatedRequest, res: Response): Promise<void> {
    const presence = await userService.getPresence(req.params.id);
    res.json(formatResponse(presence));
  }

  async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json(formatError('Search query is required'));
      return;
    }
    const users = await userService.search(query);
    res.json(formatResponse(users));
  }

  async listOnline(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const users = await userService.listOnline();
    res.json(formatResponse(users));
  }

  async getPresenceBulk(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userIds } = req.query;
    
    if (!userIds || typeof userIds !== 'string') {
      res.status(400).json(formatError('userIds query parameter is required'));
      return;
    }

    const idsArray = userIds.split(',').map(id => id.trim()).filter(Boolean);
    if (idsArray.length === 0) {
      res.status(400).json(formatError('At least one userId is required'));
      return;
    }

    if (idsArray.length > 100) {
      res.status(400).json(formatError('Maximum 100 userIds allowed'));
      return;
    }

    const presence = await userService.getPresenceBulk(idsArray);
    res.json(formatResponse(presence));
  }

  async getDirectMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    
    const beforeParam = req.query.before as string | undefined;
    const before = beforeParam && beforeParam !== 'undefined' && beforeParam.trim() !== '' ? beforeParam : undefined;
    const afterParam = req.query.after as string | undefined;
    const after = afterParam && afterParam !== 'undefined' && afterParam.trim() !== '' ? afterParam : undefined;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const result = await userService.getDirectMessages(
      req.user.userId, 
      req.params.id, 
      { before, after, limit }
    );
    res.json(formatResponse(result));
  }

  async sendDirectMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    
    const { content, imageIds } = req.body;
    const message = await userService.sendDirectMessage(
      req.user.userId,
      req.params.id,
      content,
      imageIds
    );
    res.status(201).json(formatResponse(message));
  }
}

export const userController = new UserController();
