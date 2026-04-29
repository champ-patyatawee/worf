import { forwardRef, useState, useCallback, useEffect, useRef, FormEvent, KeyboardEvent, memo, ChangeEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageUploadProgressList } from './ImageUploadProgress';
import { AttachmentDropdown } from './AttachmentDropdown';
import { PasteHandler } from './PasteHandler';
import { SlashCommandSuggestions, getSuggestionItems } from './SlashCommandSuggestions';
import { detectSuggestionTrigger, replaceSuggestionInContent } from '@/utils/suggestionParser';
import { useAgentStore } from '@/stores/agentStore';
import { useUIStore } from '@/stores/uiStore';
import { api } from '@/services/api';
import type { ImageUpload } from '@/types';

interface EnhancedMessageInputProps {
  onSend: (content: string, images?: ImageUpload[]) => void;
  onSendLink?: (url: string) => void;
  onImageUpload?: (file: File, onProgress: (progress: number) => void) => Promise<ImageUpload['result']>;
  placeholder?: string;
  className?: string;
  maxImageSizeMB?: number;
  maxImages?: number;
}

interface UploadsState {
  [id: string]: ImageUpload;
}

export const EnhancedMessageInput = memo(forwardRef<HTMLTextAreaElement, EnhancedMessageInputProps>(
  ({
    onSend,
    onSendLink,
    onImageUpload,
    placeholder = 'Type a message...',
    className,
    maxImageSizeMB = 10,
    maxImages = 5,
  }, ref) => {
    const [content, setContent] = useState('');
    const [uploads, setUploads] = useState<UploadsState>({});
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadOverallProgress, setUploadOverallProgress] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionType, setSuggestionType] = useState<'slash' | 'user' | 'channel'>('slash');
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [triggerIndex, setTriggerIndex] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0, width: 0 });
    
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
    
    const agents = useAgentStore((s) => s.agents);
    const fetchAgents = useAgentStore((s) => s.fetchAgents);
    const openAgentWebView = useUIStore((s) => s.openAgentWebView);
    
    const fetchSuggestionData = useCallback(async () => {
      try {
        const [usersRes, channelsRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/channels'),
        ]);
        if (usersRes) setUsers(Array.isArray(usersRes) ? usersRes : usersRes.data || []);
        if (channelsRes) setChannels(Array.isArray(channelsRes) ? channelsRes : channelsRes.data || []);
      } catch (err) {
        console.error('[EnhancedMessageInput] Failed to fetch suggestion data:', err);
      }
    }, []);
    
    useEffect(() => {
      if (showSuggestions) {
        fetchAgents();
        fetchSuggestionData();
      }
    }, [showSuggestions, fetchAgents, fetchSuggestionData]);

    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const createPreview = (file: File): string => {
      return URL.createObjectURL(file);
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const adjustTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
      }
    }, []);

    const resetTextareaHeight = useCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, []);

    const handleFilesSelected = useCallback(async (files: File[]) => {
      if (!onImageUpload) return;

      const newUploads: UploadsState = {};
      
      for (const file of files) {
        const id = generateId();
        newUploads[id] = {
          id,
          file,
          preview: createPreview(file),
          progress: 0,
          status: 'pending',
        };
      }

      setUploads((prev) => ({ ...prev, ...newUploads }));
      setShowImageUpload(false);
      setIsUploading(true);

      let completed = 0;
      const total = files.length;

      for (const id of Object.keys(newUploads)) {
        const upload = newUploads[id];
        
        setUploads((prev) => ({
          ...prev,
          [id]: { ...prev[id], status: 'uploading' },
        }));

        try {
          const result = await onImageUpload(upload.file, (progress) => {
            setUploads((prev) => ({
              ...prev,
              [id]: { ...prev[id], progress },
            }));
          });

          setUploads((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              status: 'completed',
              progress: 100,
              result,
            },
          }));
        } catch (error) {
          setUploads((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              status: 'error',
              error: error instanceof Error ? error.message : 'Upload failed',
            },
          }));
        }

        completed++;
        setUploadOverallProgress(Math.round((completed / total) * 100));
      }

      setIsUploading(false);
    }, [onImageUpload]);

    const handlePaste = useCallback((files: File[]) => {
      handleFilesSelected(files);
    }, [handleFilesSelected]);

    const handleCancelUpload = useCallback((id: string) => {
      setUploads((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }, []);

    const handleRetryUpload = useCallback((id: string) => {
      const upload = uploads[id];
      if (upload && onImageUpload) {
        setUploads((prev) => ({
          ...prev,
          [id]: { ...prev[id], status: 'uploading', error: undefined },
        }));
        
        onImageUpload(upload.file, (progress) => {
          setUploads((prev) => ({
            ...prev,
            [id]: { ...prev[id], progress },
          }));
        })
          .then((result) => {
            setUploads((prev) => ({
              ...prev,
              [id]: { ...prev[id], status: 'completed', progress: 100, result },
            }));
          })
          .catch((error) => {
            setUploads((prev) => ({
              ...prev,
              [id]: {
                ...prev[id],
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              },
            }));
          });
      }
    }, [uploads, onImageUpload]);

    const handleSubmit = useCallback((e?: FormEvent) => {
      if (e) e.preventDefault();
      
      const completedUploads = Object.values(uploads).filter(
        (u) => u.status === 'completed' && u.result
      );

      const trimmedContent = content.trim();

      if (trimmedContent || completedUploads.length > 0) {
        onSend(trimmedContent, completedUploads);
        setContent('');
        resetTextareaHeight();
        Object.values(uploads).forEach((u) => {
          if (u.preview) URL.revokeObjectURL(u.preview);
        });
        setUploads({});
      }
    }, [content, uploads, onSend, resetTextareaHeight]);

    const handleSendLink = useCallback((url: string) => {
      if (onSendLink) {
        onSendLink(url);
      }
    }, [onSendLink]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions) {
        const items = getSuggestionItems(suggestionType, agents, users, channels, suggestionQuery);
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (items[selectedIndex]) {
            handleSuggestionSelect(items[selectedIndex]);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }
      
      if (e.key === 'Enter') {
        const isModKey = e.ctrlKey || e.metaKey;
        
        if (isModKey) {
          e.preventDefault();
          const textarea = e.target as HTMLTextAreaElement;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newValue = content.substring(0, start) + '\n' + content.substring(end);
          setContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            adjustTextareaHeight();
          }, 0);
        } else if (!e.shiftKey && !showSuggestions) {
          e.preventDefault();
          handleSubmit();
        }
      }
    }, [content, handleSubmit, adjustTextareaHeight, showSuggestions, suggestionType, agents, users, channels, suggestionQuery, selectedIndex]);

    const handleContentChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursor = e.target.selectionStart;
      
      setContent(value);
      adjustTextareaHeight();
      
      const trigger = detectSuggestionTrigger(value, cursor);
      
      if (trigger) {
        setSuggestionType(trigger.type);
        setSuggestionQuery(trigger.query);
        setTriggerIndex(trigger.triggerIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
        
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          const dropdownHeight = 256;
          setSuggestionPosition({
            top: rect.top - dropdownHeight - 8,
            left: rect.left,
            width: rect.width,
          });
        }
      } else {
        setShowSuggestions(false);
      }
    }, [adjustTextareaHeight]);
    
    const handleSuggestionSelect = useCallback((item: { id: string; name: string; type: 'slash' | 'user' | 'agent' | 'channel'; url?: string }) => {
      if (item.type === 'slash' && item.url) {
        const agent = agents.find((a) => a.id === item.id);
        openAgentWebView(agent?.displayName || item.name, item.url!, agent?.displayName);
        setContent('');
        setShowSuggestions(false);
      } else {
        const triggerChar = suggestionType === 'slash' ? '/' : suggestionType === 'user' ? '@' : '#';
        const newContent = replaceSuggestionInContent(content, triggerIndex, triggerChar, item.name);
        setContent(newContent);
        setShowSuggestions(false);
        
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = triggerIndex + triggerChar.length + item.name.length;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
      }
    }, [content, triggerIndex, suggestionType, agents, openAgentWebView]);

    useEffect(() => {
      return () => {
        Object.values(uploads).forEach((u) => {
          if (u.preview) URL.revokeObjectURL(u.preview);
        });
      };
    }, []);

    const uploadList = Object.values(uploads);
    const hasActiveUploads = uploadList.some((u) => u.status === 'uploading' || u.status === 'pending');
    const hasCompletedUploads = uploadList.some((u) => u.status === 'completed');
    const hasErrors = uploadList.some((u) => u.status === 'error');
    const canSend = (content.trim() || hasCompletedUploads) && !hasActiveUploads;

    return (
      <div className={cn('px-4 py-3', className)}>
        {showImageUpload && (
          <div className="mb-3 animate-scaleIn">
            <ImageUploadZone
              onFilesSelected={handleFilesSelected}
              onUploadCancel={() => setShowImageUpload(false)}
              isUploading={isUploading}
              uploadProgress={uploadOverallProgress}
              maxFiles={maxImages}
              maxSizeMB={maxImageSizeMB}
            />
          </div>
        )}

        {uploadList.length > 0 && !showImageUpload && (
          <div className="mb-3">
            <ImageUploadProgressList
              uploads={uploadList}
              onCancel={handleCancelUpload}
              onRetry={handleRetryUpload}
            />
          </div>
        )}

        <PasteHandler onPaste={handlePaste} enabled={!showImageUpload} />

        <form
          onSubmit={handleSubmit}
          className={cn(
            'flex flex-col items-stretch transition-all duration-200',
            'relative z-10 rounded-[var(--radius-xl)] cursor-text',
            'bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)]',
            'shadow-[4px_4px_0px_#0D0D0D]',
            'md:w-full',
            'hover:shadow-[6px_6px_0px_#0D0D0D]',
            'focus-within:border-[var(--color-accent-primary)]',
            isFocused && 'border-[var(--color-accent-primary)]'
          )}
        >
          <div className="flex flex-col m-3.5 gap-3">
            <div className="relative">
              <div className="w-full overflow-y-auto break-words transition-opacity duration-200 max-h-96 min-h-[1.5rem]">
                <textarea
                  ref={(e) => {
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                    if (typeof ref === 'function') {
                      ref(e);
                    } else if (ref && 'current' in ref) {
                      (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                    }
                  }}
                  value={content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={placeholder}
                  rows={1}
                  className={cn(
                    'w-full border-none outline-none resize-none',
                    'text-sm bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)]',
                    'scrollbar-hide'
                  )}
                  style={{ overflow: 'hidden' }}
                />
              </div>
            </div>

            <div className="relative flex gap-2 w-full items-center">
              <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
                <AttachmentDropdown
                  onImageSelect={() => setShowImageUpload(true)}
                  onLinkSubmit={handleSendLink}
                />
                <div className="flex flex-row items-center min-w-0 gap-1" />
              </div>

              <div className="shrink-0 flex items-center w-8 z-10 justify-end">
                <button
                  type="submit"
                  disabled={!canSend}
                  className={cn(
                    'h-8 rounded-[var(--radius-md)] overflow-hidden flex items-center justify-center',
                    'font-semibold transition-all duration-200 border-2',
                    canSend
                      ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-border-primary)] shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                      : 'bg-transparent text-[var(--color-text-placeholder)] border-transparent cursor-not-allowed',
                    'px-2'
                  )}
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </form>

        {showSuggestions && (
          <SlashCommandSuggestions
            query={suggestionQuery}
            items={getSuggestionItems(suggestionType, agents, users, channels, suggestionQuery)}
            selectedIndex={selectedIndex}
            onSelect={handleSuggestionSelect}
            onClose={() => setShowSuggestions(false)}
            position={suggestionPosition}
          />
        )}

        {hasActiveUploads && (
          <div className="mt-2 text-xs text-[var(--color-accent-primary)] flex items-center gap-1.5 font-medium">
            <div className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-pulse" />
            Uploading {uploadList.filter((u) => u.status === 'uploading').length} image(s)...
          </div>
        )}
        {hasErrors && (
          <div className="mt-2 text-xs text-status-error font-medium">
            Some uploads failed. Click retry to try again.
          </div>
        )}
      </div>
    );
  }
));

EnhancedMessageInput.displayName = 'EnhancedMessageInput';
