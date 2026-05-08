import { Router } from 'express';
import { promptTemplateController } from '../controllers/promptTemplateController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/prompt-templates - List current user's prompt templates
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => promptTemplateController.list(req, res))
);

/**
 * GET /api/prompt-templates/:id - Get prompt template by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => promptTemplateController.get(req, res))
);

/**
 * POST /api/prompt-templates - Create new prompt template
 */
router.post(
  '/',
  authenticate,
  asyncHandler((req, res) => promptTemplateController.create(req, res))
);

/**
 * PUT /api/prompt-templates/:id - Update prompt template
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler((req, res) => promptTemplateController.update(req, res))
);

/**
 * DELETE /api/prompt-templates/:id - Delete prompt template
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler((req, res) => promptTemplateController.delete(req, res))
);

export default router;
