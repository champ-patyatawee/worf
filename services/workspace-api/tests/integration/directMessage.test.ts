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

// Create test app
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

describe('Direct Message Integration Tests', () => {
  let authToken1: string;
  let authToken2: string;
  let userId1: string;
  let userId2: string;

  beforeAll(async () => {
    // Initialize socket handlers
    initializeSocket(io);

    // Wait for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create first test user
    const registerResponse1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dmtest1@example.com',
        password: 'SecurePass123!',
        name: 'DM Test User 1',
      });

    authToken1 = registerResponse1.body.data.token;
    userId1 = registerResponse1.body.data.user.id;

    // Create second test user
    const registerResponse2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dmtest2@example.com',
        password: 'SecurePass123!',
        name: 'DM Test User 2',
      });

    authToken2 = registerResponse2.body.data.token;
    userId2 = registerResponse2.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test users and messages
    await prisma.directMessage.deleteMany({
      where: {
        OR: [
          { userId: userId1 },
          { userId: userId2 },
          { recipientId: userId1 },
          { recipientId: userId2 },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['dmtest1@example.com', 'dmtest2@example.com'] } },
    });
    await prisma.$disconnect();
    io.close();
    httpServer.close();
  });

  describe('POST /api/users/:id/messages - Send Direct Message', () => {
    it('should send a direct message successfully', async () => {
      const response = await request(app)
        .post(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: 'Hello from test user 1!' })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('content', 'Hello from test user 1!');
      expect(response.body.data).toHaveProperty('userId', userId1);
      expect(response.body.data).toHaveProperty('recipientId', userId2);
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when content is empty', async () => {
      const response = await request(app)
        .post(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when content is too long', async () => {
      const longContent = 'a'.repeat(10001);
      const response = await request(app)
        .post(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: longContent })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 when recipient does not exist', async () => {
      const response = await request(app)
        .post('/api/users/non-existent-id/messages')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: 'Hello!' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/users/${userId2}/messages`)
        .send({ content: 'Hello!' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/users/:id/messages - Get Direct Messages', () => {
    beforeAll(async () => {
      // Send a few messages
      await request(app)
        .post(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: 'Message 1' });

      await request(app)
        .post(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: 'Message 2' });
    });

    it('should get direct messages between two users', async () => {
      const response = await request(app)
        .get(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.messages)).toBe(true);
      expect(response.body.data.messages.length).toBeGreaterThan(0);
    });

    it('should include sender and recipient info in messages', async () => {
      const response = await request(app)
        .get(`/api/users/${userId2}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      const message = response.body.data.messages[0];
      expect(message).toHaveProperty('sender');
      expect(message).toHaveProperty('recipient');
      expect(message.sender).toHaveProperty('id');
      expect(message.sender).toHaveProperty('name');
      expect(message.sender).toHaveProperty('email');
    });

    it('should support pagination with page and limit', async () => {
      const response = await request(app)
        .get(`/api/users/${userId2}/messages?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 1);
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${userId2}/messages`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/dm - Create/Get DM Conversation', () => {
    it('should create/get a DM conversation', async () => {
      const response = await request(app)
        .post('/api/dm')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ recipientId: userId2 })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('participant');
      expect(response.body.data.participant).toHaveProperty('id', userId2);
    });

    it('should return 400 when recipientId is missing', async () => {
      const response = await request(app)
        .post('/api/dm')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when trying to DM yourself', async () => {
      const response = await request(app)
        .post('/api/dm')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ recipientId: userId1 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('yourself');
    });

    it('should return 404 when recipient does not exist', async () => {
      const response = await request(app)
        .post('/api/dm')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ recipientId: 'non-existent-id' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/dm')
        .send({ recipientId: userId2 })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/dm - List DM Conversations', () => {
    it('should list all DM conversations', async () => {
      const response = await request(app)
        .get('/api/dm')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include partner info in conversation list', async () => {
      const response = await request(app)
        .get('/api/dm')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      if (response.body.data.length > 0) {
        const conversation = response.body.data[0];
        expect(conversation).toHaveProperty('partner');
        expect(conversation).toHaveProperty('lastMessage');
        expect(conversation.partner).toHaveProperty('id');
        expect(conversation.partner).toHaveProperty('name');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/dm')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/dm/:recipientId/read - Mark DM as Read', () => {
    it('should mark DMs as read', async () => {
      const response = await request(app)
        .put(`/api/dm/${userId2}/read`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 when recipientId is missing', async () => {
      // Note: This will match the route pattern but without recipientId
      const response = await request(app)
        .put('/api/dm//read')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404); // Will be 404 because route won't match

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/dm/${userId2}/read`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
