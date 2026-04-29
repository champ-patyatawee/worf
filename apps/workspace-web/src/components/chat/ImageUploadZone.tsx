import { useCallback, useState } from 'react';
import { Image, Upload, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onUploadCancel?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 5;

export function ImageUploadZone({
  onFilesSelected,
  onUploadCancel,
  isUploading = false,
  uploadProgress = 0,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className,
  disabled = false,
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!acceptedTypes.includes(file.type)) {
          errors.push(`"${file.name}" is not a supported image type`);
          continue;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          errors.push(`"${file.name}" exceeds the ${maxSizeMB}MB size limit`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} images allowed at once`);
        valid.splice(maxFiles);
      }

      return { valid, errors: errors.filter((e) => e) };
    },
    [acceptedTypes, maxSizeMB, maxFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );

      const { valid, errors } = validateFiles(files);
      if (errors.length > 0) {
        setError(errors[0]);
      }
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [disabled, isUploading, validateFiles, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      if (!e.target.files || disabled || isUploading) return;

      const files = Array.from(e.target.files);
      const { valid, errors } = validateFiles(files);
      if (errors.length > 0) {
        setError(errors[0]);
      }
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
      e.target.value = '';
    },
    [disabled, isUploading, validateFiles, onFilesSelected]
  );

  return (
    <div
      className={cn(
        'relative rounded-[var(--radius-lg)] border-2 border-dashed transition-all',
        isDragging
          ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]'
          : 'border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-text-secondary)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <div className="flex flex-col items-center justify-center p-6">
          <div className="relative w-16 h-16 mb-3">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-[var(--color-border-secondary)]"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${uploadProgress * 1.76} 176`}
                className="text-[var(--color-accent-primary)] transition-all duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--color-text-primary)] font-mono">
              {uploadProgress}%
            </span>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Uploading image...</p>
          {onUploadCancel && (
            <button
              type="button"
              onClick={onUploadCancel}
              className="text-sm text-status-error hover:text-status-error/80 flex items-center gap-1 font-medium"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      ) : (
        <label className={cn('flex flex-col items-center justify-center p-6 cursor-pointer', disabled && 'cursor-not-allowed')}>
          <input
            type="file"
            accept={acceptedTypes.join(',')}
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          <div className="w-12 h-12 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center mb-3 border-2 border-[var(--color-border-primary)]">
            {isDragging ? (
              <Upload className="w-6 h-6 text-[var(--color-accent-primary)]" />
            ) : (
              <Image className="w-6 h-6 text-[var(--color-accent-primary)]" />
            )}
          </div>
          <p className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
            {isDragging ? 'Drop images here' : 'Click or drag to upload'}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] font-medium">
            JPG, PNG, GIF, WebP up to {maxSizeMB}MB
          </p>
          {error && (
            <p className="mt-2 text-sm text-status-error font-medium">{error}</p>
          )}
        </label>
      )}
    </div>
  );
}
