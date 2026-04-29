import { prisma } from '../config/database';
import { AppError, ValidationError } from '../middleware/errorHandler';
import { generateId } from '../utils';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSIONS = 4096;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;

export interface ImageUploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
}

export interface MultipartUploadSession {
  uploadId: string;
  imageId: string;
  filename: string;
  contentType: string;
  totalChunks: number;
  uploadedChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'failed';
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface UploadProgress {
  uploadId: string;
  totalChunks: number;
  uploadedChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'failed';
}

// In-memory store for multipart upload sessions (in production, use Redis)
const multipartUploads = new Map<string, MultipartUploadSession>();
const chunkDataStore = new Map<string, Map<number, Buffer>>();

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [uploadId, session] of multipartUploads.entries()) {
    if (session.expiresAt < now) {
      multipartUploads.delete(uploadId);
      chunkDataStore.delete(uploadId);
    }
  }
}, 10 * 60 * 1000);

export class ImageService {
  private storagePath: string;
  private thumbnailPath: string;
  private cdnUrl: string;

  constructor() {
    this.storagePath = path.join(process.cwd(), 'uploads', 'images');
    this.thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails');
    this.cdnUrl = process.env.CDN_URL || '';
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
    if (!fs.existsSync(this.thumbnailPath)) {
      fs.mkdirSync(this.thumbnailPath, { recursive: true });
    }
  }

  async validateImage(buffer: Buffer, filename: string): Promise<ImageValidationResult> {
    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { isValid: false, error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    // Check MIME type
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.format || !ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
        return { isValid: false, error: `Invalid image format. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` };
      }

      // Check file size
      if (buffer.length > MAX_FILE_SIZE) {
        return { isValid: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
      }

      // Check dimensions
      if (metadata.width && metadata.width > MAX_DIMENSIONS) {
        return { isValid: false, error: `Image too large. Maximum dimension: ${MAX_DIMENSIONS}px` };
      }

      if (metadata.height && metadata.height > MAX_DIMENSIONS) {
        return { isValid: false, error: `Image too large. Maximum dimension: ${MAX_DIMENSIONS}px` };
      }

      return { isValid: true, mimeType: `image/${metadata.format}` };
    } catch (error) {
      return { isValid: false, error: 'Unable to process image' };
    }
  }

  async compressAndResize(buffer: Buffer): Promise<{ compressed: Buffer; thumbnail: Buffer; width: number; height: number }> {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Compress main image if needed
    let compressed = buffer;
    if (width > 1920 || height > 1920) {
      compressed = await sharp(buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } else {
      compressed = await sharp(buffer)
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Get final dimensions
    const finalMeta = await sharp(compressed).metadata();

    return {
      compressed,
      thumbnail,
      width: finalMeta.width || width,
      height: finalMeta.height || height,
    };
  }

  async uploadImage(buffer: Buffer, userId: string, messageId?: string): Promise<ImageUploadResult> {
    // Generate unique filename
    const imageId = generateId();
    const filename = `${imageId}.jpg`;
    const thumbnailFilename = `${imageId}_thumb.jpg`;

    // Compress and resize
    const { compressed, thumbnail, width, height } = await this.compressAndResize(buffer);

    // Save files
    const filepath = path.join(this.storagePath, filename);
    const thumbnailFilepath = path.join(this.thumbnailPath, thumbnailFilename);

    await Promise.all([
      fs.promises.writeFile(filepath, compressed),
      fs.promises.writeFile(thumbnailFilepath, thumbnail),
    ]);

    // Build URLs
    const url = this.cdnUrl 
      ? `${this.cdnUrl}/images/${filename}`
      : `/uploads/images/${filename}`;
    const thumbnailUrl = this.cdnUrl
      ? `${this.cdnUrl}/thumbnails/${thumbnailFilename}`
      : `/uploads/thumbnails/${thumbnailFilename}`;

    // Save to database
    const image = await prisma.chatImage.create({
      data: {
        id: imageId,
        messageId,
        userId,
        url,
        thumbnailUrl,
        width,
        height,
        fileSize: compressed.length,
        mimeType: 'image/jpeg',
      },
    });

    return {
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl!,
      width: image.width!,
      height: image.height!,
      fileSize: image.fileSize,
      mimeType: image.mimeType,
    };
  }

  async getImage(imageId: string): Promise<{ image: any; filePath: string }> {
    const image = await prisma.chatImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.deletedAt) {
      throw new AppError(404, 'Image not found');
    }

    // Get file path from URL
    const filename = path.basename(image.url);
    const filePath = path.join(this.storagePath, filename);

    return { image, filePath };
  }

  async deleteImage(imageId: string, userId: string): Promise<void> {
    const image = await prisma.chatImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new AppError(404, 'Image not found');
    }

    if (image.userId !== userId) {
      throw new AppError(403, 'You can only delete your own images');
    }

    // Soft delete
    await prisma.chatImage.update({
      where: { id: imageId },
      data: { deletedAt: new Date() },
    });
  }

  async getPresignedUrl(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    // Validate content type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new ValidationError(`Invalid content type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    const imageId = generateId();
    const key = `uploads/images/${imageId}_${filename}`;
    const publicUrl = this.cdnUrl 
      ? `${this.cdnUrl}/${key}`
      : `/api/chat/images/file/${imageId}_${filename}`;

    // In a real implementation, this would generate an S3 or GCS presigned URL
    // For now, we'll return a mock presigned URL structure
    const uploadUrl = `/api/chat/images/direct-upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`;

    return { uploadUrl, publicUrl };
  }

  async cleanupOrphanedImages(): Promise<number> {
    // Find images older than 24 hours that are not attached to any message
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orphanedImages = await prisma.chatImage.findMany({
      where: {
        messageId: null,
        createdAt: { lt: cutoffDate },
        deletedAt: null,
      },
    });

    // Delete files
    for (const image of orphanedImages) {
      try {
        const filename = path.basename(image.url);
        const filepath = path.join(this.storagePath, filename);
        const thumbnailFilename = path.basename(image.thumbnailUrl || '');
        const thumbnailFilepath = path.join(this.thumbnailPath, thumbnailFilename);

        await Promise.all([
          fs.promises.unlink(filepath).catch(() => {}),
          fs.promises.unlink(thumbnailFilepath).catch(() => {}),
        ]);

        await prisma.chatImage.update({
          where: { id: image.id },
          data: { deletedAt: new Date() },
        });
      } catch (error) {
        console.error(`Failed to cleanup image ${image.id}:`, error);
      }
    }

    return orphanedImages.length;
  }

  async extractMetadata(imageId: string): Promise<void> {
    const image = await prisma.chatImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new AppError(404, 'Image not found');
    }

    const filename = path.basename(image.url);
    const filePath = path.join(this.storagePath, filename);

    try {
      const buffer = await fs.promises.readFile(filePath);
      const metadata = await sharp(buffer).metadata();

      // Cast exif data to any since sharp's type definitions are incomplete
      const exif = metadata.exif as Record<string, any> | undefined;

      await prisma.imageMetadata.upsert({
        where: { imageId },
        create: {
          imageId,
          cameraMake: exif?.Image?.Make,
          cameraModel: exif?.Image?.Model,
          dateTaken: exif?.Photo?.DateTimeOriginal ? new Date(exif.Photo.DateTimeOriginal) : undefined,
          locationLat: exif?.GPS?.Latitude,
          locationLng: exif?.GPS?.Longitude,
          orientation: exif?.Image?.Orientation,
          exifData: metadata.exif as any || undefined,
        },
        update: {
          cameraMake: exif?.Image?.Make,
          cameraModel: exif?.Image?.Model,
          dateTaken: exif?.Photo?.DateTimeOriginal ? new Date(exif.Photo.DateTimeOriginal) : undefined,
          locationLat: exif?.GPS?.Latitude,
          locationLng: exif?.GPS?.Longitude,
          orientation: exif?.Image?.Orientation,
          exifData: metadata.exif as any || undefined,
        },
      });
    } catch (error) {
      console.error(`Failed to extract metadata for image ${imageId}:`, error);
    }
  }

  /**
   * Start a multipart upload session
   */
  async startMultipartUpload(
    filename: string,
    contentType: string,
    fileSize: number,
    totalChunks: number,
    userId: string
  ): Promise<{ uploadId: string; imageId: string; chunkSize: number }> {
    // Validate content type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new ValidationError(`Invalid content type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValidationError(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    const uploadId = generateId();
    const imageId = generateId();
    const chunkSize = Math.ceil(fileSize / totalChunks);

    // Create session
    const session: MultipartUploadSession = {
      uploadId,
      imageId,
      filename,
      contentType,
      totalChunks,
      uploadedChunks: 0,
      uploadedBytes: 0,
      totalBytes: fileSize,
      status: 'pending',
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiration
    };

    multipartUploads.set(uploadId, session);
    chunkDataStore.set(uploadId, new Map());

    return { uploadId, imageId, chunkSize };
  }

  /**
   * Upload a chunk for a multipart upload
   * Note: This is called internally when processing the complete upload
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer
  ): Promise<void> {
    const session = multipartUploads.get(uploadId);
    if (!session) {
      throw new AppError(404, 'Upload session not found or expired');
    }

    const chunks = chunkDataStore.get(uploadId);
    if (!chunks) {
      throw new AppError(404, 'Upload session not found');
    }

    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new ValidationError('Invalid chunk index');
    }

    // Store the chunk
    chunks.set(chunkIndex, chunkData);
    session.uploadedChunks++;
    session.uploadedBytes += chunkData.length;
    session.status = 'uploading';

    multipartUploads.set(uploadId, session);
  }

  /**
   * Complete a multipart upload session
   */
  async completeMultipartUpload(
    uploadId: string,
    userId: string,
    messageId?: string
  ): Promise<ImageUploadResult> {
    const session = multipartUploads.get(uploadId);
    if (!session) {
      throw new AppError(404, 'Upload session not found or expired');
    }

    if (session.userId !== userId) {
      throw new AppError(403, 'Not authorized to complete this upload');
    }

    if (session.status === 'complete') {
      throw new AppError(400, 'Upload already completed');
    }

    const chunks = chunkDataStore.get(uploadId);
    if (!chunks) {
      throw new AppError(404, 'Upload chunks not found');
    }

    // Verify all chunks are present
    if (chunks.size !== session.totalChunks) {
      throw new AppError(400, `Missing chunks. Expected ${session.totalChunks}, got ${chunks.size}`);
    }

    session.status = 'processing';
    multipartUploads.set(uploadId, session);

    try {
      // Combine chunks in order
      const sortedChunks: Buffer[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        const chunk = chunks.get(i);
        if (!chunk) {
          throw new AppError(400, `Missing chunk at index ${i}`);
        }
        sortedChunks.push(chunk);
      }
      const combinedBuffer = Buffer.concat(sortedChunks);

      // Validate the combined image
      const validation = await this.validateImage(combinedBuffer, session.filename);
      if (!validation.isValid) {
        throw new ValidationError(validation.error || 'Invalid image');
      }

      // Compress and resize
      const { compressed, thumbnail, width, height } = await this.compressAndResize(combinedBuffer);

      // Save files
      const finalFilename = `${session.imageId}.jpg`;
      const thumbnailFilename = `${session.imageId}_thumb.jpg`;
      const filepath = path.join(this.storagePath, finalFilename);
      const thumbnailFilepath = path.join(this.thumbnailPath, thumbnailFilename);

      await Promise.all([
        fs.promises.writeFile(filepath, compressed),
        fs.promises.writeFile(thumbnailFilepath, thumbnail),
      ]);

      // Build URLs
      const url = this.cdnUrl
        ? `${this.cdnUrl}/images/${finalFilename}`
        : `/uploads/images/${finalFilename}`;
      const thumbnailUrl = this.cdnUrl
        ? `${this.cdnUrl}/thumbnails/${thumbnailFilename}`
        : `/uploads/thumbnails/${thumbnailFilename}`;

      // Save to database
      const image = await prisma.chatImage.create({
        data: {
          id: session.imageId,
          messageId,
          userId: session.userId,
          url,
          thumbnailUrl,
          width,
          height,
          fileSize: compressed.length,
          mimeType: 'image/jpeg',
        },
      });

      session.status = 'complete';
      multipartUploads.set(uploadId, session);

      // Cleanup
      setTimeout(() => {
        multipartUploads.delete(uploadId);
        chunkDataStore.delete(uploadId);
      }, 5000); // Clean up after 5 seconds

      return {
        id: image.id,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl!,
        width: image.width!,
        height: image.height!,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
      };
    } catch (error) {
      session.status = 'failed';
      multipartUploads.set(uploadId, session);
      throw error;
    }
  }

  /**
   * Get upload progress for a multipart upload
   */
  async getUploadProgress(uploadId: string, userId: string): Promise<UploadProgress> {
    const session = multipartUploads.get(uploadId);
    if (!session) {
      throw new AppError(404, 'Upload session not found or expired');
    }

    if (session.userId !== userId) {
      throw new AppError(403, 'Not authorized to view this upload');
    }

    const percentage = session.totalBytes > 0
      ? Math.round((session.uploadedBytes / session.totalBytes) * 100)
      : 0;

    return {
      uploadId: session.uploadId,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks,
      uploadedBytes: session.uploadedBytes,
      totalBytes: session.totalBytes,
      percentage,
      status: session.status,
    };
  }
}

export const imageService = new ImageService();
