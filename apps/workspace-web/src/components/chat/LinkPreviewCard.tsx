import { memo, useState, useCallback } from 'react';
import { ExternalLink, Link2, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { LinkPreview as LinkPreviewType } from '@/types';

interface LinkPreviewCardProps {
  link: LinkPreviewType;
  onClick?: () => void;
  className?: string;
}

export const LinkPreviewCard = memo(function LinkPreviewCard({
  link,
  onClick,
  className,
}: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setImageError(true);
  }, []);

  const faviconUrl = link.favicon || `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=32`;

  const hostname = (() => {
    try {
      return new URL(link.url).hostname;
    } catch {
      return link.url;
    }
  })();

  return (
    <div
      className={cn(
        'group relative rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-[2px_2px_0px_#0D0D0D]',
        'hover:border-[var(--color-accent-primary)] hover:shadow-[4px_4px_0px_#0D0D0D] transition-all cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        {link.imageUrl && !imageError && (
          <div className="relative h-40 bg-[var(--color-bg-tertiary)] overflow-hidden border-b-2 border-[var(--color-border-primary)]">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-tertiary)]">
                <Loader2 className="w-5 h-5 text-[var(--color-text-tertiary)] animate-spin" />
              </div>
            )}
            <img
              src={link.imageUrl}
              alt=""
              className={cn(
                'w-full h-full object-cover transition-opacity',
                isLoading && 'opacity-0'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}

        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <img
              src={faviconUrl}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-[var(--color-text-tertiary)] truncate font-medium">{hostname}</span>
          </div>

          {link.title && (
            <h4 className="font-bold text-sm text-[var(--color-text-primary)] truncate mb-1 group-hover:text-[var(--color-accent-primary)] transition-colors-fast">
              {link.title}
            </h4>
          )}

          {link.description && (
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">
              {link.description}
            </p>
          )}

          <p className="text-xs text-[var(--color-text-tertiary)] truncate flex items-center gap-1 font-mono">
            <Link2 className="w-3 h-3 flex-shrink-0" />
            {link.url}
          </p>
        </div>
      </a>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 bg-[var(--color-bg-secondary)]/90 rounded-[var(--radius-md)] border border-[var(--color-border-primary)]">
          <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
        </div>
      </div>
    </div>
  );
});

export function LinkPreviewCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] overflow-hidden animate-pulse shadow-[2px_2px_0px_#0D0D0D]',
        className
      )}
    >
      <div className="h-40 bg-[var(--color-bg-hover)] border-b-2 border-[var(--color-border-primary)]" />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-[var(--color-bg-hover)] rounded" />
          <div className="h-3 w-24 bg-[var(--color-bg-hover)] rounded" />
        </div>
        <div className="h-4 w-3/4 bg-[var(--color-bg-hover)] rounded mb-2" />
        <div className="h-3 w-full bg-[var(--color-bg-hover)] rounded mb-1" />
        <div className="h-3 w-2/3 bg-[var(--color-bg-hover)] rounded" />
      </div>
    </div>
  );
}
