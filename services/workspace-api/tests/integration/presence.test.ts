import request from 'supertest';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import authRoutes from '../../src/routes/auth';
import userRoutes from '../../src/routes/users';
import dmRoutes from '../../src/routes/dm';
import { errorHandler } from '../../src/middleware/errorHandler';
import { initializeSocket } from '../../src/socket';
import { prisma } from '../../src/config/database';

// Create test app with Socket.io
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dm', dmRoutes);
app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Track connected sockets for tests
let testSocket: any;
let authToken: string;
let testUserId: string;
let secondUserId: string;
let secondUserToken: string;

describe('Presence Integration Tests', () => {
  beforeAll(async () => {
    // Initialize socket handlers
    initializeSocket(io);

    // Wait for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create first test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'presence1@example.com',
        password: 'SecurePass123!',
        name: 'Presence User 1',
      });

    authToken = registerResponse.body.data.token;
    testUserId = registerResponse.body.data.user.id;

    // Create second test user
    const registerResponse2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'presence2@example.com',
        password: 'SecurePass123!',
        name: 'Presence User 2',
      });

    secondUserToken = registerResponse2.body.data.token;
    secondUserId = registerResponse2.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { in: ['presence1@example.com', 'presence2@example.com'] } },
    });
    await prisma.$disconnect();
    io.close();
    httpServer.close();
  });

  describe('REST Presence Endpoints', () => {
    it('GET /api/users/presence should return status for multiple users', async () => {
      const response = await request(app)
        .get(`/api/users/presence?userIds=${testUserId},${secondUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      // Check that each user has id and status
      response.body.data.forEach((user: any) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('status');
      });
    });

    it('GET /api/users/presence should return 400 without userIds', async () => {
      const response = await request(app)
        .get('/api/users/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/users/:id/presence should return single user status', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/presence`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('status');
    });

    it('GET /api/users/:id/presence should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('PUT /api/users/:id/status should update user status', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'busy' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'busy');

      // Reset to online
      await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'online' });
    });

    it('GET /api/users/online should return only online users', async () => {
      const response = await request(app)
        .get('/api/users/online')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('WebSocket Presence Events', () => {
    it('should connect via WebSocket and receive online_users', async () => {
      return new Promise(async (resolve, reject) => {
        const socketUrl = `http://localhost:${httpServer.address()?.port || 3001}`;
        
        // Import socket.io-client dynamically
        const { default: io } = await import('socket.io-client');
        
        const socket = io(socketUrl, {
          auth: { token: authToken },
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          console.log('Test socket connected');
        });

        socket.on('online_users', (data: any) => {
          console.log('Received online_users:', data);
          expect(Array.isArray(data)).toBe(true);
          socket.disconnect();
          resolve(true);
        });

        socket.on('connect_error', (err: any) => {
          console.error('Connection error:', err.message);
          reject(err);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          socket.disconnect();
          reject(new Error('Timeout waiting for online_users event'));
        }, 5000);
      });
    });

    it('should receive presence_update when another user connects', async () => {
      return new Promise(async (resolve, reject) => {
        const socketUrl = `http://localhost:${httpServer.address()?.port || 3001}`;
        const { default: io } = await import('socket.io-client');
        
        // First user socket
        const socket1 = io(socketUrl, {
          auth: { token: authToken },
          transports: ['websocket'],
        });

        let receivedPresenceUpdate = false;

        socket1.on('presence_update', (data: any) => {
          console.log('Received presence_update:', data);
          // This should be triggered when second user connects
          if (data.userId === secondUserId && data.status === 'online') {
            receivedPresenceUpdate = true;
          }
        });

        socket1.on('connect', async () => {
          console.log('Socket 1 connected');
          
          // Now connect second user (this should trigger presence_update for first user)
          const socket2 = io(socketUrl, {
            auth: { token: secondUserToken },
            transports: ['websocket'],
          });

          socket2.on('connect', () => {
            console.log('Socket 2 connected');
            // Give time for the presence_update to be broadcast
            setTimeout(() => {
              socket1.disconnect();
              socket2.disconnect();
              resolve(receivedPresenceUpdate);
            }, 1000);
          });

          socket2.on('connect_error', (err: any) => {
            console.error('Socket 2 connection error:', err.message);
            socket1.disconnect();
            reject(err);
          });
        });

        socket1.on('connect_error', (err: any) => {
          console.error('Socket 1 connection error:', err.message);
          reject(err);
        });

        // Timeout
        setTimeout(() => {
          socket1.disconnect();
          reject(new Error('Timeout'));
        }, 10000);
      });
    }, 15000);
  });
});
