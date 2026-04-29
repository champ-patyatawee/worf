import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class DmService {
  /**
   * Get or create a DM conversation between two users
   * Returns conversation info with participant details
   */
  async getOrCreateConversation(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new AppError(400, 'Cannot create a DM with yourself');
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, email: true, avatar: true, status: true },
    });

    if (!recipient) {
      throw new AppError(404, 'Recipient not found');
    }

    const lastMessage = await prisma.directMessage.findFirst({
      where: {
        OR: [
          { userId, recipientId },
          { userId: recipientId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true, status: true },
        },
      },
    });

    const unreadCount = await this.getUnreadCount(userId, recipientId);

    return {
      participant: recipient,
      lastMessage: lastMessage ? { ...lastMessage, user: lastMessage.sender } : null,
      unreadCount,
      createdAt: lastMessage?.createdAt || new Date(),
    };
  }

  /**
   * List all DM conversations for a user
   * Returns the most recent message with each unique conversation partner
   */
  async listConversations(userId: string) {
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true, status: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, avatar: true, status: true },
        },
      },
    });

    const conversationMap = new Map<string, any>();

    for (const message of messages) {
      const partnerId = message.userId === userId ? message.recipientId : message.userId;
      const partner = message.userId === userId ? message.recipient : message.sender;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: { ...message, user: message.sender },
          unreadCount: 0,
          updatedAt: message.createdAt,
        });
      }
    }

    const results = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const unreadCount = await this.getUnreadCount(userId, conv.partnerId);
        return { ...conv, unreadCount };
      })
    );

    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return results;
  }

  /**
   * Get unread DM count between two users
   */
  async getUnreadCount(userId: string, otherUserId: string): Promise<number> {
    return prisma.directMessage.count({
      where: {
        userId: otherUserId,
        recipientId: userId,
        readAt: null,
      },
    });
  }

  /**
   * Mark all messages in a DM conversation as read
   */
  async markAsRead(userId: string, otherUserId: string): Promise<void> {
    await prisma.directMessage.updateMany({
      where: {
        userId: otherUserId,
        recipientId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark a specific DM message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    if (message.recipientId !== userId) {
      throw new AppError(403, 'Not authorized');
    }

    await prisma.directMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }
}

export const dmService = new DmService();
