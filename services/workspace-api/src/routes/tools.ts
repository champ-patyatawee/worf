// src/routes/tools.ts
import { Router } from 'express';
import { toolConfigController } from '../controllers/toolConfigController';
import { toolExecutionController } from '../controllers/toolExecutionController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/tools — List all available tools + their global config
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => toolConfigController.getTools(req, res))
);

/**
 * PUT /api/tools/:toolName/config — Update global config for a tool
 */
router.put(
  '/:toolName/config',
  authenticate,
  asyncHandler((req, res) => toolConfigController.updateToolConfig(req, res))
);

/**
 * POST /api/tools/:toolName/execute — Execute a tool (e.g. webfetch, image_gen)
 * Body: { params: { url, prompt, ... } }
 */
router.post(
  '/:toolName/execute',
  authenticate,
  asyncHandler((req, res) => toolExecutionController.executeTool(req, res))
);

export default router;
