import { Router } from 'express';
import { chatSessionController } from '../controllers/chatSessionController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/chat-sessions - List current user's chat sessions
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => chatSessionController.list(req, res))
);

/**
 * GET /api/chat-sessions/:id - Get chat session by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => chatSessionController.get(req, res))
);

/**
 * POST /api/chat-sessions - Create new chat session
 */
router.post(
  '/',
  authenticate,
  asyncHandler((req, res) => chatSessionController.create(req, res))
);

/**
 * PUT /api/chat-sessions/:id - Update chat session (title, model, template)
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler((req, res) => chatSessionController.update(req, res))
);

/**
 * DELETE /api/chat-sessions/:id - Delete chat session (cascades messages)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler((req, res) => chatSessionController.delete(req, res))
);

/**
 * GET /api/chat-sessions/:id/messages - Get messages for a session
 */
router.get(
  '/:id/messages',
  authenticate,
  asyncHandler((req, res) => chatSessionController.getMessages(req, res))
);

/**
 * POST /api/chat-sessions/:id/messages - Send a message and get AI response (non-streaming)
 */
router.post(
  '/:id/messages',
  authenticate,
  asyncHandler((req, res) => chatSessionController.sendMessage(req, res))
);

/**
 * POST /api/chat-sessions/:id/stream - Send a message and stream AI response (SSE)
 */
router.post(
  '/:id/stream',
  authenticate,
  asyncHandler((req, res) => chatSessionController.streamMessage(req, res))
);

export default router;
