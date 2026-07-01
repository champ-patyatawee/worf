import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface LocalImageProps {
  filename: string;
  alt: string;
}

export function LocalImage({ filename, alt }: LocalImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Use Rust command to read image file (consistent path resolution)
        const data = await invoke<number[]>("get_note_image", { filename });
        
        const bytes = new Uint8Array(data);

        // Detect MIME type from extension
        const mimeType = filename.endsWith('.png') ? 'image/png' :
          filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
          filename.endsWith('.gif') ? 'image/gif' :
          filename.endsWith('.svg') ? 'image/svg+xml' :
          filename.endsWith('.webp') ? 'image/webp' : 'image/png';

        const blob = new Blob([bytes], { type: mimeType });
        
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setBlobUrl(url);
        }
      } catch (e) {
        console.error("[LocalImage] FAILED to load image:", e);
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [filename]);

  if (!blobUrl) {
    return (
      <div className="animate-pulse h-24 bg-gray-200 rounded" />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className="max-w-full h-auto rounded border"
    />
  );
}
