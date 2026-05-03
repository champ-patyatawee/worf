import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Avatar } from '@/components/common';
import { MessageList, EnhancedMessageInput, EnhancedMessage } from '@/components/chat';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { ArrowLeft, Search } from 'lucide-react';
import { parseDMSlug, slugify } from '@/utils/slug';
import type { Message, ImageUpload, ChatImage } from '@/types';

export function DirectMessage() {
  const { dmSlug } = useParams<{ dmSlug: string }>();
  console.log('[DirectMessage] Render:', { dmSlug, pathname: window.location.pathname });
  const parsedSlug = dmSlug ? parseDMSlug(dmSlug) : null;
  console.log('[DirectMessage] Parsed slug:', parsedSlug);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  
  const { users, setCurrentDMUser } = useUserStore();
  console.log('[DirectMessage] Users in store:', users.map(u => ({ id: u.id, name: u.name })));
  const dmUser = users.find((u) => slugify(u.name) === parsedSlug);
  console.log('[DirectMessage] Looking for user with slug:', parsedSlug, '-> found:', dmUser?.name);
  const userId = dmUser?.id || null;
  console.log('[DirectMessage] userId:', userId);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sendTrigger, setSendTrigger] = useState(0);
  const currentUserId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (userId) {
      setCurrentDMUser(userId);
      fetchMessages();
      socketService.joinDM(userId);
    }
    return () => {
      setCurrentDMUser(null);
      if (userId) {
        socketService.leaveDM(userId);
      }
    };
  }, [userId, setCurrentDMUser]);

  useEffect(() => {
    if (!userId) return;

    const handleNewDMMessage = (message: any) => {
      if (message.userId === userId || message.recipientId === userId) {
        const transformedMessage = {
          ...message,
          images: message.chatImages || [],
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, transformedMessage];
        });
      }
    };

    socketService.on('new_dm_message', handleNewDMMessage);
    return () => {
      socketService.off('new_dm_message', handleNewDMMessage);
    };
  }, [userId]);

  // Load more messages if highlighted message is not yet loaded
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
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await api.getDMMessages(userId);
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
    if (!userId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const response = await api.getDMMessages(userId, { before, limit: 5 });
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
    const before = oldestMessage.createdAt;
    fetchMoreMessages(before);
  };

  const handleSendMessage = async (content: string, uploads?: ImageUpload[]) => {
    if (!userId) return;
    try {
      let imageIds: string[] | undefined;
      
      if (uploads && uploads.length > 0) {
        imageIds = uploads
          .filter((u) => u.result)
          .map((u) => u.result!.id)
          .filter((id): id is string => id !== undefined);
      }

      // Check if DM recipient is an agent
      const isAgent = dmUser?.email?.startsWith('agent-') || dmUser?.role === 'agent';
      // For agents like "AgentChat", use the full name as-is
      const agentName = isAgent ? dmUser?.name : null;
      
      console.log('[DM] handleSendMessage:', { content, dmUser: dmUser?.name, dmUserEmail: dmUser?.email, isAgent, agentName, userId });
      
        if (isAgent && agentName && !imageIds?.length) {
        // DM with agent - no need for @mention, just send message as task
        const task = content.trim();
        
        console.log('[DM] Sending to agent:', agentName, task);
        
        // Get conversation history from DM messages (last 4 messages = 2 user + 2 agent)
        const history: { role: string; content: string }[] = [];
        const recentMsgs = messages.slice(-4);
        for (const msg of recentMsgs) {
          const msgUser = msg.user;
          // If message is from current user -> user role
          if (msgUser?.id === currentUserId) {
            history.push({ role: 'user', content: msg.content });
          }
          // Otherwise (agent) -> assistant role (DM only has current user + agent)
          else if (msgUser?.id === userId || msgUser?.role === 'agent' || msgUser?.email?.startsWith('agent-')) {
            history.push({ role: 'assistant', content: msg.content });
          }
        }
        console.log('[DM] History from DM:', history.length, 'messages', history.map(h => h.role));
        
        // Send user message first
        const response = await api.sendDMWithImages(userId, content, imageIds);
        const { data } = response as { success: boolean; data: any };
        
        if (data?.id) {
          // Add user message to DM
          const userMessage = {
            ...data,
            images: data.chatImages || [],
          };
          setMessages((prev) => [...prev, userMessage]);
          setSendTrigger((prev) => prev + 1);
          
          // Stream agent response and add to DM - use the new DM endpoint
          const { streamAgentChat } = await import('@/services/agentService');
          try {
            let agentFullResponse = '';
            await streamAgentChat(
              agentName, 
              task, 
              history, 
              (chunk, done) => {
                console.log('[DM] Agent chunk:', chunk?.substring(0, 30), 'done:', done);
                agentFullResponse += chunk;
              },
              undefined,  // threadId - not needed for DM
              undefined,  // channelId - not needed for DM
              true,       // isDM - use DM endpoint
              currentUserId!,  // userId - current user
              userId      // recipientId - agent user ID
            );
            
            console.log('[DM] Agent full response:', agentFullResponse?.substring(0, 50));
            
            // Note: The agent response will be saved to DB and sent via socket
            // No need to manually add to messages - socket will trigger it
          } catch (err: any) {
            console.error('[DM] Agent error:', err.message);
          }
        }
        return;
      }
      
      // Regular DM message (not to agent)
      const response = await api.sendDMWithImages(userId, content, imageIds);
      const { data } = response as { success: boolean; data: any };
      if (data) {
        const transformedMessage = {
          ...data,
          images: data.chatImages || [],
        };
        setMessages((prev) => [...prev, transformedMessage]);
        setSendTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendLink = async (url: string) => {
    if (!userId) return;
    try {
      await api.getLinkPreview(url);
      const response = await api.sendDM(userId, url);
      const { data } = response as { success: boolean; data: any };
      if (data) {
        const transformedMessage = {
          ...data,
          images: data.chatImages || [],
        };
        setMessages((prev) => [...prev, transformedMessage]);
      }
    } catch (err) {
      console.error('Failed to send link:', err);
    }
  };

  const handleImageUpload = useCallback(async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<ChatImage | undefined> => {
    try {
      const result = await api.uploadImage(userId!, file, onProgress);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      throw err;
    }
  }, [userId]);

  const handleOpenThread = useCallback((message: Message) => {
    // TODO: Implement DM threads if needed
    console.log('Thread not supported in DM yet:', message.id);
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

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
        Select a user to start chatting
      </div>
    );
  }

  if (!dmUser) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
        User not found
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
          to="/messages"
          className="p-1.5 rounded-md transition-colors-fast md:hidden"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={dmUser.name} src={dmUser.avatar} size="lg" status={dmUser.status} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] truncate" style={{ color: 'var(--color-text-primary)' }}>{dmUser.name}</h2>
          <p className="text-xs capitalize" style={{ color: 'var(--color-text-tertiary)' }}>{dmUser.status}</p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="p-2 rounded-md transition-colors-fast"
          title="Search messages"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <Search className="h-5 w-5" />
          </button>
      </header>

      {/* Messages */}
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

      {/* Enhanced Input with image upload, markdown, multiline */}
      <EnhancedMessageInput
        onSend={handleSendMessage}
        onSendLink={handleSendLink}
        onImageUpload={handleImageUpload}
        placeholder={`Message ${dmUser.name}...`}
      />
    </div>
  );
}