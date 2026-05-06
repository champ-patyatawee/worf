import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Avatar } from '@/components/common';
import { MessageList, EnhancedMessage } from '@/components/chat';
import { AgentMessageInput, ToolBar } from '@/components/agents';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { parseDMSlug, slugify } from '@/utils/slug';
import type { Message, ImageUpload, ChatImage, ToolDefinition } from '@/types';

export function AgentChat() {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const parsedSlug = agentSlug ? parseDMSlug(agentSlug) : null;
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');

  const { users, setCurrentDMUser } = useUserStore();
  const agentUser = users.find((u) => slugify(u.name) === parsedSlug);
  const agentId = agentUser?.id || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sendTrigger, setSendTrigger] = useState(0);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;

  // Load tools when agent is available (for tool bar)
  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await api.getAvailableTools();
      setTools(data.filter((t) => t.isEnabled));
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  useEffect(() => {
    if (agentId) {
      setCurrentDMUser(agentId);
      fetchMessages();
      socketService.joinDM(agentId);
    }
    return () => {
      setCurrentDMUser(null);
      if (agentId) {
        socketService.leaveDM(agentId);
      }
    };
  }, [agentId, setCurrentDMUser]);

  useEffect(() => {
    if (!agentId) return;

    const handleNewDMMessage = (message: any) => {
      if (message.userId === agentId || message.recipientId === agentId) {
        const transformedMessage = {
          ...message,
          images: message.chatImages || [],
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, transformedMessage];
        });
      }
    };

    socketService.on('new_dm_message', handleNewDMMessage);
    return () => {
      socketService.off('new_dm_message', handleNewDMMessage);
    };
  }, [agentId]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const targetId = highlightParam || hash;
    if (!targetId || messages.length === 0) return;
    const messageExists = messages.some((m) => m.id === targetId);
    if (!messageExists && hasMore && !isLoadingMore) {
      handleLoadOlder();
    }
  }, [highlightParam, messages, hasMore, isLoadingMore]);

  const fetchMessages = async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const response = await api.getDMMessages(agentId);
      const { data } = response as { success: true; data: { messages: any[]; pagination?: any } };
      const transformedMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        images: msg.chatImages || [],
      }));
      setMessages(transformedMessages);
      setHasMore(data.pagination?.hasMore ?? transformedMessages.length >= 5);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoreMessages = async (before?: string) => {
    if (!agentId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const response = await api.getDMMessages(agentId, { before, limit: 5 });
      const { data } = response as { success: true; data: { messages: any[]; pagination?: any } };
      const existingIds = new Set(messages.map((m) => m.id));
      const moreMessages = (data.messages || [])
        .filter((msg: any) => !existingIds.has(msg.id))
        .map((msg: any) => ({
          ...msg,
          images: msg.chatImages || [],
        }));
      setMessages((prev) => [...moreMessages, ...prev]);
      setHasMore(data.pagination?.hasMore ?? moreMessages.length >= 5);
    } catch (err) {
      console.error('Failed to fetch more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadOlder = () => {
    const oldestMessage = messages[0];
    if (!oldestMessage) return;
    fetchMoreMessages(oldestMessage.createdAt);
  };

  const handleSendMessage = async (content: string, uploads?: ImageUpload[]) => {
    if (!agentId) return;

    const agentName = agentUser?.name || 'Agent';
    const task = content.trim();

    // 1. Show user's message immediately (optimistic)
    const optimisticId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: optimisticId,
      channelId: '',
      userId: currentUserId,
      user: currentUser,
      content: task,
      createdAt: new Date(),
    } as Message]);

    // 2. Execute the active tool (if any) — runs async
    let toolResultContent = '';
    let savedMessageId = '';
    if (activeTool) {
      try {
        let toolParams: Record<string, unknown> = {};

        if (activeTool === 'webfetch') {
          const urlMatch = content.match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : null;
          if (!url) return;
          toolParams = { url };
        } else if (activeTool === 'image_gen') {
          toolParams = { prompt: task, userId: currentUserId, agentId };
        }

        if (Object.keys(toolParams).length > 0) {
          const response = await api.executeTool(agentName, activeTool, toolParams);
          if (response.success && response.data) {
            toolResultContent = response.data.content || '';
            savedMessageId = response.data.data?.savedMessageId || '';
          }
        }
      } catch (err) {
        console.error(`Tool ${activeTool} failed:`, err);
      }
    }

    // 3. If image gen, show the generated image (below user's message)
    //    Use savedMessageId if available so dedup with socket event works
    if (activeTool === 'image_gen' && toolResultContent) {
      setMessages((prev) => [...prev, {
        id: savedMessageId || `img-${Date.now()}`,
        channelId: '',
        userId: agentId,
        user: agentUser,
        content: toolResultContent,
        createdAt: new Date(),
      } as Message]);
    }

    // 4. Build history for agent context
    const history: { role: string; content: string }[] = [];
    const recentMsgs = messages.slice(-20);
    for (const msg of recentMsgs) {
      const msgUser = msg.user;
      if (msgUser?.id === currentUserId) {
        history.push({ role: 'user', content: msg.content });
      } else if (msgUser?.id === agentId || msgUser?.role === 'agent' || msgUser?.email?.startsWith('agent-')) {
        history.push({ role: 'assistant', content: msg.content });
      }
    }

    // 5. Build enhanced task with tool context
    let enhancedTask = task;
    if (activeTool === 'webfetch' && toolResultContent) {
      enhancedTask = `${task}\n\n[Web Fetch Result — page content fetched for context]:\n${toolResultContent}`;
    } else if (activeTool === 'image_gen' && toolResultContent) {
      enhancedTask = `${task}\n\nThe image was generated and shown above. You can discuss it with the user.`;
    }

    // 6. Save user's message to DB and stream agent response
    try {
      let imageIds: string[] | undefined;
      if (uploads && uploads.length > 0) {
        imageIds = uploads
          .filter((u) => u.result)
          .map((u) => u.result!.id)
          .filter((id): id is string => id !== undefined);
      }

      const response = await api.sendDMWithImages(agentId, content, imageIds);
      const { data } = response as { success: boolean; data: any };

      if (data?.id) {
        // Replace optimistic message with the real one from the server
        setMessages((prev) => prev.map((m) =>
          m.id === optimisticId
            ? { ...data, images: data.chatImages || [] }
            : m
        ));
        setSendTrigger((prev) => prev + 1);

        const { streamAgentChat } = await import('@/services/agentService');

        try {
          let agentFullResponse = '';
          await streamAgentChat(
            agentName,
            enhancedTask,
            history,
            (chunk, done) => {
              agentFullResponse += chunk;
            },
            undefined,
            undefined,
            true,
            currentUserId!,
            agentId
          );
        } catch (err: any) {
          console.error('[AgentChat] Agent error:', err.message);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendLink = async (url: string) => {
    if (!agentId) return;
    try {
      await api.getLinkPreview(url);
      const response = await api.sendDM(agentId, url);
      const { data } = response as { success: boolean; data: any };
      if (data) {
        setMessages((prev) => [...prev, { ...data, images: data.chatImages || [] }]);
      }
    } catch (err) {
      console.error('Failed to send link:', err);
    }
  };

  const handleToolClick = useCallback((toolName: string) => {
    setActiveTool((prev) => (prev === toolName ? null : toolName));
  }, []);

  const handleDeleteConversation = useCallback(async () => {
    if (!agentId) return;
    if (!window.confirm(`Delete conversation with ${agentUser?.name}?`)) return;
    try {
      await api.deleteDMConversation(agentId);
      setMessages([]);
      setHasMore(true);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [agentId, agentUser]);

  const handleImageUpload = useCallback(async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<ChatImage | undefined> => {
    try {
      if (!agentId) return;
      const result = await api.uploadImage(agentId, file, onProgress);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      throw err;
    }
  }, [agentId]);

  const handleOpenThread = useCallback((message: Message) => {
    console.log('Thread not supported for agent chat:', message.id);
  }, []);

  const renderMessage = useCallback((message: Message, index: number, allMessages: Message[], meta?: { isCompact: boolean; showAvatar: boolean; showHeader: boolean; isOwn: boolean }) => {
    return (
      <EnhancedMessage
        key={message.id}
        message={message}
        isOwn={meta?.isOwn}
        showAvatar={meta?.showAvatar}
        isCompact={meta?.isCompact}
        showHeader={meta?.showHeader}
        onOpenThread={handleOpenThread}
      />
    );
  }, [handleOpenThread]);

  if (!agentId || !agentUser) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
        Select an agent to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <header
        className="flex items-center gap-3 px-4 py-2.5 border-b transition-colors-fast"
        style={{ borderColor: 'var(--color-border-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <Link
          to="/agents"
          className="p-1.5 rounded-md transition-colors-fast md:hidden"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={agentUser.name} src={agentUser.avatar} size="lg" status={agentUser.status} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] truncate" style={{ color: 'var(--color-text-primary)' }}>{agentUser.name}</h2>
          <p className="text-xs capitalize" style={{ color: 'var(--color-text-tertiary)' }}>AI Agent</p>
        </div>
        <button
          onClick={handleDeleteConversation}
          className="p-2 rounded-md transition-colors-fast hover:bg-[var(--color-bg-hover)]"
          style={{ color: 'var(--color-text-tertiary)' }}
          title="Delete conversation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        className="flex-1"
        renderMessage={renderMessage}
        onLoadOlder={handleLoadOlder}
        highlightedMessageId={highlightParam}
        scrollToBottomKey={sendTrigger}
      />

      <AgentMessageInput
        onSend={handleSendMessage}
        onSendLink={handleSendLink}
        onImageUpload={handleImageUpload}
        placeholder={`Message ${agentUser.name}...`}
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
