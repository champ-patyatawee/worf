import { Router, Response } from 'express';
import { searchService, SearchMode } from '../services/searchService';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/database';

const MAX_MENTIONS = 5;

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q, channelIds, dmUserIds, limit, offset, mode } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const userId = req.user!.userId;
    const searchMode: SearchMode = mode === 'semantic' ? 'semantic' : 'fts';

    const channelNames = channelIds && typeof channelIds === 'string'
      ? channelIds.split(',').slice(0, MAX_MENTIONS)
      : undefined;
    
    const dmUserNameArray = dmUserIds && typeof dmUserIds === 'string'
      ? dmUserIds.split(',').slice(0, MAX_MENTIONS)
      : undefined;

    let channelIdArray: string[] | undefined;
    let dmUserIdArray: string[] | undefined;

    if (channelNames && channelNames.length > 0) {
      const channels = await prisma.channel.findMany({
        where: { name: { in: channelNames } },
        select: { id: true },
      });
      channelIdArray = channels.map(c => c.id);
    }

    if (dmUserNameArray && dmUserNameArray.length > 0) {
      const users = await prisma.user.findMany({
        where: { name: { in: dmUserNameArray } },
        select: { id: true },
      });
      dmUserIdArray = users.map(u => u.id);
    }

    const result = await searchService.search({
      query: q,
      userId,
      channelIds: channelIdArray,
      dmUserIds: dmUserIdArray,
      limit: limit && typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 20,
      offset: offset && typeof offset === 'string' ? parseInt(offset, 10) : 0,
      mode: searchMode,
    });

    res.json({
      success: true,
      data: result.results,
      total: result.total,
      query: q,
      mode: searchMode,
    });
  })
);

export default router;
