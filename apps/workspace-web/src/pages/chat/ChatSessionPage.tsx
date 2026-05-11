import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageList, AIMessage, ChatMessageInput } from '@/components/chat';
import { ToolBar } from '@/components/tools';
import { useChatSessionStore } from '@/stores/chatSessionStore';
import { usePromptTemplateStore } from '@/stores/promptTemplateStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { Bot, Settings2, X, ChevronDown } from 'lucide-react';
import type { Message, ImageUpload, ChatImage, ToolDefinition } from '@/types';

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  isActive: boolean;
  isDefault: boolean;
}

// Custom dropdown that replaces native <select> for full design system styling
function SettingsDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 text-[15px] text-[var(--color-text-primary)] transition-colors duration-150 hover:border-[var(--color-text-secondary)]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-[var(--radius-md)] border-2"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border-primary)',
            boxShadow: '4px 4px 0px #0D0D0D',
          }}
        >
          <button
            onClick={() => { onChange(''); setIsOpen(false); }}
            className={`w-full px-4 py-2.5 text-left text-[15px] transition-colors hover:bg-[var(--color-bg-hover)] ${!value ? 'font-medium text-[var(--color-accent-primary)]' : 'text-[var(--color-text-tertiary)]'}`}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-[15px] transition-colors hover:bg-[var(--color-bg-hover)] ${value === opt.value ? 'font-medium text-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]' : 'text-[var(--color-text-primary)]'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const {
    sessions,
    messages: storeMessages,
    fetchMessages,
    fetchMoreMessages,
    hasMore,
    isLoadingMore,
    sendMessage,
    fetchSessions,
    updateSession,
    setActiveSession,
  } = useChatSessionStore();

  const { templates, fetchTemplates } = usePromptTemplateStore();
  const currentUser = useAuthStore((s) => s.user);

  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolContexts, setToolContexts] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchSessions(),
        fetchTemplates(),
        loadProviders(),
        loadTools(),
      ]);
    };
    loadData();
  }, [fetchSessions, fetchTemplates]);

  // Find current session from store
  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const found = sessions.find((s) => s.id === sessionId);
      if (found) {
        setActiveSession(sessionId);
        setSelectedModel(found.modelId || '');
        setSelectedTemplate(found.promptTemplateId || '');
        fetchMessages(sessionId);
      }
    } else if (!sessionId) {
      setActiveSession(null);
    }
  }, [sessionId, sessions, setActiveSession, fetchMessages]);

  // Close settings sidebar on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false);
    };
    if (showSettings) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showSettings]);

  const loadProviders = async () => {
    try {
      const response = await api.getAIProviders();
      setProviders(response.filter((p: AIProvider) => p.isActive));
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const loadTools = async () => {
    try {
      const data = await api.getAvailableTools();
      setTools(data.filter((t) => t.isEnabled));
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  const handleModelChange = async (value: string) => {
    setSelectedModel(value);
    if (sessionId) {
      await updateSession(sessionId, { modelId: value || undefined });
    }
  };

  const handleTemplateChange = async (value: string) => {
    setSelectedTemplate(value);
    if (sessionId) {
      await updateSession(sessionId, { promptTemplateId: value || undefined });
    }
  };

  const handleSendMessage = async (content: string, uploads?: ImageUpload[]) => {
    if (!sessionId) return;

    if (activeTool === 'image_gen') {
      const imageUrls: string[] = [];
      if (uploads && uploads.length > 0) {
        for (const u of uploads) {
          if (u.result?.url) imageUrls.push(u.result.url);
        }
      }
      await sendMessage(sessionId, content, 'image_gen', {
        prompt: content,
        userId: currentUser?.id,
        imageUrls,
      });
      return;
    }

    let toolContext: string | undefined;
    if (activeTool === 'webfetch') {
      const urlMatch = content.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        const updatedContexts = { ...toolContexts };
        if (!updatedContexts[url]) {
          try {
            const result = await api.executeTool('webfetch', { url });
            if (result.success && result.data?.content) {
              updatedContexts[url] = result.data.content;
              setToolContexts(updatedContexts);
            }
          } catch (err) {
            console.error('Webfetch failed:', err);
          }
        }
        const allContexts = Object.values(updatedContexts);
        if (allContexts.length > 0) {
          toolContext = allContexts.join('\n\n---\n\n');
        }
      }
    }

    await sendMessage(sessionId, content, undefined, undefined, toolContext);
  };

  const handleSendLink = async (url: string) => {
    if (!sessionId) return;
    await sendMessage(sessionId, url);
  };

  const handleImageUpload = useCallback(async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<ChatImage | undefined> => {
    if (!sessionId) return;
    try {
      const result = await api.uploadImage(sessionId, file, onProgress);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      throw err;
    }
  }, [sessionId]);

  const handleToolClick = useCallback((toolName: string) => {
    setActiveTool((prev) => {
      if (prev === toolName) {
        if (toolName === 'webfetch') {
          setToolContexts({});
        }
        return null;
      }
      return toolName;
    });
  }, []);

  const handleLoadOlder = useCallback(() => {
    if (!sessionId || isLoadingMore || !hasMore) return;
    const oldest = storeMessages[0];
    if (!oldest) return;
    fetchMoreMessages(sessionId, oldest.createdAt);
  }, [sessionId, storeMessages, isLoadingMore, hasMore, fetchMoreMessages]);

  const messages: Message[] = storeMessages.map((m) => ({
    id: m.id,
    channelId: '',
    userId: m.role === 'user' ? 'user' : 'assistant',
    user: {
      id: m.role === 'user' ? 'user' : 'assistant',
      name: m.role === 'user' ? 'You' : 'AI',
      email: '',
      status: 'online' as const,
      createdAt: new Date(),
    },
    content: m.content,
    createdAt: new Date(m.createdAt),
    images: [],
  }));

  // Empty state when no session is selected
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">AI Chat</p>
          <p className="text-sm">Select a chat or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Minimal header with settings gear */}
      <header
        className="flex items-center gap-3 px-4 py-2.5 border-b-2 transition-colors duration-100"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border-primary)',
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] border-2 flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border-primary)',
            boxShadow: '2px 2px 0px #0D0D0D',
          }}
        >
          <Bot className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-[var(--radius-md)] transition-colors duration-100 border-2"
          style={{
            color: showSettings ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
            backgroundColor: showSettings ? 'var(--color-accent-subtle)' : 'transparent',
            borderColor: showSettings ? 'var(--color-border-primary)' : 'transparent',
          }}
          title="Chat settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      {/* Settings slide-in sidebar */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            onClick={() => setShowSettings(false)}
          />
          <div
            className="fixed top-0 right-0 z-40 h-full w-72 border-l-2 animate-slideIn"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border-primary)',
              boxShadow: '-4px 0 12px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Chat Settings</span>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]">
                <X className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Model</label>
                <SettingsDropdown
                  value={selectedModel}
                  onChange={handleModelChange}
                  options={providers.map((p) => ({ value: p.id, label: `${p.name} (${p.model})` }))}
                  placeholder="Default model"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Prompt Template</label>
                <SettingsDropdown
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  options={templates.map((t) => ({ value: t.id, label: `${t.name}${t.isDefault ? ' (default)' : ''}` }))}
                  placeholder="No template"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <MessageList
        messages={messages}
        isLoading={false}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        className="flex-1"
        renderMessage={(message, index, allMessages, meta) => (
          <AIMessage
            key={message.id}
            message={message}
            showAvatar={meta?.showAvatar}
            isCompact={meta?.isCompact}
            showHeader={meta?.showHeader}
          />
        )}
        onLoadOlder={handleLoadOlder}
      />

      <ChatMessageInput
        onSend={handleSendMessage}
        onSendLink={handleSendLink}
        onImageUpload={handleImageUpload}
        placeholder="Type a message..."
        toolBar={
          <ToolBar
            tools={tools}
            activeTool={activeTool}
            onToolClick={handleToolClick}
          />
        }
      />
    </div>
  );
}
