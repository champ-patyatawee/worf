import { Router } from 'express';
import { messageController, sendMessageSchema, addReactionSchema } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/channels/:id/messages - Get channel messages
 */
router.get(
  '/channels/:id/messages',
  authenticate,
  asyncHandler((req, res) => messageController.getMessages(req, res))
);

/**
 * POST /api/channels/:id/messages - Send message to channel
 */
router.post(
  '/channels/:id/messages',
  authenticate,
  validateBody(sendMessageSchema),
  asyncHandler((req, res) => messageController.sendMessage(req, res))
);

/**
 * GET /api/messages/:id/thread - Get message thread
 */
router.get(
  '/messages/:id/thread',
  authenticate,
  asyncHandler((req, res) => messageController.getThread(req, res))
);

/**
 * GET /api/messages/:id - Get single message by ID
 */
router.get(
  '/messages/:id',
  authenticate,
  asyncHandler((req, res) => messageController.getMessage(req, res))
);

/**
 * POST /api/messages/:id/reactions - Add reaction to message
 */
router.post(
  '/messages/:id/reactions',
  authenticate,
  validateBody(addReactionSchema),
  asyncHandler((req, res) => messageController.addReaction(req, res))
);

/**
 * DELETE /api/messages/:id/reactions - Remove reaction from message
 */
router.delete(
  '/messages/:id/reactions',
  authenticate,
  asyncHandler((req, res) => messageController.removeReaction(req, res))
);

export default router;
