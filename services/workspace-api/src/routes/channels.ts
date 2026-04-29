import { Router } from 'express';
import { channelController, createChannelSchema, updateChannelSchema, inviteSchema } from '../controllers/channelController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/channels - List channels
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => channelController.list(req, res))
);

/**
 * POST /api/channels - Create channel
 */
router.post(
  '/',
  authenticate,
  validateBody(createChannelSchema),
  asyncHandler((req, res) => channelController.create(req, res))
);

/**
 * GET /api/channels/:id - Get channel
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => channelController.get(req, res))
);

/**
 * PUT /api/channels/:id - Update channel
 */
router.put(
  '/:id',
  authenticate,
  validateBody(updateChannelSchema),
  asyncHandler((req, res) => channelController.update(req, res))
);

/**
 * DELETE /api/channels/:id - Delete channel
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler((req, res) => channelController.delete(req, res))
);

/**
 * POST /api/channels/:id/join - Join channel (public only)
 */
router.post(
  '/:id/join',
  authenticate,
  asyncHandler((req, res) => channelController.join(req, res))
);

/**
 * POST /api/channels/:id/leave - Leave channel
 */
router.post(
  '/:id/leave',
  authenticate,
  asyncHandler((req, res) => channelController.leave(req, res))
);

/**
 * POST /api/channels/:id/invite - Invite user to channel (admin only)
 */
router.post(
  '/:id/invite',
  authenticate,
  validateBody(inviteSchema),
  asyncHandler((req, res) => channelController.invite(req, res))
);

/**
 * DELETE /api/channels/:id/members/:userId - Remove member from channel (admin only)
 */
router.delete(
  '/:id/members/:userId',
  authenticate,
  asyncHandler((req, res) => channelController.removeMember(req, res))
);

/**
 * GET /api/channels/:id/members - Get channel members
 */
router.get(
  '/:id/members',
  authenticate,
  asyncHandler((req, res) => channelController.getMembers(req, res))
);

export default router;
