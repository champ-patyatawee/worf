import { Server, Socket } from 'socket.io';
import { JwtPayload, DirectMessageWithRelations } from '../types';
import { prisma } from '../config/database';
import { emitToUser } from './socket';
import { queueEmbedMessage } from '../queues/embeddingProducer';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export function dmHandler(io: Server, socket: AuthenticatedSocket): void {
  const userId = socket.user?.userId;

  /**
   * Join a DM "room" for real-time updates with a specific user
   */
  socket.on('join_dm', async (data: { partnerId: string }) => {
    try {
      const { partnerId } = data;
      
      if (!partnerId) {
        socket.emit('error', { message: 'partnerId is required' });
        return;
      }

      const roomName = `dm:${[userId, partnerId].sort().join(':')}`;
      socket.join(roomName);
      
      console.log(`💬 ${userId} joined DM room: ${roomName}`);
      socket.emit('dm_joined', { roomName, partnerId });
    } catch (error) {
      console.error('Error joining DM room:', error);
      socket.emit('error', { message: 'Failed to join DM room' });
    }
  });

  /**
   * Leave a DM "room"
   */
  socket.on('leave_dm', async (data: { partnerId: string }) => {
    try {
      const { partnerId } = data;
      
      if (!partnerId) {
        socket.emit('error', { message: 'partnerId is required' });
        return;
      }

      const roomName = `dm:${[userId, partnerId].sort().join(':')}`;
      socket.leave(roomName);
      
      console.log(`💬 ${userId} left DM room: ${roomName}`);
      socket.emit('dm_left', { roomName, partnerId });
    } catch (error) {
      console.error('Error leaving DM room:', error);
      socket.emit('error', { message: 'Failed to leave DM room' });
    }
  });

  /**
   * Send a direct message via WebSocket
   */
  socket.on('send_dm', async (data: { recipientId: string; content: string }) => {
    try {
      const { recipientId, content } = data;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        socket.emit('error', { message: 'Content is required' });
        return;
      }

      if (content.length > 10000) {
        socket.emit('error', { message: 'Content too long' });
        return;
      }

      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });

      if (!recipient) {
        socket.emit('error', { message: 'Recipient not found' });
        return;
      }

      const message = await prisma.directMessage.create({
        data: {
          content,
          userId: userId!,
          recipientId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              status: true,
            },
          },
        },
      });

      queueEmbedMessage('directMessage', message.id, message.content);

      const response = { ...message, user: message.sender };

      const dmRoom = `dm:${[userId, recipientId].sort().join(':')}`;
      io.to(dmRoom).emit('new_dm_message', response);
      emitToUser(recipientId, 'new_dm_message', response);
      socket.emit('dm_sent', response);

      console.log(`💬 DM sent from ${userId} to ${recipientId}`);
    } catch (error) {
      console.error('Error sending DM:', error);
      socket.emit('error', { message: 'Failed to send direct message' });
    }
  });

  /**
   * Mark direct messages as read
   */
  socket.on('mark_dm_read', async (data: { messageId: string }) => {
    try {
      const { messageId } = data;

      const message = await prisma.directMessage.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      if (message.recipientId !== userId) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      await prisma.directMessage.update({
        where: { id: messageId },
        data: { readAt: new Date() },
      });

      emitToUser(message.userId, 'dm_read', {
        messageId,
        readAt: new Date(),
      });

      console.log(`✅ DM ${messageId} marked as read by ${userId}`);
    } catch (error) {
      console.error('Error marking DM as read:', error);
      socket.emit('error', { message: 'Failed to mark message as read' });
    }
  });

  /**
   * Typing indicator
   */
  socket.on('dm_typing', (data: { recipientId: string }) => {
    const { recipientId } = data;
    const dmRoom = `dm:${[userId, recipientId].sort().join(':')}`;
    socket.to(dmRoom).emit('dm_typing', { userId, recipientId });
  });

  /**
   * Stop typing indicator
   */
  socket.on('dm_stop_typing', (data: { recipientId: string }) => {
    const { recipientId } = data;
    const dmRoom = `dm:${[userId, recipientId].sort().join(':')}`;
    socket.to(dmRoom).emit('dm_stop_typing', { userId, recipientId });
  });
}
