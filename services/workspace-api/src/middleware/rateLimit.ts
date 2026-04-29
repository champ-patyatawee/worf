import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for image upload endpoints
 * More permissive during uploads but still protects against abuse
 */
export const imageUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 image uploads per hour per user
  message: {
    success: false,
    error: 'Image upload limit reached. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.userId || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for link preview endpoints
 * Link previews involve external HTTP requests, so we limit them
 */
export const linkPreviewRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 link previews per hour per user
  message: {
    success: false,
    error: 'Link preview limit reached. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.userId || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for presigned URL generation
 * These should be limited to prevent abuse
 */
export const presignedUrlRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 presigned URLs per hour per user
  message: {
    success: false,
    error: 'Presigned URL limit reached. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.userId || req.ip || 'unknown';
  },
});
