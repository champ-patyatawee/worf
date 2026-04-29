import { Router } from 'express';
import { userController, updateStatusSchema } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/users - List users
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => userController.list(req, res))
);

/**
 * GET /api/users/online - List online users only
 */
router.get(
  '/online',
  authenticate,
  asyncHandler((req, res) => userController.listOnline(req, res))
);

/**
 * GET /api/users/presence?userIds=id1,id2 - Get presence for multiple users
 */
router.get(
  '/presence',
  authenticate,
  asyncHandler((req, res) => userController.getPresenceBulk(req, res))
);

/**
 * GET /api/users/search?q=query - Search users
 */
router.get(
  '/search',
  authenticate,
  asyncHandler((req, res) => userController.search(req, res))
);

/**
 * GET /api/users/:id - Get user
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => userController.get(req, res))
);

/**
 * PUT /api/users/:id/status - Update user status
 */
router.put(
  '/:id/status',
  authenticate,
  validateBody(updateStatusSchema),
  asyncHandler((req, res) => userController.updateStatus(req, res))
);

/**
 * GET /api/users/:id/presence - Get user presence
 */
router.get(
  '/:id/presence',
  authenticate,
  asyncHandler((req, res) => userController.getPresence(req, res))
);

/**
 * GET /api/users/:id/messages - Get direct messages with user
 */
router.get(
  '/:id/messages',
  authenticate,
  asyncHandler((req, res) => userController.getDirectMessages(req, res))
);

/**
 * POST /api/users/:id/messages - Send direct message to user
 */
router.post(
  '/:id/messages',
  authenticate,
  asyncHandler((req, res) => userController.sendDirectMessage(req, res))
);

export default router;
