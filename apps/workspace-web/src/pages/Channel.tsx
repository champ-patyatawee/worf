import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useChannel } from '@/hooks/useChannel';
import { Header } from '@/components/layout';
import {
  MessageList,
  EnhancedMessageInput,
  EnhancedMessage,
  ThreadView,
} from '@/components/chat';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import { useChannelStore } from '@/stores/channelStore';
import { useCallback, useState, useEffect, useRef } from 'react';
import type { ImageUpload, ChatImage, BashSessionStatus, Channel as ChannelType, Message } from '@/types';
import { InviteUserModal } from '@/components/modals/InviteUserModal';
import { ChannelSettingsModal } from '@/components/modals/ChannelSettingsModal';

export function Channel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const { messages, hasMore, isLoadingMore, fetchMore, isLoading, error } = useChannel(id || '');
  const addMessage = useMessageStore((state) => state.addMessage);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const removeChannel = useChannelStore((state) => state.removeChannel);

  // Channel details and admin check
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [sendTrigger, setSendTrigger] = useState(0);

  // Fetch channel details and check admin status
  useEffect(() => {
    if (!id) return;
    
    const fetchChannelDetails = async () => {
      try {
        const response = await api.getChannel(id);
        const channelData = (response as any).data || response;
        setChannel(channelData);
        
        // Get members to check if current user is admin
        const membersResponse = await api.getChannelMembers(id);
        const membersData = (membersResponse as any).data || membersResponse;
        setMembers(membersData || []);
        
        // Check if current user is admin
        const member = membersData?.find((m: any) => m.user?.id === currentUserId);
        setIsAdmin(member?.role === 'admin');
      } catch (err) {
        console.error('Failed to fetch channel details:', err);
      }
    };
    
    fetchChannelDetails();
  }, [id, currentUserId]);

  // Load more messages if highlighted message is not yet loaded
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const targetId = highlightParam || hash;
    
    if (!targetId || messages.length === 0) return;
    
    const messageExists = messages.some((m: Message) => m.id === targetId);
    
    if (!messageExists && hasMore && !isLoadingMore) {
      fetchMore();
    }
  }, [highlightParam, messages, hasMore, isLoadingMore]);

  if (!id) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-tertiary)' }}>
        Select a channel to start chatting
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-error)' }}>
        {error}
      </div>
    );
  }

  const handleSendMessage = useCallback(async (content: string, uploads?: ImageUpload[]) => {
    try {
      // If we have image uploads, send them with the message
      if (uploads && uploads.length > 0) {
        const imageIds = uploads
          .filter((u) => u.result)
          .map((u) => u.result?.id)
          .filter((id): id is string => id !== undefined);
        
        const response = await api.sendMessage(id, content, imageIds);
        const { data } = response as { success: boolean; data: any };
        console.log('[Channel] Send message response:', data);
        if (data) {
          // Transform chatImages to images (server returns chatImages, client expects images)
          const transformedMessage = {
            ...data,
            images: data.chatImages || [],
          };
          console.log('[Channel] Transformed message images:', transformedMessage.images);
          addMessage(id, transformedMessage);
          setSendTrigger((prev) => prev + 1);
        }
      } else {
        const response = await api.sendMessage(id, content);
        const { data } = response as { success: boolean; data: any };
        console.log('[Channel] Send message response (no images):', data);
        if (data) {
          // Transform chatImages to images (server returns chatImages, client expects images)
          const transformedMessage = {
            ...data,
            images: data.chatImages || [],
          };
          addMessage(id, transformedMessage);
          setSendTrigger((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [id, addMessage]);

  const handleSendLink = useCallback(async (url: string) => {
    try {
      // First get link preview
      await api.getLinkPreview(url);
      
      // Send message with link
      const response = await api.sendMessage(id, url);
      const { data } = response as { success: boolean; data: any };
      if (data) {
        addMessage(id, data);
      }
    } catch (err) {
      console.error('Failed to send link:', err);
    }
  }, [id, addMessage]);

  const handleImageUpload = useCallback(async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<ChatImage | undefined> => {
    try {
      const result = await api.uploadImage(id, file, onProgress);
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      throw err;
    }
  }, [id]);

  // Custom message renderer that handles images
  const renderMessage = useCallback((message: typeof messages[0], index: number, allMessages: typeof messages, meta?: { isCompact: boolean; showAvatar: boolean; showHeader: boolean; isOwn: boolean }) => {
    return (
      <EnhancedMessage
        key={message.id}
        message={message}
        isOwn={meta?.isOwn}
        showAvatar={meta?.showAvatar}
        isCompact={meta?.isCompact}
        showHeader={meta?.showHeader}
        onOpenThread={setThreadMessage}
      />
    );
  }, []);

  // If viewing a thread, show thread view instead of main chat
  if (threadMessage && id) {
    return (
      <div className="flex flex-col h-full">
        <ThreadView
          message={threadMessage}
          channelId={id}
          onBack={() => setThreadMessage(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Header
        onInviteClick={() => setShowInviteModal(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
      />
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        className="flex-1" 
        renderMessage={renderMessage}
        onOpenThread={setThreadMessage}
        onLoadOlder={fetchMore}
        highlightedMessageId={highlightParam}
        scrollToBottomKey={sendTrigger}
      />

      <EnhancedMessageInput
        onSend={handleSendMessage}
        onSendLink={handleSendLink}
        onImageUpload={handleImageUpload}
      />

      {/* Invite User Modal */}
      {channel && id && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          channelId={id}
          channelName={channel.name}
          onInviteSuccess={() => {
            // Refresh members after invite
            api.getChannelMembers(id).then((response) => {
              const membersData = (response as any).data || response;
              setMembers(membersData || []);
            });
          }}
        />
      )}

      {/* Channel Settings Modal */}
      {channel && id && (
        <ChannelSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          channelId={id}
          channelName={channel.name}
          channelDescription={channel.description}
          isAdmin={isAdmin}
          onDeleteSuccess={() => {
            removeChannel(id);
            navigate('/channels');
          }}
        />
      )}
    </div>
  );
}
