import { Router } from 'express';
import { dmController } from '../controllers/dmController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/dm - Create or get DM conversation
 * Body: { recipientId: string }
 */
router.post(
  '/',
  authenticate,
  asyncHandler((req, res) => dmController.getOrCreate(req, res))
);

/**
 * GET /api/dm - List all DM conversations
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => dmController.list(req, res))
);

/**
 * PUT /api/dm/:recipientId/read - Mark DMs as read
 */
router.put(
  '/:recipientId/read',
  authenticate,
  asyncHandler((req, res) => dmController.markAsRead(req, res))
);

/**
 * DELETE /api/dm/:recipientId - Delete conversation with a user
 */
router.delete(
  '/:recipientId',
  authenticate,
  asyncHandler((req, res) => dmController.deleteConversation(req, res))
);

export default router;
