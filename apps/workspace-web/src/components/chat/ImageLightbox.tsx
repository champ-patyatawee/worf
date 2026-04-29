import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Copy } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getImageUrl } from '@/utils/image';
import type { ChatImage } from '@/types';

interface ImageLightboxProps {
  images: ChatImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onCopy?: (image: ChatImage) => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onCopy,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  const currentImage = images[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsLoading(true);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsLoading(true);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsLoading(true);
  }, [images.length]);

  const handleDownload = useCallback(() => {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.href = getImageUrl(currentImage.url);
    link.download = currentImage.name || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage]);

  const handleCopy = useCallback(() => {
    if (onCopy && currentImage) {
      onCopy(currentImage);
    }
  }, [currentImage, onCopy]);

  if (!isOpen || !currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-mono font-bold">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      <div
        className={cn(
          'relative max-w-full max-h-full p-4',
          isLoading && 'animate-pulse'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          key={currentImage.id}
          src={getImageUrl(currentImage.url)}
          alt={currentImage.name || 'Full size image'}
          className={cn(
            'max-w-[90vw] max-h-[85vh] object-contain rounded-[var(--radius-lg)] border-2 border-white/20',
            isLoading && 'invisible'
          )}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
        {onCopy && (
          <button
            onClick={handleCopy}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Copy image"
          >
            <Copy className="w-5 h-5 text-white" />
          </button>
        )}
        <button
          onClick={handleDownload}
          className="p-2 rounded-full hover:bg-white/20 transition-colors"
          title="Download image"
        >
          <Download className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
