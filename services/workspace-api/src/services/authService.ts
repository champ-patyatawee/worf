import { prisma } from '../config/database';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../utils';
import { RegisterInput, LoginInput, JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        status: 'online',
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });

    // Ensure default channels exist
    const defaultChannelData = [
      { id: 'general', name: 'general', description: 'General discussions and announcements', type: 'public' as const },
      { id: 'random', name: 'random', description: 'Random conversations and off-topic discussions', type: 'public' as const },
      { id: 'engineering', name: 'engineering', description: 'Engineering team discussions', type: 'public' as const },
    ];

    for (const channelData of defaultChannelData) {
      await prisma.channel.upsert({
        where: { id: channelData.id },
        update: {},
        create: channelData,
      });
    }

    // Add new user to default channels
    await prisma.channelMember.createMany({
      data: defaultChannelData.map((channel) => ({
        channelId: channel.id,
        userId: user.id,
      })),
      skipDuplicates: true,
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    return { user, token };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isValidPassword = await comparePassword(input.password, user.password);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Ensure default channels exist and user is a member
    await this.ensureDefaultChannels(user.id);

    // Update user status to online
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' },
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  private async ensureDefaultChannels(userId: string) {
    const defaultChannelData = [
      { id: 'general', name: 'general', description: 'General discussions and announcements', type: 'public' as const },
      { id: 'random', name: 'random', description: 'Random conversations and off-topic discussions', type: 'public' as const },
      { id: 'engineering', name: 'engineering', description: 'Engineering team discussions', type: 'public' as const },
    ];

    for (const channelData of defaultChannelData) {
      await prisma.channel.upsert({
        where: { id: channelData.id },
        update: {},
        create: channelData,
      });

      await prisma.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId: channelData.id,
            userId,
          },
        },
        update: {},
        create: {
          channelId: channelData.id,
          userId,
        },
      });
    }
  }

  async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'offline' },
    });
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  verifyToken(token: string): JwtPayload {
    return verifyToken(token);
  }
}

export const authService = new AuthService();
