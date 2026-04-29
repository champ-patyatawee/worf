import { useState, useEffect } from 'react';
import { X, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common';

interface AgentWebViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentDisplayName?: string;
  webViewUrl: string;
}

export function AgentWebViewModal({
  isOpen,
  onClose,
  agentName,
  agentDisplayName,
  webViewUrl,
}: AgentWebViewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      setError(null);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load content. Please check the URL.');
  };

  const handleRetry = () => {
    setIframeKey((k) => k + 1);
    setIsLoading(true);
    setError(null);
  };

  const handleOpenExternal = () => {
    window.open(webViewUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 w-full h-[90vh] max-w-6xl mx-4 rounded-[var(--radius-lg)]',
          'bg-[var(--color-bg-primary)] border-2 border-[var(--color-border-primary)]',
          'flex flex-col overflow-hidden'
        )}
        style={{ boxShadow: '8px 8px 0px #0D0D0D' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">
              {agentDisplayName || agentName}
            </h2>
            <span className="text-sm text-text-tertiary">
              {webViewUrl}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExternal}
              className="p-2 rounded-md hover:bg-bg-hover transition-colors-fast"
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5 text-text-tertiary" />
            </button>
            <button
              onClick={handleRetry}
              className="p-2 rounded-md hover:bg-bg-hover transition-colors-fast"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-text-tertiary" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-bg-hover transition-colors-fast"
              title="Close (Esc)"
            >
              <X className="h-5 w-5 text-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-bg-tertiary">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-text-tertiary">Loading...</span>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-status-error">
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-text-primary font-medium">{error}</p>
                <Button onClick={handleRetry} variant="secondary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={webViewUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              title={`${agentDisplayName || agentName} Web View`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
