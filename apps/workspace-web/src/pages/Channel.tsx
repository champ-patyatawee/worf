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
      // Check for agent mention first (before sending as regular message)
      const agentMatch = content.match(/^@(\w+)\s+(.+)$/);
      if (agentMatch && !uploads?.length) {
        const agentName = agentMatch[1];
        const task = agentMatch[2].trim();
        
        // Get conversation history (last 4 messages = 2 user + 2 agent)
        const allMessages = useMessageStore.getState().messages[id] || [];
        const history: { role: string; content: string }[] = [];
        const recentMsgs = allMessages.slice(-4);
        console.log('[Channel] Debug - recentMsgs:', recentMsgs.length, recentMsgs.map(m => ({ 
          userId: m.user?.id, 
          userEmail: m.user?.email, 
          userRole: m.user?.role,
          content: m.content?.substring(0, 30) 
        })));
        for (const msg of recentMsgs) {
          const msgUser = msg.user;
          // Check if it's a user message mentioning the agent
          if (msgUser?.id === currentUserId && msg.content.startsWith(`@${agentName}`)) {
            history.push({ role: 'user', content: msg.content.replace(/^@\w+\s+/, '') });
            console.log('[Channel] Added user msg:', msg.content.substring(0, 30));
          } 
          // Check if it's an agent message (by email prefix or role)
          else if (msgUser?.email?.startsWith('agent-') || msgUser?.role === 'agent') {
            history.push({ role: 'assistant', content: msg.content });
            console.log('[Channel] Added agent msg:', msg.content.substring(0, 30));
          }
        }
        console.log('[Channel] History:', history.length, 'messages', history.map(h => `${h.role}: ${h.content.substring(0, 20)}`));
        
        // Send user message (opens thread in UI)
        const response = await api.sendMessage(id, content);
        let responseData = (response as any).data;
        if (!responseData && (response as any).id) responseData = response;
        
        // Open thread view if message was created
        if (responseData?.id) {
          setThreadMessage(responseData);
          
          // Stream agent response to thread via API (which saves to database)
          const { streamAgentChat } = await import('@/services/agentService');
          try {
            await streamAgentChat(agentName, task, history, (chunk, done) => {
              // For now, still show in main channel as fallback
              // The API will save to thread in database
              if (done) return;
              const msgs = useMessageStore.getState().messages[id] || [];
              const existingAgent = msgs.find(m => m.user?.id === 'agent' && m.content);
              if (!existingAgent) {
                useMessageStore.getState().addMessage(id, {
                  id: `agent-${responseData.id}`,
                  content: chunk,
                  user: { id: 'agent', name: agentName },
                  channelId: id,
                  createdAt: new Date().toISOString(),
                  isError: false,
                });
              }
            }, responseData.id, id); // Pass threadId and channelId
            
            // Refresh thread after agent responds (real-time update)
            setTimeout(() => {
              setThreadMessage((prev: any) => prev ? { ...prev } : null);
            }, 500);
          } catch (err: any) {
            console.error('[Agent] Error:', err.message);
          }
        }
        
        return;
      }
      
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
