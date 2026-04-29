import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils';
import { JwtPayload } from '../types';
import { messageHandler } from './messageHandler';
import { dmHandler } from './dmHandler';
import { presenceHandler, startIdleTimeoutChecker } from './presenceHandler';
import { setSocketInstance, getOnlineUsers } from './socket';
import { initializeChannelSocket } from './channelHandler';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

// Extended error interface for socket.io
interface ExtendedError extends Error {
  message: string;
}

export function initializeSocket(io: Server): void {
  setSocketInstance(io);
  
  // Middleware for authentication
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      const err: ExtendedError = new Error('Authentication required');
      err.message = 'No authentication token provided';
      return next(err);
    }

    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (error) {
      const err: ExtendedError = new Error('Invalid authentication token');
      return next(err);
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`✅ User connected: ${socket.user?.userId} (${socket.id})`);

    // Initialize handlers
    messageHandler(io, socket);
    dmHandler(io, socket);
    await presenceHandler(io, socket);

    // Emit current user's status and list of online users to newly connected client
    const onlineUsers = await getOnlineUsers();
    socket.emit('online_users', onlineUsers);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`👋 User disconnected: ${socket.user?.userId} (${reason})`);
      
      // Broadcast offline status
      io.emit('presence_update', {
        userId: socket.user?.userId,
        status: 'offline',
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${socket.user?.userId}:`, error);
    });
  });

  // Start idle timeout checker (marks stale users as away/offline)
  startIdleTimeoutChecker(io);

  // Initialize Channel WebSocket handler (uses /channels namespace)
  initializeChannelSocket(io);

  console.log('🔌 Socket.io initialized');
}
