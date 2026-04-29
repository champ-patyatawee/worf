import { Response } from 'express';
import { z } from 'zod';
import { imageService } from '../services/imageService';
import { linkService } from '../services/linkService';
import { AuthenticatedRequest } from '../types';
import { formatResponse, formatError } from '../utils';
import { ValidationError } from '../middleware/errorHandler';

// Validation schemas
export const uploadImageSchema = z.object({
  messageId: z.string().optional(),
});

export const getImageSchema = z.object({
  imageId: z.string().min(1, 'Image ID is required'),
});

export const deleteImageSchema = z.object({
  imageId: z.string().min(1, 'Image ID is required'),
});

export const presignedUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().optional(),
});

export const linkPreviewSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

export const multipartStartSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().min(1, 'File size is required'),
  totalChunks: z.number().min(1).max(100, 'Total chunks must be between 1 and 100'),
});

export const multipartCompleteSchema = z.object({
  uploadId: z.string().min(1, 'Upload ID is required'),
  messageId: z.string().optional(),
});

export const uploadProgressSchema = z.object({
  uploadId: z.string().min(1, 'Upload ID is required'),
});

export class ChatImageController {
  /**
   * POST /api/chat/images/upload
   * Upload image file directly
   */
  async uploadImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      // Handle multipart form data
      const file = req.file;
      if (!file) {
        res.status(400).json(formatError('No image file provided'));
        return;
      }

      // Validate image
      const validation = await imageService.validateImage(file.buffer, file.originalname);
      if (!validation.isValid) {
        res.status(400).json(formatError(validation.error || 'Invalid image'));
        return;
      }

      // Get messageId from body if provided
      const messageId = req.body.messageId;

      // Upload image
      const result = await imageService.uploadImage(
        file.buffer,
        req.user.userId,
        messageId
      );

      // Extract metadata in background (don't wait)
      imageService.extractMetadata(result.id).catch(err => {
        console.error('Failed to extract metadata:', err);
      });

      res.status(201).json(formatResponse(result));
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json(formatError('Failed to upload image'));
    }
  }

  /**
   * GET /api/chat/images/:imageId
   * Get image metadata
   */
  async getImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { imageId } = req.params;
      const result = await imageService.getImage(imageId);
      res.json(formatResponse(result.image));
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json(formatError('Image not found'));
        return;
      }
      console.error('Get image error:', error);
      res.status(500).json(formatError('Failed to get image'));
    }
  }

  /**
   * GET /api/chat/images/:imageId/file
   * Get image file stream
   */
  async getImageFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { imageId } = req.params;
      const { image, filePath } = await imageService.getImage(imageId);
      
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      res.sendFile(filePath);
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json(formatError('Image not found'));
        return;
      }
      console.error('Get image file error:', error);
      res.status(500).json(formatError('Failed to get image'));
    }
  }

  /**
   * DELETE /api/chat/images/:imageId
   * Delete image (soft delete)
   */
  async deleteImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { imageId } = req.params;
      await imageService.deleteImage(imageId, req.user.userId);
      res.json(formatResponse({ message: 'Image deleted successfully' }));
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json(formatError('Image not found'));
        return;
      }
      if (error.statusCode === 403) {
        res.status(403).json(formatError('You can only delete your own images'));
        return;
      }
      console.error('Delete image error:', error);
      res.status(500).json(formatError('Failed to delete image'));
    }
  }

  /**
   * POST /api/chat/images/presigned-url
   * Generate presigned URL for client-side upload
   */
  async getPresignedUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { filename, contentType, fileSize } = req.body;

      // Validate file size if provided
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        res.status(400).json(formatError('File too large (max 10MB)'));
        return;
      }

      const result = await imageService.getPresignedUrl(filename, contentType);
      res.json(formatResponse(result));
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json(formatError(error.message));
        return;
      }
      console.error('Presigned URL error:', error);
      res.status(500).json(formatError('Failed to generate presigned URL'));
    }
  }

  /**
   * POST /api/chat/images/direct-upload
   * Handle direct upload after presigned URL
   */
  async directUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const file = req.file;
      if (!file) {
        res.status(400).json(formatError('No image file provided'));
        return;
      }

      const messageId = req.body.messageId;
      const result = await imageService.uploadImage(
        file.buffer,
        req.user.userId,
        messageId
      );

      res.status(201).json(formatResponse(result));
    } catch (error) {
      console.error('Direct upload error:', error);
      res.status(500).json(formatError('Failed to upload image'));
    }
  }

  /**
   * GET /api/chat/links/preview
   * Get link preview metadata
   */
  async getLinkPreview(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        res.status(400).json(formatError('URL is required'));
        return;
      }

      const result = await linkService.getLinkPreview(req.user.userId, url);
      res.json(formatResponse(result));
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json(formatError(error.message));
        return;
      }
      if (error.statusCode === 502) {
        res.status(502).json(formatError('Failed to fetch URL'));
        return;
      }
      console.error('Link preview error:', error);
      res.status(500).json(formatError('Failed to get link preview'));
    }
  }

  /**
   * POST /api/chat/links
   * Save a link preview
   */
  async saveLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { url, messageId } = req.body;
      if (!url) {
        res.status(400).json(formatError('URL is required'));
        return;
      }

      const result = await linkService.saveLinkPreview(req.user.userId, url, messageId);
      res.status(201).json(formatResponse(result));
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json(formatError(error.message));
        return;
      }
      console.error('Save link error:', error);
      res.status(500).json(formatError('Failed to save link'));
    }
  }

  /**
   * DELETE /api/chat/links/:linkId
   * Delete a saved link
   */
  async deleteLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { linkId } = req.params;
      await linkService.deleteLink(linkId, req.user.userId);
      res.json(formatResponse({ message: 'Link deleted successfully' }));
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json(formatError('Link not found'));
        return;
      }
      if (error.statusCode === 403) {
        res.status(403).json(formatError('You can only delete your own links'));
        return;
      }
      console.error('Delete link error:', error);
      res.status(500).json(formatError('Failed to delete link'));
    }
  }

  /**
   * POST /api/chat/images/multipart-start
   * Start a multipart upload session for large images
   */
  async startMultipartUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { filename, contentType, fileSize, totalChunks } = req.body;

      // Validate content type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(contentType)) {
        res.status(400).json(formatError('Invalid content type'));
        return;
      }

      // Validate file size
      const maxSize = 50 * 1024 * 1024; // 50MB for multipart
      if (fileSize > maxSize) {
        res.status(400).json(formatError(`File too large. Maximum size for multipart upload: ${maxSize / 1024 / 1024}MB`));
        return;
      }

      const result = await imageService.startMultipartUpload(
        filename,
        contentType,
        fileSize,
        totalChunks,
        req.user.userId
      );

      res.status(201).json(formatResponse(result));
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(400).json(formatError(error.message));
        return;
      }
      console.error('Multipart start error:', error);
      res.status(500).json(formatError('Failed to start multipart upload'));
    }
  }

  /**
   * POST /api/chat/images/multipart-complete
   * Complete a multipart upload session
   */
  async completeMultipartUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { uploadId, messageId } = req.body;

      if (!uploadId) {
        res.status(400).json(formatError('Upload ID is required'));
        return;
      }

      const result = await imageService.completeMultipartUpload(
        uploadId,
        req.user.userId,
        messageId
      );

      // Extract metadata in background
      if (result.id) {
        imageService.extractMetadata(result.id).catch(err => {
          console.error('Failed to extract metadata:', err);
        });
      }

      res.status(201).json(formatResponse(result));
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json(formatError(error.message));
        return;
      }
      if (error.statusCode === 404) {
        res.status(404).json(formatError('Upload not found or expired'));
        return;
      }
      if (error.statusCode === 403) {
        res.status(403).json(formatError('Not authorized to complete this upload'));
        return;
      }
      console.error('Multipart complete error:', error);
      res.status(500).json(formatError('Failed to complete multipart upload'));
    }
  }

  /**
   * GET /api/chat/images/upload-progress/:uploadId
   * Get upload progress for a multipart upload
   */
  async getUploadProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json(formatError('Unauthorized'));
      return;
    }

    try {
      const { uploadId } = req.params;
      const progress = await imageService.getUploadProgress(uploadId, req.user.userId);
      res.json(formatResponse(progress));
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json(formatError('Upload not found or expired'));
        return;
      }
      console.error('Get upload progress error:', error);
      res.status(500).json(formatError('Failed to get upload progress'));
    }
  }
}

export const chatImageController = new ChatImageController();
