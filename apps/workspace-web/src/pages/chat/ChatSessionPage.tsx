import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { MessageList, EnhancedMessage } from '@/components/chat';
import { ChatMessageInput } from '@/components/chat';
import { ToolBar } from '@/components/tools';
import { useChatSessionStore, type ChatSession } from '@/stores/chatSessionStore';
import { usePromptTemplateStore } from '@/stores/promptTemplateStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { Bot, ChevronDown } from 'lucide-react';
import type { Message, ImageUpload, ChatImage, ToolDefinition } from '@/types';

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  isActive: boolean;
  isDefault: boolean;
}

export function ChatSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const {
    sessions,
    messages: storeMessages,
    fetchMessages,
    sendMessage,
    fetchSessions,
    updateSession,
    setActiveSession,
  } = useChatSessionStore();

  const { templates, fetchTemplates } = usePromptTemplateStore();
  const currentUser = useAuthStore((s) => s.user);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolContexts, setToolContexts] = useState<Record<string, string>>({});

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
        setSession(found);
        setActiveSession(sessionId);
        setSelectedModel(found.modelId || '');
        setSelectedTemplate(found.promptTemplateId || '');
        fetchMessages(sessionId);
      }
    } else if (!sessionId) {
      setSession(null);
      setActiveSession(null);
    }
  }, [sessionId, sessions, setActiveSession, fetchMessages]);

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

  // When model selection changes, update session
  const handleModelChange = async (value: string) => {
    setSelectedModel(value);
    if (sessionId) {
      await updateSession(sessionId, { modelId: value || undefined });
    }
  };

  // When template selection changes, update session
  const handleTemplateChange = async (value: string) => {
    setSelectedTemplate(value);
    if (sessionId) {
      await updateSession(sessionId, { promptTemplateId: value || undefined });
    }
  };

  const handleSendMessage = async (content: string, uploads?: ImageUpload[]) => {
    if (!sessionId) return;

    // image_gen uses non-streaming path (needs tool execution)
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

    // webfetch: execute tool separately, pass context to streaming
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

    // Streaming: only content + toolContext, no toolName/toolParams
    await sendMessage(sessionId, content, undefined, undefined, toolContext);
  };

  const handleSendLink = async (url: string) => {
    if (!sessionId) return;
    // For link preview, just send as text for now
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
        // Clear cached context when deselecting the tool
        if (toolName === 'webfetch') {
          setToolContexts({});
        }
        return null;
      }
      return toolName;
    });
  }, []);

  const handleOpenThread = useCallback((message: Message) => {
    console.log('Thread not supported for AI chat:', message.id);
  }, []);

  // Convert store messages to Message format for MessageList
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
      {/* Header with model and template selectors */}
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

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Model selector */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="appearance-none h-8 rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text-primary)] pl-2.5 pr-7 transition-colors duration-100 cursor-pointer hover:border-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value="">Default model</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.model})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-tertiary)] pointer-events-none" />
          </div>

          {/* Prompt template selector */}
          <div className="relative">
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="appearance-none h-8 rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text-primary)] pl-2.5 pr-7 transition-colors duration-100 cursor-pointer hover:border-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-tertiary)] pointer-events-none" />
          </div>

          {/* Session title */}
          {session?.title && (
            <>
              <div className="w-px h-5" style={{ backgroundColor: 'var(--color-border-secondary)' }} />
              <span className="text-sm truncate hidden sm:inline" style={{ color: 'var(--color-text-tertiary)' }}>
                {session.title}
              </span>
            </>
          )}
        </div>
      </header>

      <MessageList
        messages={messages}
        isLoading={false}
        hasMore={false}
        isLoadingMore={false}
        className="flex-1"
        renderMessage={(message, index, allMessages, meta) => (
          <EnhancedMessage
            key={message.id}
            message={message}
            isOwn={meta?.isOwn}
            showAvatar={meta?.showAvatar}
            isCompact={meta?.isCompact}
            showHeader={meta?.showHeader}
            onOpenThread={handleOpenThread}
          />
        )}
        onLoadOlder={() => {}}
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
