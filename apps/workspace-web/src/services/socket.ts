import { io, Socket } from 'socket.io-client';
import type { Channel, Message, PresenceUpdate } from '@/types';

// Connect to socket.io on the same origin. Vite proxy routes it to the backend.
const WS_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

export type SocketEventHandler = (...args: unknown[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[DEBUG] Main socket connected');
      this.emit('request_presence_sync');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[DEBUG] Main socket disconnected:', reason);
    });

    this.socket.on('error', (error: Error) => {
      console.error('[DEBUG] Main socket error:', error);
    });

    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, handler: SocketEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);
    this.socket?.on(event, handler);
  }

  off(event: string, handler: SocketEventHandler): void {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.socket?.emit(event, ...args);
  }

  // Channel events
  joinChannel(channelId: string): void {
    this.emit('join_channel', channelId);
  }

  leaveChannel(channelId: string): void {
    this.emit('leave_channel', channelId);
  }

  sendMessage(channelId: string, content: string): void {
    this.emit('send_message', { channelId, content });
  }

  // DM events
  joinDM(userId: string): void {
    this.emit('join_dm', { partnerId: userId });
  }

  leaveDM(userId: string): void {
    this.emit('leave_dm', { partnerId: userId });
  }

  sendDM(userId: string, content: string): void {
    this.emit('send_dm', { userId, content });
  }

  markDMAsRead(messageId: string): void {
    this.emit('mark_dm_read', { messageId });
  }

  onNewDMMessage(handler: (message: any) => void): void {
    this.on('new_dm_message', handler as SocketEventHandler);
  }

  offNewDMMessage(handler: (message: any) => void): void {
    this.off('new_dm_message', handler as SocketEventHandler);
  }

  onDMRead(handler: (data: { messageId: string; readAt: string }) => void): void {
    this.on('dm_read', handler as SocketEventHandler);
  }

  offDMRead(handler: (data: { messageId: string; readAt: string }) => void): void {
    this.off('dm_read', handler as SocketEventHandler);
  }

  // Reaction events
  addReaction(messageId: string, emoji: string): void {
    this.emit('add_reaction', { messageId, emoji });
  }

  removeReaction(messageId: string, emoji: string): void {
    this.emit('remove_reaction', { messageId, emoji });
  }

  onReactionAdded(handler: (reaction: any) => void): void {
    this.on('reaction_added', handler as SocketEventHandler);
  }

  offReactionAdded(handler: (reaction: any) => void): void {
    this.off('reaction_added', handler as SocketEventHandler);
  }

  onReactionRemoved(handler: (data: { messageId: string; userId: string; emoji: string }) => void): void {
    this.on('reaction_removed', handler as SocketEventHandler);
  }

  offReactionRemoved(handler: (data: { messageId: string; userId: string; emoji: string }) => void): void {
    this.off('reaction_removed', handler as SocketEventHandler);
  }

  // Presence events
  updatePresence(status: string): void {
    this.emit('update_presence', status);
  }

  // Typing indicators
  startTyping(channelId: string): void {
    this.emit('typing:start', { channelId });
  }

  stopTyping(channelId: string): void {
    this.emit('typing:stop', { channelId });
  }
}

export const socketService = new SocketService();

// Typed event handlers for use in components
export interface SocketEvents {
  'message:new': (message: Message) => void;
  'message:update': (message: Message) => void;
  'message:delete': (messageId: string) => void;
  'presence:update': (update: PresenceUpdate) => void;
  'typing:start': (data: { channelId: string; userId: string }) => void;
  'typing:stop': (data: { channelId: string; userId: string }) => void;
  'channel:update': (channel: Channel) => void;
  'new_dm_message': (message: Message) => void;
}
