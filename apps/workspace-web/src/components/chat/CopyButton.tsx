import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CopyButtonProps {
  text?: string;
  onCopy?: () => Promise<string>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'solid';
  successDuration?: number;
}

export function CopyButton({
  text,
  onCopy,
  className,
  size = 'md',
  variant = 'ghost',
  successDuration = 2000,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      let textToCopy = text;
      
      if (onCopy) {
        textToCopy = await onCopy();
      }

      if (!textToCopy) return;

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text, onCopy, successDuration]);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className={cn(
        'rounded-[var(--radius-md)] transition-all duration-200 border-2 border-transparent',
        variant === 'ghost' && 'hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]',
        variant === 'solid' && 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)]',
        sizeClasses[size],
        className
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className={cn(iconSizeClasses[size], 'text-status-success')} />
      ) : (
        <Copy className={iconSizeClasses[size]} />
      )}
    </button>
  );
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  try {
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${imageUrl}`;
    
    const response = await fetch(fullUrl);
    const blob = await response.blob();
    
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    return false;
  }
}
