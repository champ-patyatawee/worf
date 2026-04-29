import { Router } from 'express';
import { authController, registerSchema, loginSchema } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/register - Register new user
 */
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler((req, res) => authController.register(req, res))
);

/**
 * POST /api/auth/login - Login user
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler((req, res) => authController.login(req, res))
);

/**
 * POST /api/auth/logout - Logout user
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler((req, res) => authController.logout(req, res))
);

/**
 * GET /api/auth/me - Get current user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler((req, res) => authController.me(req, res))
);

export default router;
