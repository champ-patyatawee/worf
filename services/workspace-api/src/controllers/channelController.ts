import { Response } from 'express';
import { z } from 'zod';
import { channelService } from '../services/channelService';
import { AuthenticatedRequest } from '../types';
import { formatResponse, formatError } from '../utils';

export const createChannelSchema = z.object({
  name: z.string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name too long')
    .regex(/^[a-z0-9-]+$/, 'Channel name must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['public', 'private', 'direct']).optional().default('public'),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Channel name must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(500).optional(),
});

export const inviteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export class ChannelController {
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const channels = await channelService.list(userId);
    res.json(formatResponse(channels));
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const channel = await channelService.create(req.body, req.user.userId);
    res.status(201).json(formatResponse(channel));
  }

  async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const channel = await channelService.get(req.params.id, userId);
    res.json(formatResponse(channel));
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const channel = await channelService.update(req.params.id, req.body);
    res.json(formatResponse(channel));
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const result = await channelService.delete(req.params.id, req.user.userId);
    res.json(formatResponse(result));
  }

  async join(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const result = await channelService.join(req.params.id, req.user.userId);
    res.json(formatResponse(result));
  }

  async leave(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const result = await channelService.leave(req.params.id, req.user.userId);
    res.json(formatResponse(result));
  }

  async invite(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const { userId: targetUserId } = req.body;
    const result = await channelService.invite(req.params.id, targetUserId, req.user.userId);
    res.json(formatResponse(result));
  }

  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const result = await channelService.removeMember(req.params.id, req.params.userId, req.user.userId);
    res.json(formatResponse(result));
  }

  async getMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const members = await channelService.getMembers(req.params.id);
    res.json(formatResponse(members));
  }
}

export const channelController = new ChannelController();
