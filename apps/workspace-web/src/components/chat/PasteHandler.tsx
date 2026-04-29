import { useEffect, useCallback, useRef } from 'react';

interface PasteHandlerProps {
  onPaste: (files: File[]) => void;
  enabled?: boolean;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
}

// Default configuration
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 5;

export function PasteHandler({
  onPaste,
  enabled = true,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  maxFiles = DEFAULT_MAX_FILES,
}: PasteHandlerProps) {
  const onPasteRef = useRef(onPaste);

  // Keep ref updated
  useEffect(() => {
    onPasteRef.current = onPaste;
  }, [onPaste]);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled) return;

      // Get clipboard items
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            // Validate type
            if (!acceptedTypes.includes(file.type)) {
              console.warn(`Unsupported image type: ${file.type}`);
              continue;
            }

            // Validate size
            if (file.size > maxSizeMB * 1024 * 1024) {
              console.warn(`Image too large: ${file.name} (${file.size} bytes)`);
              continue;
            }

            files.push(file);
          }
        }
      }

      if (files.length > maxFiles) {
        console.warn(`Too many files. Max: ${maxFiles}`);
        files.splice(maxFiles);
      }

      if (files.length > 0) {
        e.preventDefault();
        onPasteRef.current(files);
      }
    },
    [enabled, acceptedTypes, maxSizeMB, maxFiles]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, handlePaste]);

  // Returns null as this is a non-visual component
  return null;
}

// Hook version for more flexibility
export function usePasteHandler({
  onPaste,
  enabled = true,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  maxFiles = DEFAULT_MAX_FILES,
}: PasteHandlerProps) {
  const onPasteRef = useRef(onPaste);

  useEffect(() => {
    onPasteRef.current = onPaste;
  }, [onPaste]);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            if (!acceptedTypes.includes(file.type)) continue;
            if (file.size > maxSizeMB * 1024 * 1024) continue;
            files.push(file);
          }
        }
      }

      if (files.length > maxFiles) {
        files.splice(maxFiles);
      }

      if (files.length > 0) {
        e.preventDefault();
        onPasteRef.current(files);
      }
    },
    [enabled, acceptedTypes, maxSizeMB, maxFiles]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, handlePaste]);
}
