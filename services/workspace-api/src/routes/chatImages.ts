import { Router } from 'express';
import multer from 'multer';
import { chatImageController } from '../controllers/chatImageController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  imageUploadRateLimiter,
  presignedUrlRateLimiter,
  linkPreviewRateLimiter 
} from '../middleware/rateLimit';
import { presignedUrlSchema } from '../controllers/chatImageController';

const router = Router();

// Configure multer for memory storage (file is stored in memory as Buffer)
// Using chunks for multipart uploads to handle large files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per chunk
    files: 5, // Maximum number of chunks per upload
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

/**
 * POST /api/chat/images/upload
 * Upload image file directly
 * Rate limited to prevent abuse
 */
router.post(
  '/images/upload',
  authenticate,
  imageUploadRateLimiter,
  upload.single('file'),
  asyncHandler((req, res) => chatImageController.uploadImage(req, res))
);

/**
 * POST /api/chat/images/direct-upload
 * Handle direct upload after presigned URL
 * Rate limited to prevent abuse
 */
router.post(
  '/images/direct-upload',
  authenticate,
  imageUploadRateLimiter,
  upload.single('file'),
  asyncHandler((req, res) => chatImageController.directUpload(req, res))
);

/**
 * GET /api/chat/images/:imageId
 * Get image metadata
 */
router.get(
  '/images/:imageId',
  authenticate,
  asyncHandler((req, res) => chatImageController.getImage(req, res))
);

/**
 * GET /api/chat/images/:imageId/file
 * Get image file stream
 */
router.get(
  '/images/:imageId/file',
  authenticate,
  asyncHandler((req, res) => chatImageController.getImageFile(req, res))
);

/**
 * DELETE /api/chat/images/:imageId
 * Delete image (soft delete)
 */
router.delete(
  '/images/:imageId',
  authenticate,
  asyncHandler((req, res) => chatImageController.deleteImage(req, res))
);

/**
 * POST /api/chat/images/presigned-url
 * Generate presigned URL for client-side upload
 * Strictly rate limited due to potential storage costs
 */
router.post(
  '/images/presigned-url',
  authenticate,
  presignedUrlRateLimiter,
  validateBody(presignedUrlSchema),
  asyncHandler((req, res) => chatImageController.getPresignedUrl(req, res))
);

/**
 * POST /api/chat/images/multipart-start
 * Start a multipart upload session for large images
 * Returns an upload ID for tracking progress
 */
router.post(
  '/images/multipart-start',
  authenticate,
  imageUploadRateLimiter,
  asyncHandler((req, res) => chatImageController.startMultipartUpload(req, res))
);

/**
 * POST /api/chat/images/multipart-complete
 * Complete a multipart upload session
 * Combines all chunks into a single file
 */
router.post(
  '/images/multipart-complete',
  authenticate,
  imageUploadRateLimiter,
  asyncHandler((req, res) => chatImageController.completeMultipartUpload(req, res))
);

/**
 * GET /api/chat/images/upload-progress/:uploadId
 * Get upload progress for a multipart upload
 */
router.get(
  '/images/upload-progress/:uploadId',
  authenticate,
  asyncHandler((req, res) => chatImageController.getUploadProgress(req, res))
);

/**
 * GET /api/chat/links/preview
 * Get link preview metadata
 * Rate limited due to external HTTP requests
 */
router.get(
  '/links/preview',
  authenticate,
  linkPreviewRateLimiter,
  asyncHandler((req, res) => chatImageController.getLinkPreview(req, res))
);

/**
 * POST /api/chat/links
 * Save a link preview
 */
router.post(
  '/links',
  authenticate,
  linkPreviewRateLimiter,
  asyncHandler((req, res) => chatImageController.saveLink(req, res))
);

/**
 * DELETE /api/chat/links/:linkId
 * Delete a saved link
 */
router.delete(
  '/links/:linkId',
  authenticate,
  asyncHandler((req, res) => chatImageController.deleteLink(req, res))
);

export default router;
