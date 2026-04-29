import { Response } from 'express';
import { z } from 'zod';
import { messageService } from '../services/messageService';
import { AuthenticatedRequest } from '../types';
import { formatResponse, formatError } from '../utils';
import { emitToChannel } from '../socket/socket';

export const sendMessageSchema = z.object({
  content: z.string().max(10000, 'Message too long').optional().default(''),
  threadId: z.string().optional(),
  imageIds: z.array(z.string()).optional(),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(64, 'Emoji too long'),
});

export class MessageController {
  async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    const beforeParam = req.query.before as string | undefined;
    const before = beforeParam && beforeParam !== 'undefined' && beforeParam.trim() !== '' ? beforeParam : undefined;
    const afterParam = req.query.after as string | undefined;
    const after = afterParam && afterParam !== 'undefined' && afterParam.trim() !== '' ? afterParam : undefined;
    const limitParam = parseInt(req.query.limit as string);
    const limit = isNaN(limitParam) ? 5 : Math.min(Math.max(limitParam, 1), 100);
    
    const result = await messageService.getChannelMessages(req.params.id, before, after, limit);
    res.json(formatResponse(result));
  }

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    
    const message = await messageService.sendMessage(
      req.params.id,
      req.user.userId,
      req.body
    );
    
    // Emit to all users in the channel (including sender) via socket
    emitToChannel(req.params.id, 'receive_message', message);
    
    res.status(201).json(formatResponse(message));
  }

  async getThread(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await messageService.getThread(req.params.id);
    res.json(formatResponse(result));
  }

  async getMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await messageService.getMessage(req.params.id);
    res.json(formatResponse(result));
  }

  async addReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    
    const reaction = await messageService.addReaction(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.status(201).json(formatResponse(reaction));
  }

  async removeReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    
    const { emoji } = req.body;
    const result = await messageService.removeReaction(
      req.params.id,
      req.user.userId,
      emoji
    );
    res.json(formatResponse(result));
  }
}

export const messageController = new MessageController();
