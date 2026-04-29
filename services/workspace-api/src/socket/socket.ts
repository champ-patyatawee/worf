import { Server } from 'socket.io';
import { prisma } from '../config/database';

let io: Server | null = null;

// Track online users: userId -> socket info
const onlineUsers = new Map<string, { socketId: string; lastActivity: Date }>();

export function setSocketInstance(socket: Server): void {
  io = socket;
}

export function getSocketInstance(): Server | null {
  return io;
}

export function emitToChannel(channelIdOrName: string, event: string, data: any): void {
  if (!io) return;

  // Find channel by id or name to get the real UUID
  const findChannel = async () => {
    let channel = await prisma.channel.findUnique({
      where: { id: channelIdOrName },
    });

    if (!channel) {
      channel = await prisma.channel.findUnique({
        where: { name: channelIdOrName },
      });
    }

    return channel;
  };

  findChannel().then((channel) => {
    if (channel) {
      io!.to(`channel:${channel.id}`).emit(event, data);
    } else {
      // Fallback: try using the id directly
      io!.to(`channel:${channelIdOrName}`).emit(event, data);
    }
  });
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    const userSocket = onlineUsers.get(userId);
    if (userSocket) {
      io.to(userSocket.socketId).emit(event, data);
    }
  }
}

export function addOnlineUser(userId: string, socketId: string): void {
  onlineUsers.set(userId, { socketId, lastActivity: new Date() });
}

export function removeOnlineUser(userId: string): void {
  onlineUsers.delete(userId);
}

export function updateUserActivity(userId: string): void {
  const user = onlineUsers.get(userId);
  if (user) {
    user.lastActivity = new Date();
  }
}

export async function getOnlineUsers(): Promise<Array<{ userId: string; socketId: string; status: string }>> {
  const userIds = Array.from(onlineUsers.keys());
  
  if (userIds.length === 0) {
    return [];
  }

  // Fetch user statuses from database
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, status: true },
  });

  const usersStatusMap = new Map(users.map(u => [u.id, u.status]));

  return Array.from(onlineUsers.entries()).map(([userId, data]) => ({
    userId,
    socketId: data.socketId,
    status: usersStatusMap.get(userId) || 'offline',
  }));
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

export function emitToDM(senderId: string, recipientId: string, event: string, data: any): void {
  if (!io) return;
  
  // The room name format is dm:userId1:userId2 (sorted alphabetically)
  const roomName = `dm:${[senderId, recipientId].sort().join(':')}`;
  io.to(roomName).emit(event, data);
}
