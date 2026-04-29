import { Server, Socket } from 'socket.io';
import { channelService } from '../services/channelService';

interface AuthenticatedSocket extends Socket {
  user?: { userId: string };
}

export function initializeChannelSocket(io: Server): void {
  const channelNamespace = io.of('/channels');

  channelNamespace.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 Channel socket connected: ${socket.user?.userId} (${socket.id})`);

    socket.on('subscribe_channel', async (channelIdOrName: string) => {
      const userId = socket.user?.userId;
      if (!userId) return;

      const hasAccess = await channelService.canAccessChannel(channelIdOrName, userId);
      if (!hasAccess) {
        socket.emit('error', { message: 'No access to this channel' });
        return;
      }

      // Get real channel UUID for socket room
      const channel = await channelService.get(channelIdOrName, userId);
      if (channel) {
        socket.join(`channel:${channel.id}`);
        console.log(`📡 User ${userId} subscribed to channel ${channel.id}`);
      }
    });

    socket.on('unsubscribe_channel', async (channelIdOrName: string) => {
      try {
        const channel = await channelService.get(channelIdOrName);
        if (channel) {
          socket.leave(`channel:${channel.id}`);
        } else {
          socket.leave(`channel:${channelIdOrName}`);
        }
        console.log(`📡 User ${socket.user?.userId} unsubscribed from channel ${channelIdOrName}`);
      } catch {
        socket.leave(`channel:${channelIdOrName}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`👋 Channel socket disconnected: ${socket.user?.userId}`);
    });
  });
}

export function broadcastChannelCreated(io: Server, channel: any): void {
  const event = {
    type: 'channel_created',
    channel,
  };

  if (channel.type === 'public') {
    io.emit('channel_created', event);
  } else {
    io.of('/channels').emit('channel_created', event);
  }
}

export function broadcastChannelUpdated(io: Server, channel: any): void {
  const event = {
    type: 'channel_updated',
    channel,
  };

  if (channel.type === 'public') {
    io.emit('channel_updated', event);
  } else {
    io.of('/channels').to(`channel:${channel.id}`).emit('channel_updated', event);
  }
}

export function broadcastChannelDeleted(io: Server, channelId: string, channelType: string): void {
  const event = {
    type: 'channel_deleted',
    channelId,
  };

  if (channelType === 'public') {
    io.emit('channel_deleted', event);
  } else {
    io.of('/channels').emit('channel_deleted', event);
  }
}

export function broadcastMemberInvited(io: Server, channelId: string, channelType: string, userId: string): void {
  const event = {
    type: 'member_invited',
    channelId,
    userId,
  };

  if (channelType === 'public') {
    io.emit('member_invited', event);
  } else {
    io.of('/channels').to(`channel:${channelId}`).emit('member_invited', event);
  }
}

export function broadcastMemberRemoved(io: Server, channelId: string, channelType: string, userId: string): void {
  const event = {
    type: 'member_removed',
    channelId,
    userId,
  };

  if (channelType === 'public') {
    io.emit('member_removed', event);
  } else {
    io.of('/channels').to(`channel:${channelId}`).emit('member_removed', event);
  }
}
