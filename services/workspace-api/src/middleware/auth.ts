import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // If request comes through Traefik gateway, trust X-User-* headers
    const proxyUserId = req.headers['x-user-id'] as string | undefined;
    if (proxyUserId) {
      req.user = {
        userId: proxyUserId,
        email: (req.headers['x-user-email'] as string) || '',
        role: (req.headers['x-user-role'] as string) || 'user',
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No authorization header provided' });
      return;
    }

    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      res.status(401).json({ success: false, error: 'Invalid authorization format. Use: Bearer <token>' });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ success: false, error: 'Token has expired' });
        return;
      }
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ success: false, error: 'Invalid token' });
        return;
      }
    }
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    // If request comes through Traefik gateway, trust X-User-* headers
    const proxyUserId = req.headers['x-user-id'] as string | undefined;
    if (proxyUserId) {
      req.user = {
        userId: proxyUserId,
        email: (req.headers['x-user-email'] as string) || '',
        role: (req.headers['x-user-role'] as string) || 'user',
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');
      
      if (bearer === 'Bearer' && token) {
        const decoded = verifyToken(token);
        req.user = decoded;
      }
    }
    
    next();
  } catch {
    // If token is invalid, continue without user
    next();
  }
}

export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}
