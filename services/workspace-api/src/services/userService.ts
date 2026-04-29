import { prisma } from '../config/database';
import { UpdateStatusInput } from '../types';
import { AppError } from '../middleware/errorHandler';
import { emitToUser } from '../socket/socket';

export class UserService {
  async list() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }

  async get(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        channels: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async updateStatus(id: string, input: UpdateStatusInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: input.status },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    return updatedUser;
  }

  async getPresence(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async search(query: string) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
      take: 20,
    });

    return users;
  }

  async listOnline() {
    const users = await prisma.user.findMany({
      where: { status: 'online' },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }

  async getPresenceBulk(userIds: string[]) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        status: true,
      },
    });

    return users;
  }

  async getDirectMessages(userId: string, otherUserId: string, pagination?: { before?: string; after?: string; limit?: number }) {
    const [user, otherUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: otherUserId } }),
    ]);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!otherUser) {
      throw new AppError(404, 'Recipient not found');
    }

    const limit = Math.min(pagination?.limit || 5, 100);
    const before = pagination?.before;
    const after = pagination?.after;

    const where: any = {
      OR: [
        { userId, recipientId: otherUserId },
        { userId: otherUserId, recipientId: userId },
      ],
    };

    if (before) {
      where.createdAt = { lt: new Date(before) };
    }
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const orderBy = after ? { createdAt: 'asc' as const } : { createdAt: 'desc' as const };

    const messages = await prisma.directMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chatImages: true,
      },
      orderBy,
      take: limit,
    });

    if (after) {
      messages.reverse();
    } else {
      messages.reverse();
    }

    // Map sender -> user for frontend compatibility
    const mappedMessages = messages.map((msg) => ({
      ...msg,
      user: msg.sender,
      userId: msg.userId,
    }));

    const hasMore = messages.length === limit;

    return {
      messages: mappedMessages,
      pagination: {
        hasMore,
      },
    };
  }

  async sendDirectMessage(userId: string, recipientId: string, content: string, imageIds?: string[]) {
    // Require either content or images
    if ((!content || typeof content !== 'string' || content.trim().length === 0) && (!imageIds || imageIds.length === 0)) {
      throw new AppError(400, 'Content or images are required');
    }

    if (content && content.length > 10000) {
      throw new AppError(400, 'Content too long');
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new AppError(404, 'Recipient not found');
    }

    const message = await prisma.directMessage.create({
      data: {
        content: content || '',
        userId,
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
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Link images to the message if imageIds are provided
    if (imageIds && imageIds.length > 0) {
      await prisma.chatImage.updateMany({
        where: {
          id: { in: imageIds },
          userId,
        },
        data: {
          dmMessageId: message.id,
        },
      });
    }

    // Refetch message with updated images
    const messageWithImages = await prisma.directMessage.findUnique({
      where: { id: message.id },
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
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chatImages: true,
      },
    });

    // Map sender -> user for frontend compatibility
    const response = {
      ...messageWithImages,
      user: messageWithImages?.sender,
    };

    // Broadcast to recipient via WebSocket if they're online
    emitToUser(recipientId, 'new_dm_message', response);

    return response;
  }
}

export const userService = new UserService();
