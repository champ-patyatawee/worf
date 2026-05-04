// src/components/agents/ToolResultCard.tsx
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ExternalLink, Clock, FileText, Globe } from 'lucide-react';

const toolIconMap: Record<string, ReactNode> = {
  webfetch: <Globe className="h-4 w-4" />,
};

const toolDisplayNames: Record<string, string> = {
  webfetch: 'Web Fetch',
};

interface ToolResultCardProps {
  toolName: string;
  icon?: ReactNode;
  content: string;
  data?: Record<string, unknown>;
  className?: string;
  onClose?: () => void;
}

export function ToolResultCard({
  toolName,
  icon,
  content,
  data,
  className,
  onClose,
}: ToolResultCardProps) {
  const displayName = toolDisplayNames[toolName] || toolName;

  // Extract first line as title if it's markdown heading
  const firstLine: string = content.split('\n')[0] || '';
  const title: string = firstLine.replace(/^##\s+/, '').trim();
  const bodyText: string = content.split('\n').slice(1).join('\n').trim();

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] overflow-hidden shadow-[var(--shadow-card)] bg-bg-primary',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-bg-secondary)] border-b-2 border-[var(--color-border-secondary)]">
        <span className="text-[var(--color-accent-primary)]">
          {icon || toolIconMap[toolName] || <Globe className="h-4 w-4" />}
        </span>
        <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
          {displayName}
        </span>
        {data?.timing != null && (
          <span className="text-xs text-text-tertiary flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Number(data.timing)}ms
          </span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors-fast"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[var(--color-text-secondary)]">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {/* Title */}
        {title ? (
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            <a
              href={data?.url ? String(data.url) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[var(--color-accent-primary)] hover:underline truncate"
            >
              {title}
            </a>
          </div>
        ) : null}

        {/* Body text */}
        {bodyText ? (
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
            {bodyText}
          </div>
        ) : null}

        {/* Raw content fallback if no markdown structure */}
        {!title && !bodyText && content ? (
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
            {content}
          </div>
        ) : null}

        {/* Metadata */}
        {data?.charsFetched ? (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--color-border-secondary)]">
            <FileText className="h-3 w-3 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">
              {Number(data.charsFetched).toLocaleString()} chars fetched
              {data.truncated ? ' (truncated)' : ''}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
