import { Router } from 'express';
import { agentController } from '../controllers/agentController';
import { chatWithAgent, chatWithAgentDM } from '../controllers/agentChatController';
import { toolExecutionController } from '../controllers/toolExecutionController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/agents - List all agents
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => agentController.getAgents(req, res))
);

/**
 * GET /api/agents/:id - Get agent by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => agentController.getAgent(req, res))
);

/**
 * GET /api/agents/name/:name - Get agent by name
 */
router.get(
  '/name/:name',
  authenticate,
  asyncHandler((req, res) => agentController.getAgentByName(req, res))
);

/**
 * POST /api/agents - Create new agent
 */
router.post(
  '/',
  authenticate,
  asyncHandler((req, res) => agentController.createAgent(req, res))
);

/**
 * PUT /api/agents/:id - Update agent
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler((req, res) => agentController.updateAgent(req, res))
);

/**
 * DELETE /api/agents/:id - Delete agent
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler((req, res) => agentController.deleteAgent(req, res))
);

/**
 * POST /api/agents/:name/chat - Chat with agent (streaming)
 */
router.post(
  '/:name/chat',
  authenticate,
  asyncHandler((req, res) => chatWithAgent(req, res))
);

/**
 * POST /api/agents/:name/dm - DM with agent (streaming)
 */
router.post(
  '/:name/dm',
  authenticate,
  asyncHandler((req, res) => chatWithAgentDM(req, res))
);

/**
 * POST /api/agents/:name/execute-tool - Execute a tool for this agent
 */
router.post(
  '/:name/execute-tool',
  authenticate,
  asyncHandler((req, res) => toolExecutionController.executeTool(req, res))
);

export default router;