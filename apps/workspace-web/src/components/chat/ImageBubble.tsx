import { useState, useCallback, memo } from 'react';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getImageUrl } from '@/utils/image';
import type { ChatImage } from '@/types';

interface ImageBubbleProps {
  image: ChatImage;
  onClick?: () => void;
  onCopy?: () => void;
  className?: string;
}

export const ImageBubble = memo(function ImageBubble({
  image,
  onClick,
  onCopy,
  className,
}: ImageBubbleProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCopy?.();
    },
    [onCopy]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    },
    [onClick]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displayUrl = getImageUrl(image.thumbnailUrl) || getImageUrl(image.url);

  if (hasError) {
    return (
      <div
        className={cn(
          'relative rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border-2 border-[var(--color-border-primary)] p-4 flex items-center justify-center shadow-[2px_2px_0px_#0D0D0D]',
          className
        )}
      >
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-status-error/10 flex items-center justify-center mx-auto mb-2 border-2 border-[var(--color-border-primary)]">
            <ExternalLink className="w-5 h-5 text-status-error" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Failed to load image</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{image.name || 'Image'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative group rounded-[var(--radius-lg)] overflow-hidden cursor-pointer border-2 border-[var(--color-border-primary)] shadow-[2px_2px_0px_#0D0D0D]',
        'transition-shadow hover:shadow-[4px_4px_0px_#0D0D0D]',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-tertiary)]">
          <Loader2 className="w-6 h-6 text-[var(--color-text-tertiary)] animate-spin" />
        </div>
      )}

      <img
        src={displayUrl}
        alt={image.name || 'Shared image'}
        className={cn(
          'max-w-full max-h-80 object-contain bg-[var(--color-bg-secondary)]',
          isLoading && 'invisible'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {showActions && !isLoading && (
        <div className="absolute top-2 right-2 flex gap-1 animate-fadeIn">
          {onCopy && (
            <button
              onClick={handleCopy}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded-[var(--radius-md)] transition-colors-fast"
              title="Copy image"
            >
              <Copy className="w-4 h-4 text-white" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(getImageUrl(image.url), '_blank');
            }}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-[var(--radius-md)] transition-colors-fast"
            title="Open full size"
          >
            <ExternalLink className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {image.fileSize > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-xs text-white/90 font-medium">
            {image.name && <span className="truncate">{image.name}</span>}
            {image.name && ' • '}
            <span>{formatFileSize(image.fileSize)}</span>
            {image.width && image.height && (
              <span> • {image.width}×{image.height}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
});
