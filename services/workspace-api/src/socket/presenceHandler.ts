import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../types';
import { prisma } from '../config/database';
import { UserStatus } from '@prisma/client';
import { addOnlineUser, removeOnlineUser, updateUserActivity, getOnlineUserIds } from './socket';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

// Idle timeout thresholds (in milliseconds)
const AWAY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const OFFLINE_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Debounce threshold for presence updates (ms)
const PRESENCE_DEBOUNCE = 500;

// Track user activity timestamps
const lastActivityMap = new Map<string, Date>();

// Track pending presence updates for batching
const pendingPresenceUpdates = new Map<string, { status: UserStatus; timer: NodeJS.Timeout }>();

export async function presenceHandler(io: Server, socket: AuthenticatedSocket): Promise<void> {
  const userId = socket.user?.userId;

  // Track online user when connected
  if (userId) {
    addOnlineUser(userId, socket.id);
    lastActivityMap.set(userId, new Date());
  }

  /**
   * Update user presence status (with debouncing for rapid changes)
   */
  socket.on('update_presence', async (status: UserStatus) => {
    try {
      // Validate status
      if (!['online', 'offline', 'busy', 'away'].includes(status)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }

      // Debounce rapid status changes
      const existingUpdate = pendingPresenceUpdates.get(userId!);
      if (existingUpdate) {
        clearTimeout(existingUpdate.timer);
      }

      const timer = setTimeout(async () => {
        pendingPresenceUpdates.delete(userId!);
        await broadcastPresenceUpdate(io, userId!, status);
      }, PRESENCE_DEBOUNCE);

      pendingPresenceUpdates.set(userId!, { status, timer });
    } catch (error) {
      console.error('Error updating presence:', error);
      socket.emit('error', { message: 'Failed to update presence' });
    }
  });

  /**
   * Activity ping to reset idle timer
   */
  socket.on('activity_ping', () => {
    if (userId) {
      lastActivityMap.set(userId, new Date());
      updateUserActivity(userId);
    }
  });

  // On connection, set user to online and broadcast to all clients
  if (userId) {
    try {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { status: 'online' },
      });
      io.emit('presence_update', {
        userId,
        status: 'online',
      });
      console.log(`📊 User ${userId} connected and is now online`);
    } catch (error) {
      console.error(`Failed to update presence on connect for user ${userId}:`, error);
      // Remove from online users if DB update fails
      removeOnlineUser(userId);
    }
  }

  // Remove from online users on disconnect
  socket.on('disconnect', () => {
    if (userId) {
      // Clear any pending presence update
      const pendingUpdate = pendingPresenceUpdates.get(userId);
      if (pendingUpdate) {
        clearTimeout(pendingUpdate.timer);
        pendingPresenceUpdates.delete(userId);
      }
      removeOnlineUser(userId);
      lastActivityMap.delete(userId);
    }
  });
}

/**
 * Broadcast presence update to all connected clients
 */
async function broadcastPresenceUpdate(io: Server, userId: string, status: UserStatus): Promise<void> {
  try {
    // Update user status in database
    await prisma.user.updateMany({
      where: { id: userId },
      data: { status },
    });

    // Update last activity
    lastActivityMap.set(userId, new Date());
    updateUserActivity(userId);

    // Broadcast presence update to all connected clients
    io.emit('presence_update', {
      userId,
      status,
    });

    console.log(`📊 User ${userId} is now ${status}`);
  } catch (error) {
    console.error('Error broadcasting presence update:', error);
  }
}

/**
 * Periodic cleanup to mark stale connections as away/offline
 * Should be called every minute by the server
 */
export function startIdleTimeoutChecker(io: Server): NodeJS.Timeout {
  return setInterval(async () => {
    const now = new Date();
    const onlineUserIds = getOnlineUserIds();

    for (const userId of onlineUserIds) {
      const lastActivity = lastActivityMap.get(userId);
      if (!lastActivity) continue;

      const idleTime = now.getTime() - lastActivity.getTime();

      try {
        if (idleTime >= OFFLINE_TIMEOUT) {
          // Mark as offline after 1 hour of inactivity
          await prisma.user.updateMany({
            where: { id: userId },
            data: { status: 'offline' },
          });
          io.emit('presence_update', {
            userId,
            status: 'offline',
          });
          removeOnlineUser(userId);
          lastActivityMap.delete(userId);
          console.log(`📊 User ${userId} marked offline due to inactivity`);
        } else if (idleTime >= AWAY_TIMEOUT) {
          // Mark as away after 15 minutes of inactivity
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user && user.status !== 'away' && user.status !== 'busy' && user.status !== 'offline') {
            await prisma.user.updateMany({
              where: { id: userId },
              data: { status: 'away' },
            });
            io.emit('presence_update', {
              userId,
              status: 'away',
            });
            console.log(`📊 User ${userId} marked away due to inactivity`);
          }
        }
      } catch (error) {
        console.error(`Error checking idle status for user ${userId}:`, error);
      }
    }
  }, 60 * 1000); // Run every minute
}
