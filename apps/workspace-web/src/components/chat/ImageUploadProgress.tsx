import { memo } from 'react';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ImageUpload } from '@/types';

interface ImageUploadProgressProps {
  upload: ImageUpload;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const ImageUploadProgress = memo(function ImageUploadProgress({
  upload,
  onCancel,
  onRetry,
  className,
}: ImageUploadProgressProps) {
  const getStatusIcon = () => {
    switch (upload.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-[var(--color-accent-primary)] animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-status-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-status-error" />;
      default:
        return <Loader2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />;
    }
  };

  const getStatusText = () => {
    switch (upload.status) {
      case 'uploading':
        return `Uploading... ${upload.progress}%`;
      case 'completed':
        return 'Upload complete';
      case 'error':
        return upload.error || 'Upload failed';
      default:
        return 'Pending...';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)] shadow-[2px_2px_0px_#0D0D0D]',
        className
      )}
    >
      <div className="relative w-12 h-12 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-tertiary)] flex-shrink-0 border-2 border-[var(--color-border-primary)]">
        <img
          src={upload.preview}
          alt={upload.file.name}
          className="w-full h-full object-cover"
        />
        {upload.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--color-text-secondary)] truncate">
          {upload.file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {getStatusIcon()}
          <span
            className={cn(
              'text-xs font-medium',
              upload.status === 'error' && 'text-status-error',
              upload.status === 'completed' && 'text-status-success',
              upload.status === 'uploading' && 'text-[var(--color-accent-primary)]'
            )}
          >
            {getStatusText()}
          </span>
        </div>

        {upload.status === 'uploading' && (
          <div className="mt-1.5 h-1.5 bg-[var(--color-border-secondary)] rounded-full overflow-hidden border border-[var(--color-border-primary)]">
            <div
              className="h-full bg-[var(--color-accent-primary)] transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {upload.status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] transition-colors border-2 border-transparent hover:border-[var(--color-border-primary)]"
            title="Retry upload"
          >
            <Loader2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}
        {(upload.status === 'uploading' || upload.status === 'pending') && onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] transition-colors border-2 border-transparent hover:border-[var(--color-border-primary)]"
            title="Cancel upload"
          >
            <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}
      </div>
    </div>
  );
});

interface ImageUploadProgressListProps {
  uploads: ImageUpload[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  className?: string;
}

export function ImageUploadProgressList({
  uploads,
  onCancel,
  onRetry,
  className,
}: ImageUploadProgressListProps) {
  if (uploads.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {uploads.map((upload) => (
        <ImageUploadProgress
          key={upload.id}
          upload={upload}
          onCancel={onCancel ? () => onCancel(upload.id) : undefined}
          onRetry={onRetry ? () => onRetry(upload.id) : undefined}
        />
      ))}
    </div>
  );
}
