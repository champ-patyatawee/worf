import { Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { AuthenticatedRequest } from '../types';
import { formatResponse, formatError } from '../utils';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await authService.register(req.body);
    res.status(201).json(formatResponse(result));
  }

  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    res.json(formatResponse(result));
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const result = await authService.logout(req.user.userId);
    res.json(formatResponse(result));
  }

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }
    const user = await authService.getCurrentUser(req.user.userId);
    res.json(formatResponse({ user }));
  }
}

export const authController = new AuthController();
