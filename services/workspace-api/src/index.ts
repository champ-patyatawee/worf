import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { connectDatabase, prisma } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeSocket } from './socket';

// Import routes
import authRoutes from './routes/auth';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import userRoutes from './routes/users';
import dmRoutes from './routes/dm';
import chatImageRoutes from './routes/chatImages';
import agentRoutes from './routes/agents';
import aiProviderRoutes from './routes/aiProviders';
import searchRoutes from './routes/search';
import embeddingsRoutes from './routes/embeddings';
import toolRoutes from './routes/tools';

// Register built-in tools (auto-registers on import)
import './tools/webfetch';
import './tools/imageGen';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    success: true, 
    message: 'workspace API server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/chat', chatImageRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/ai-providers', aiProviderRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/embeddings', embeddingsRoutes);
app.use('/api/tools', toolRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Socket.io
initializeSocket(io);

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 workspace Server is running!                           ║
║                                                          ║
║   📍 Local:      http://localhost:${config.port}                    ║
║   🌐 Environment: ${config.nodeEnv.padEnd(40)}║
║                                                          ║
║   📡 WebSocket:  ws://localhost:${config.port}              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      await prisma.$disconnect();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Shutting down gracefully...');
      await prisma.$disconnect();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, io };
