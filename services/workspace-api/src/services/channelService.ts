import { prisma } from '../config/database';
import { CreateChannelInput, UpdateChannelInput } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ChannelService {
  private async findChannelByIdOrName(idOrName: string) {
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

  async canAccessChannel(idOrName: string, userId: string): Promise<boolean> {
    const channel = await this.findChannelByIdOrName(idOrName);

    if (!channel) return false;
    if (channel.type === 'public') return true;
    
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId } },
    });
    return !!membership;
  }

  async isAdmin(idOrName: string, userId: string): Promise<boolean> {
    const channel = await this.findChannelByIdOrName(idOrName);
    if (!channel) return false;
    
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId } },
    });
    return membership?.role === 'admin';
  }

  async list(userId?: string) {
    const channels = await prisma.channel.findMany({
      where: userId ? {
        OR: [
          { type: 'public' },
          { members: { some: { userId } } },
        ],
      } : { type: 'public' },
      include: {
        members: {
          where: userId ? { userId } : undefined,
        },
        _count: {
          select: { messages: true, members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return channels;
  }

  async create(input: CreateChannelInput, userId: string) {
    const existingChannel = await prisma.channel.findUnique({
      where: { name: input.name },
    });

    if (existingChannel) {
      throw new AppError(409, 'A channel with this name already exists');
    }

    if (!/^[a-z0-9-]+$/.test(input.name)) {
      throw new AppError(400, 'Channel name must contain only lowercase letters, numbers, and hyphens');
    }

    const channel = await prisma.channel.create({
      data: {
        name: input.name,
        description: input.description,
        type: input.type || 'public',
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        members: true,
      },
    });

    return channel;
  }

  async get(idOrName: string, userId?: string) {
    // Try to find by id first (UUID format), then by name (slug)
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // If not found by id, try by name (for slug-based URLs)
    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    if (channel.type === 'private' && userId) {
      const hasAccess = await this.canAccessChannel(channel.id, userId);
      if (!hasAccess) {
        throw new AppError(403, 'You do not have access to this private channel');
      }
    }

    return channel;
  }

  async update(idOrName: string, input: UpdateChannelInput) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    if (input.name && input.name !== channel.name) {
      const existingChannel = await prisma.channel.findUnique({
        where: { name: input.name },
      });

      if (existingChannel) {
        throw new AppError(409, 'A channel with this name already exists');
      }
    }

    const updatedChannel = await prisma.channel.update({
      where: { id: channel.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
      include: {
        members: true,
      },
    });

    return updatedChannel;
  }

  async delete(idOrName: string, userId: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    const admin = await this.isAdmin(channel.id, userId);
    if (!admin) {
      throw new AppError(403, 'Only admins can delete this channel');
    }

    await prisma.channel.delete({
      where: { id: channel.id },
    });

    return { message: 'Channel deleted successfully' };
  }

  async join(idOrName: string, userId: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    if (channel.type === 'private') {
      throw new AppError(403, 'Cannot join private channel. You need to be invited.');
    }

    const existingMember = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId: channel.id, userId },
      },
    });

    if (existingMember) {
      throw new AppError(409, 'Already a member of this channel');
    }

    await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId,
        role: 'member',
      },
    });

    return { message: 'Joined channel successfully' };
  }

  async leave(idOrName: string, userId: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    const existingMember = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId: channel.id, userId },
      },
    });

    if (!existingMember) {
      throw new AppError(404, 'Not a member of this channel');
    }

    await prisma.channelMember.delete({
      where: {
        channelId_userId: { channelId: channel.id, userId },
      },
    });

    return { message: 'Left channel successfully' };
  }

  async invite(idOrName: string, targetUserId: string, userId: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    // Allow any member to invite (both admins and regular members)
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId } },
    });

    if (!member) {
      throw new AppError(403, 'Only members can invite users to this channel');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found');
    }

    const existingMember = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId: channel.id, userId: targetUserId },
      },
    });

    if (existingMember) {
      throw new AppError(409, 'User is already a member of this channel');
    }

    await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: targetUserId,
        role: 'member',
      },
    });

    return { message: 'User invited successfully' };
  }

  async removeMember(idOrName: string, targetUserId: string, userId: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    const admin = await this.isAdmin(channel.id, userId);
    if (!admin) {
      throw new AppError(403, 'Only admins can remove users from this channel');
    }

    const targetMember = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId: channel.id, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new AppError(404, 'User is not a member of this channel');
    }

    if (targetMember.role === 'admin') {
      throw new AppError(403, 'Cannot remove an admin from the channel');
    }

    await prisma.channelMember.delete({
      where: {
        channelId_userId: { channelId: channel.id, userId: targetUserId },
      },
    });

    return { message: 'User removed from channel successfully' };
  }

  async getMembers(idOrName: string) {
    let channel = await prisma.channel.findUnique({
      where: { id: idOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: idOrName },
      });
    }

    if (!channel) {
      throw new AppError(404, 'Channel not found');
    }

    const members = await prisma.channelMember.findMany({
      where: { channelId: channel.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return members;
  }
}

export const channelService = new ChannelService();
