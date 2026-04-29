import { Router } from 'express';
import { aiProviderController } from '../controllers/aiProviderController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => aiProviderController.getProviders(req, res))
);

router.get(
  '/:id',
  authenticate,
  asyncHandler((req, res) => aiProviderController.getProvider(req, res))
);

router.post(
  '/',
  authenticate,
  asyncHandler((req, res) => aiProviderController.createProvider(req, res))
);

router.put(
  '/:id',
  authenticate,
  asyncHandler((req, res) => aiProviderController.updateProvider(req, res))
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler((req, res) => aiProviderController.deleteProvider(req, res))
);

export default router;