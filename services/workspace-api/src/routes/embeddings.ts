import { Router, Response } from 'express';
import { embeddingService } from '../services/embeddingService';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { queueEmbedMessage } from '../queues/embeddingProducer';
import { prisma } from '../config/database';

const router = Router();

router.post(
  '/generate',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type, batchSize = 100, offset = 0 } = req.body as {
      type?: 'message' | 'directMessage' | 'all';
      batchSize?: number;
      offset?: number;
    };

    const results: {
      messages?: { processed: number; errors: number };
      directMessages?: { processed: number; errors: number };
    } = {};

    if (!type || type === 'all' || type === 'message') {
      results.messages = await embeddingService.generateMessageEmbeddings(
        batchSize,
        offset
      );
    }

    if (!type || type === 'all' || type === 'directMessage') {
      results.directMessages = await embeddingService.generateDMEmbeddings(
        batchSize,
        offset
      );
    }

    res.json({
      success: true,
      data: results,
    });
  })
);

router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await embeddingService.getEmbeddingStats();
    res.json({
      success: true,
      data: stats,
    });
  })
);

router.post(
  '/retry-missing',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const messagesWithoutEmbedding = await prisma.message.findMany({
      where: { embedding: null },
      select: { id: true, content: true },
      take: 1000,
    });

    const dmsWithoutEmbedding = await prisma.directMessage.findMany({
      where: { embedding: null },
      select: { id: true, content: true },
      take: 1000,
    });

    let queued = 0;

    for (const msg of messagesWithoutEmbedding) {
      await queueEmbedMessage('message', msg.id, msg.content);
      queued++;
    }

    for (const dm of dmsWithoutEmbedding) {
      await queueEmbedMessage('directMessage', dm.id, dm.content);
      queued++;
    }

    res.json({
      success: true,
      data: { queued },
    });
  })
);

export default router;