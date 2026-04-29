import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, AlertCircle, Search } from 'lucide-react';
import { EnhancedMessage } from '@/components/chat/EnhancedMessage';
import { api } from '@/services/api';
import { slugify } from '@/utils/slug';
import type { Message } from '@/types';

interface SearchResultProps {
  messageId: string;
  messageType: 'channel' | 'directMessage' | null;
  channelId: string | null;
  dmUserName: string | null;
  onBack: () => void;
}

export function SearchResultView({
  messageId,
  messageType,
  channelId,
  dmUserName,
  onBack
}: SearchResultProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!messageId) return;
    
    const fetchMessage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getMessage(messageId);
        const messageData = (response as any).data || response;
        setMessage(messageData);
      } catch (err) {
        console.error('Failed to fetch message:', err);
        setError('Message not found or you do not have access to it.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessage();
  }, [messageId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-bg-primary">
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--color-border-primary)]">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-text-tertiary" />
            <h2 className="font-semibold text-text-primary">Search Result</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary" />
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="flex flex-col h-full bg-bg-primary">
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--color-border-primary)]">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-text-tertiary" />
            <h2 className="font-semibold text-text-primary">Search Result</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
          <AlertCircle className="h-8 w-8 mb-2 text-status-error" />
          <p>{error || 'Message not found'}</p>
        </div>
      </div>
    );
  }

  const handleViewInChannel = () => {
    if (channelId) {
      navigate(`/channels/${channelId}#${messageId}`);
    }
  };

  const handleViewInDM = () => {
    if (dmUserName) {
      const slug = slugify(dmUserName);
      navigate(`/messages/${slug}#${messageId}`);
    }
  };

  return (
      <div className="flex flex-col h-full bg-bg-primary">
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--color-border-primary)]">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-bg-hover transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-text-tertiary" />
          <h2 className="font-semibold text-text-primary">Search Result</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b-2 border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <div className="flex items-center justify-end mb-3">
            <div className="flex gap-2">
              {messageType === 'channel' && channelId && (
                <button
                  onClick={handleViewInChannel}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-accent-primary)] text-white text-xs rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)] btn-brutal transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View in Channel
                </button>
              )}
              {messageType === 'directMessage' && dmUserName && (
                <button
                  onClick={handleViewInDM}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-accent-primary)] text-white text-xs rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)] btn-brutal transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View in DM
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <EnhancedMessage
              message={message}
              showAvatar={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}