import { useChannelStore } from '@/stores/channelStore';
import { useMessageStore } from '@/stores/messageStore';
import { socketService } from '@/services/socket';
import { api } from '@/services/api';
import { useEffect, useState, useCallback } from 'react';
import type { Message } from '@/types';

export function useChannel(channelIdOrName: string) {
  const { channels, setActiveChannel, fetchChannels, markAsRead } =
    useChannelStore();
  const { messages, fetchMessages, addMessage, updateMessage, incrementThreadCount } = useMessageStore();
  const [realChannelId, setRealChannelId] = useState<string | null>(null);

  const channelMessages = messages[realChannelId || channelIdOrName] || [];
  const channel = channels.find((c) => c.id === realChannelId || c.name === channelIdOrName);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Fetch real channel ID when channelIdOrName changes
  useEffect(() => {
    const fetchRealChannelId = async () => {
      if (!channelIdOrName) return;
      
      try {
        const response = await api.getChannel(channelIdOrName);
        const channelData = (response as any).data || response;
        if (channelData?.id) {
          setRealChannelId(channelData.id);
        } else {
          setRealChannelId(channelIdOrName);
        }
      } catch {
        setRealChannelId(channelIdOrName);
      }
    };

    fetchRealChannelId();
  }, [channelIdOrName]);

  useEffect(() => {
    const targetId = realChannelId || channelIdOrName;
    if (targetId) {
      setActiveChannel(targetId);
      fetchMessages(targetId);
      socketService.joinChannel(targetId);
    }

    return () => {
      if (targetId) {
        socketService.leaveChannel(targetId);
      }
    };
  }, [realChannelId, channelIdOrName, setActiveChannel, fetchMessages]);

  useEffect(() => {
    const targetId = realChannelId || channelIdOrName;
    if (!targetId) return;

    const handleNewMessage = (message: Message) => {
      if (message.channelId === targetId) {
        if ((message as any).threadId) {
          incrementThreadCount(targetId, (message as any).threadId);
        } else {
          const transformedMessage = {
            ...message,
            images: (message as any).chatImages || [],
            reactions: (message as any).reactions || [],
          };
          addMessage(targetId, transformedMessage);
        }
      }
    };

    socketService.on('receive_message', handleNewMessage as (...args: unknown[]) => void);

    return () => {
      socketService.off('receive_message', handleNewMessage as (...args: unknown[]) => void);
    };
  }, [realChannelId, channelIdOrName, addMessage, incrementThreadCount]);

  useEffect(() => {
    const targetId = realChannelId || channelIdOrName;
    if (!targetId) return;

    const handleReactionAdded = (reaction: any) => {
      if (!reaction.messageId) return;
      
      const channelMessages = useMessageStore.getState().messages[targetId] || [];
      const message = channelMessages.find((m) => m.id === reaction.messageId);
      if (message) {
        const updatedMessage = {
          ...message,
          reactions: [...(message.reactions || []), reaction],
        };
        updateMessage(targetId, updatedMessage);
      }
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string; emoji: string }) => {
      const channelMessages = useMessageStore.getState().messages[targetId] || [];
      const message = channelMessages.find((m) => m.id === data.messageId);
      if (message) {
        const updatedMessage = {
          ...message,
          reactions: (message.reactions || []).filter(
            (r) => !(r.emoji === data.emoji && r.userId === data.userId)
          ),
        };
        updateMessage(targetId, updatedMessage);
      }
    };

    socketService.onReactionAdded(handleReactionAdded);
    socketService.onReactionRemoved(handleReactionRemoved);

    return () => {
      socketService.offReactionAdded(handleReactionAdded);
      socketService.offReactionRemoved(handleReactionRemoved);
    };
  }, [realChannelId, channelIdOrName, updateMessage]);

  const targetId = realChannelId || channelIdOrName;
  const hasMore = useMessageStore((state) => state.hasMore[targetId] ?? false);
  const isLoadingMore = useMessageStore((state) => state.isLoadingMore[targetId] ?? false);
  const fetchMoreMessages = useMessageStore((state) => state.fetchMoreMessages);

  const fetchMore = useCallback(() => {
    const targetId = realChannelId || channelIdOrName;
    if (!targetId) return;
    
    const messages = useMessageStore.getState().messages[targetId] || [];
    const oldestMessage = messages[0];
    
    if (!oldestMessage) return;
    
    const before = oldestMessage.createdAt;
    console.log('[useChannel] fetchMore called, reading from store directly, before:', before);
    fetchMoreMessages(targetId, before);
  }, [targetId, fetchMoreMessages]);

  return {
    channel,
    messages: channelMessages,
    hasMore,
    isLoadingMore,
    fetchMore,
    isLoading: useChannelStore.getState().isLoading,
    error: useChannelStore.getState().error,
    markAsRead: () => markAsRead(targetId),
  };
}
