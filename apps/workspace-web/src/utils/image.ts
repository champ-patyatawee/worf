import imageCompression from 'browser-image-compression';

/**
 * Compression options for images
 */
export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  maxIteration?: number;
  exifOrientation?: number;
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  maxIteration: 10,
};

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    const compressedFile = await imageCompression(file, mergedOptions);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original if compression fails
  }
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validate image file
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function validateImage(file: File, maxSizeMB: number = 10): ImageValidationResult {
  // Check type
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image type: ${file.type}. Supported: JPG, PNG, GIF, WebP`,
    };
  }

  // Check size
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Image too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Create a thumbnail from a file
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  const options = {
    maxSizeMB: 0.1,
    maxWidthOrHeight: maxSize,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return URL.createObjectURL(compressedFile);
  } catch (error) {
    console.error('Thumbnail creation failed:', error);
    // Return original preview as fallback
    return URL.createObjectURL(file);
  }
}

/**
 * Check if a file is an image
 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Get the full URL for an image, prefixing with API base URL if it's a relative path
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // If it's already an absolute URL (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative URL (starts with /), prefix with API base URL
  if (url.startsWith('/')) {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    // Remove trailing slash from base URL if present
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    return `${baseUrl}${url}`;
  }
  
  // Otherwise, return as-is
  return url;
}

/**
 * Get the full URL for a chat image (handles both url and thumbnailUrl)
 */
export function getChatImageUrl(image: { url: string; thumbnailUrl?: string } | undefined | null): { url: string; thumbnailUrl: string } {
  if (!image) {
    return { url: '', thumbnailUrl: '' };
  }
  
  return {
    url: getImageUrl(image.url),
    thumbnailUrl: getImageUrl(image.thumbnailUrl) || getImageUrl(image.url),
  };
}
