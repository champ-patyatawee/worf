import { prisma } from '../config/database';
import { SendMessageInput, AddReactionInput } from '../types';
import { AppError } from '../middleware/errorHandler';
import { queueEmbedMessage } from '../queues/embeddingProducer';

export class MessageService {
  private async findChannel(idOrName: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    return channel;
  }

  async getChannelMessages(channelIdOrName: string, before?: string, after?: string, limit = 5) {
    const channel = await this.findChannel(channelIdOrName);
    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    const where: any = { channelId: channel.id };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }
    if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const orderBy = after
      ? { createdAt: 'asc' as const }
      : { createdAt: 'desc' as const };

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        chatImages: true,
        _count: {
          select: { replies: true },
        },
      },
      orderBy,
      take: limit,
    });

    const hasMore = messages.length === limit;

    return {
      messages,
      pagination: {
        hasMore,
      },
    };
  }

  async getMessage(messageId: string) {
    // First check if it's a channel message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        chatImages: true,
        _count: {
          select: { replies: true },
        },
      },
    });

    if (message) {
      return message;
    }

    // Check if it's a DM message
    const dmMessage = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        chatImages: true,
      },
    });

    if (dmMessage) {
      return {
        id: dmMessage.id,
        content: dmMessage.content,
        channelId: null,
        userId: dmMessage.userId,
        user: dmMessage.sender,
        threadId: null,
        createdAt: dmMessage.createdAt,
        updatedAt: dmMessage.createdAt,
        reactions: [],
        images: dmMessage.chatImages,
        threadCount: 0,
        recipientId: dmMessage.recipientId,
      };
    }

    throw new AppError(404, 'Message not found');
  }

  async sendMessage(channelIdOrName: string, userId: string, input: SendMessageInput) {
    const channel = await this.findChannel(channelIdOrName);

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    // For private channels, require membership; public channels allow anyone to send
    if (channel.type === 'private') {
      const member = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId: channel.id, userId },
        },
      });

      if (!member) {
        throw new AppError(403, 'You must be a member of this channel to send messages');
      }
    }

    if (!input.content?.trim() && (!input.imageIds || input.imageIds.length === 0)) {
      throw new AppError(400, 'Message must have content or images');
    }

    const message = await prisma.message.create({
      data: {
        content: input.content || '',
        channelId: channel.id,
        userId,
        threadId: input.threadId,
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
        chatImages: true,
      },
    });

    queueEmbedMessage('message', message.id, message.content);

    // Link images to the message if imageIds are provided
    if (input.imageIds && input.imageIds.length > 0) {
      await prisma.chatImage.updateMany({
        where: {
          id: { in: input.imageIds },
          userId,
        },
        data: {
          messageId: message.id,
        },
      });

      // Refetch message with updated images
      const messageWithImages = await prisma.message.findUnique({
        where: { id: message.id },
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
          chatImages: true,
        },
      });

      return messageWithImages;
    }

    return message;
  }

  async getThread(messageId: string) {
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        chatImages: true,
      },
    });

    if (!parentMessage) {
      throw new AppError(404, 'Message not found');
    }

    const replies = await prisma.message.findMany({
      where: { threadId: messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        chatImages: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      parent: parentMessage,
      replies,
    };
  }

  async addReaction(messageId: string, userId: string, input: AddReactionInput) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: input.emoji,
        },
      },
    });

    if (existingReaction) {
      throw new AppError(409, 'Reaction already exists');
    }

    const reaction = await prisma.reaction.create({
      data: {
        emoji: input.emoji,
        messageId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reaction;
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    if (!emoji) {
      throw new AppError(400, 'Emoji is required');
    }

    const reaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (!reaction) {
      throw new AppError(404, 'Reaction not found');
    }

    await prisma.reaction.delete({
      where: { id: reaction.id },
    });

    return { message: 'Reaction removed successfully' };
  }

  async sendDMMessage(senderId: string, recipientId: string, input: SendMessageInput) {
    if (!input.content?.trim()) {
      throw new AppError(400, 'Message must have content');
    }

    const message = await prisma.message.create({
      data: {
        content: input.content,
        userId: senderId,
        recipientId: recipientId,
        channelId: null,
        threadId: input.threadId,
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
        chatImages: true,
      },
    });

    return message;
  }

  async sendDMMessage(userId: string, recipientId: string, content: string) {
    if (!content?.trim()) {
      throw new AppError(400, 'Message must have content');
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        userId,
        recipientId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, status: true }
        },
        recipient: {
          select: { id: true, name: true, email: true }
        },
        chatImages: true,
      },
    });

    return { ...message, user: message.sender };
  }
}

export const messageService = new MessageService();
