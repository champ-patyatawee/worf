import { Server, Socket } from 'socket.io';
import { JwtPayload, MessageWithRelations } from '../types';
import { prisma } from '../config/database';
import { queueEmbedMessage } from '../queues/embeddingProducer';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

const typingTimers: Map<string, NodeJS.Timeout> = new Map();

export function messageHandler(io: Server, socket: AuthenticatedSocket): void {
  const userId = socket.user?.userId;

  /**
   * Join a channel
   */
  socket.on('join_channel', async (channelIdOrName: string) => {
    try {
      // First find channel by id or name
      let channel = await prisma.channel.findUnique({
        where: { id: channelIdOrName },
      });

      if (!channel) {
        channel = await prisma.channel.findUnique({
          where: { name: channelIdOrName },
        });
      }

      if (!channel) {
        socket.emit('error', { message: 'Channel not found' });
        return;
      }

      // For public channels, allow without membership
      if (channel.type === 'public') {
        socket.join(`channel:${channel.id}`);
        console.log(`📢 User ${userId} joined channel ${channel.id} (public)`);
        socket.to(`channel:${channel.id}`).emit('user_joined', {
          userId,
          channelId: channel.id,
        });
        return;
      }

      // For private channels, require membership
      const member = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId: channel.id, userId: userId! },
        },
      });

      if (!member) {
        socket.emit('error', { message: 'Not a member of this channel' });
        return;
      }

      socket.join(`channel:${channel.id}`);
      console.log(`📢 User ${userId} joined channel ${channel.id}`);
      
      socket.to(`channel:${channel.id}`).emit('user_joined', {
        userId,
        channelId: channel.id,
      });
    } catch (error) {
      console.error('Error joining channel:', error);
      socket.emit('error', { message: 'Failed to join channel' });
    }
  });

  /**
   * Leave a channel
   */
  socket.on('leave_channel', async (channelIdOrName: string) => {
    try {
      // Find channel by id or name to get real UUID
      let channel = await prisma.channel.findUnique({
        where: { id: channelIdOrName },
      });

      if (!channel) {
        channel = await prisma.channel.findUnique({
          where: { name: channelIdOrName },
        });
      }

      const targetChannelId = channel?.id || channelIdOrName;
      socket.leave(`channel:${targetChannelId}`);
      console.log(`📤 User ${userId} left channel ${targetChannelId}`);
      
      socket.to(`channel:${targetChannelId}`).emit('user_left', {
        userId,
        channelId: targetChannelId,
      });
    } catch (error) {
      console.error('Error leaving channel:', error);
      // Still try to leave the room directly
      socket.leave(`channel:${channelIdOrName}`);
    }
  });

  /**
   * Send a message to a channel
   */
  socket.on('send_message', async (data: { channelIdOrName: string; content: string; threadId?: string }) => {
    try {
      const { channelIdOrName, content, threadId } = data;

      // First find channel by id or name
      let channel = await prisma.channel.findUnique({
        where: { id: channelIdOrName },
      });

      if (!channel) {
        channel = await prisma.channel.findUnique({
          where: { name: channelIdOrName },
        });
      }

      if (!channel) {
        socket.emit('error', { message: 'Channel not found' });
        return;
      }

      // For public channels, allow without membership
      // For private channels, require membership
      if (channel.type === 'private') {
        const member = await prisma.channelMember.findUnique({
          where: {
            channelId_userId: { channelId: channel.id, userId: userId! },
          },
        });

        if (!member) {
          socket.emit('error', { message: 'Not a member of this channel' });
          return;
        }
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          content,
          channelId: channel.id,
          userId: userId!,
          threadId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
          reactions: true,
        },
      });

      queueEmbedMessage('message', message.id, message.content);

      // Broadcast to all users in the channel (including sender)
      io.to(`channel:${channel.id}`).emit('receive_message', message);

      // Also emit to the sender for confirmation
      socket.emit('message_sent', message);

      console.log(`💬 Message sent by ${userId} in channel ${channel.id}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  /**
   * Start typing indicator
   */
  socket.on('typing_start', async (channelIdOrName: string) => {
    try {
      let channel = await prisma.channel.findUnique({
        where: { id: channelIdOrName },
      });

      if (!channel) {
        channel = await prisma.channel.findUnique({
          where: { name: channelIdOrName },
        });
      }

      const targetChannelId = channel?.id || channelIdOrName;
      const timerKey = `${userId}:${targetChannelId}`;
      
      const existingTimer = typingTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      socket.to(`channel:${targetChannelId}`).emit('typing_start', {
        userId,
        channelId: targetChannelId,
      });

      const timer = setTimeout(() => {
        typingTimers.delete(timerKey);
        socket.to(`channel:${targetChannelId}`).emit('typing_stop', {
          userId,
          channelId: targetChannelId,
        });
      }, 3000);

      typingTimers.set(timerKey, timer);
    } catch (error) {
      console.error('Error in typing_start:', error);
    }
  });

  /**
   * Stop typing indicator
   */
  socket.on('typing_stop', async (channelIdOrName: string) => {
    try {
      let channel = await prisma.channel.findUnique({
        where: { id: channelIdOrName },
      });

      if (!channel) {
        channel = await prisma.channel.findUnique({
          where: { name: channelIdOrName },
        });
      }

      const targetChannelId = channel?.id || channelIdOrName;
      const timerKey = `${userId}:${targetChannelId}`;
      
      const timer = typingTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        typingTimers.delete(timerKey);
      }

      socket.to(`channel:${targetChannelId}`).emit('typing_stop', {
        userId,
        channelId: targetChannelId,
      });
    } catch (error) {
      console.error('Error in typing_stop:', error);
    }
  });

  /**
   * Add reaction to a message
   */
  socket.on('add_reaction', async (data: { messageId: string; emoji: string }) => {
    try {
      const { messageId, emoji } = data;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { channelId: true },
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      const reaction = await prisma.reaction.create({
        data: {
          messageId,
          userId: userId!,
          emoji,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      io.to(`channel:${message.channelId}`).emit('reaction_added', reaction);
      console.log(`✅ Reaction ${emoji} added to message ${messageId}`);
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  /**
   * Remove reaction from a message
   */
  socket.on('remove_reaction', async (data: { messageId: string; emoji: string }) => {
    try {
      const { messageId, emoji } = data;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { channelId: true },
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      await prisma.reaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId: userId!,
            emoji,
          },
        },
      });

      io.to(`channel:${message.channelId}`).emit('reaction_removed', {
        messageId,
        userId,
        emoji,
      });
      console.log(`✅ Reaction ${emoji} removed from message ${messageId}`);
    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  });
}
