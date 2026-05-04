import { Response } from 'express';
import { dmService } from '../services/dmService';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { formatResponse, formatError } from '../utils';

export class DmController {
  /**
   * POST /api/dm - Create or get DM conversation with a user
   */
  async getOrCreate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    const { recipientId } = req.body;

    if (!recipientId || typeof recipientId !== 'string') {
      res.status(400).json(formatError('recipientId is required'));
      return;
    }

    try {
      const conversation = await dmService.getOrCreateConversation(
        req.user.userId,
        recipientId
      );
      res.status(201).json(formatResponse(conversation));
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json(formatError(error.message));
      } else {
        throw error;
      }
    }
  }

  /**
   * GET /api/dms - List all DM conversations for current user
   */
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    const conversations = await dmService.listConversations(req.user.userId);
    res.json(formatResponse(conversations));
  }

  /**
   * DELETE /api/dm/:recipientId - Delete conversation with a user
   */
  async deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    const { recipientId } = req.params;

    if (!recipientId) {
      res.status(400).json(formatError('recipientId is required'));
      return;
    }

    try {
      // Only allow deleting conversations with agents
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { role: true },
      });

      if (!recipient || recipient.role !== 'agent') {
        res.status(403).json(formatError('Can only delete conversations with agents'));
        return;
      }

      await dmService.deleteConversation(req.user.userId, recipientId);
      res.json(formatResponse({ success: true }));
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json(formatError(error.message));
      } else {
        throw error;
      }
    }
  }

  /**
   * PUT /api/dms/:recipientId/read - Mark DMs from a user as read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    const { recipientId } = req.params;

    if (!recipientId) {
      res.status(400).json(formatError('recipientId is required'));
      return;
    }

    try {
      await dmService.markAsRead(req.user.userId, recipientId);
      res.json(formatResponse({ success: true }));
    } catch (error: any) {
      if (error.status) {
        res.status(error.status).json(formatError(error.message));
      } else {
        throw error;
      }
    }
  }
}

export const dmController = new DmController();
