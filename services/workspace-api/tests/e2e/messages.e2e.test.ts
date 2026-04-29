import request from 'supertest';
import express from 'express';
import messageRoutes from '../../src/routes/messages';
import channelRoutes from '../../src/routes/channels';
import authRoutes from '../../src/routes/auth';
import { errorHandler } from '../../src/middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api', messageRoutes);
app.use(errorHandler);

describe('Messages API', () => {
  let authToken: string;
  let secondUserToken: string;
  let testChannelId: string;
  let testMessageId: string;
  let threadMessageId: string;
  
  const testUser = {
    email: 'message-test@example.com',
    password: 'SecurePass123!',
    name: 'Message Test User',
  };

  const secondUser = {
    email: 'message-test-2@example.com',
    password: 'SecurePass123!',
    name: 'Message Test User 2',
  };

  beforeAll(async () => {
    // Register and login first user
    await request(app)
      .post('/api/auth/register')
      .send(testUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    authToken = loginResponse.body.data.token;

    // Register and login second user
    await request(app)
      .post('/api/auth/register')
      .send(secondUser);

    const secondLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: secondUser.email,
        password: secondUser.password,
      });
    secondUserToken = secondLoginResponse.body.data.token;

    // Create a channel and send messages
    const channelResponse = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'message-test-channel' });
    testChannelId = channelResponse.body.data.id;

    // Join the channel
    await request(app)
      .post(`/api/channels/${testChannelId}/join`)
      .set('Authorization', `Bearer ${authToken}`);

    // Send a regular message
    const messageResponse = await request(app)
      .post(`/api/channels/${testChannelId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'This is a test message' });
    testMessageId = messageResponse.body.data.id;

    // Send a message that will have replies (thread parent)
    const threadResponse = await request(app)
      .post(`/api/channels/${testChannelId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'This message will have replies' });
    threadMessageId = threadResponse.body.data.id;

    // Send a reply to the thread
    await request(app)
      .post(`/api/channels/${testChannelId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'This is a reply', threadId: threadMessageId });
  });

  describe('GET /api/messages/:id/thread', () => {
    it('should get message thread with replies', async () => {
      const response = await request(app)
        .get(`/api/messages/${threadMessageId}/thread`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('parent');
      expect(response.body.data).toHaveProperty('replies');
      expect(response.body.data.parent.id).toBe(threadMessageId);
      expect(Array.isArray(response.body.data.replies)).toBe(true);
      expect(response.body.data.replies.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/messages/${testMessageId}/thread`)
        .expect(401);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .get('/api/messages/non-existent-id/thread')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/messages/:id/reactions', () => {
    it('should add a reaction to a message', async () => {
      const response = await request(app)
        .post(`/api/messages/${testMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👍' })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('emoji', '👍');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('messageId', testMessageId);
    });

    it('should add a different reaction to the same message', async () => {
      const response = await request(app)
        .post(`/api/messages/${testMessageId}/reactions`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ emoji: '❤️' })
        .expect(201);

      expect(response.body.data.emoji).toBe('❤️');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/messages/${testMessageId}/reactions`)
        .send({ emoji: '👍' })
        .expect(401);
    });

    it('should return 400 for empty emoji', async () => {
      const response = await request(app)
        .post(`/api/messages/${testMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing emoji', async () => {
      const response = await request(app)
        .post(`/api/messages/${testMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .post('/api/messages/non-existent-id/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👍' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 409 when reaction already exists', async () => {
      // Try to add the same reaction again (same user, same emoji)
      const response = await request(app)
        .post(`/api/messages/${testMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👍' })
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('DELETE /api/messages/:id/reactions', () => {
    let reactionMessageId: string;

    beforeAll(async () => {
      // Create a new message for reaction tests
      const response = await request(app)
        .post(`/api/channels/${testChannelId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Message for reaction test' });
      reactionMessageId = response.body.data.id;

      // Add a reaction to it
      await request(app)
        .post(`/api/messages/${reactionMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👋' });
    });

    it('should remove a reaction from a message', async () => {
      const response = await request(app)
        .delete(`/api/messages/${reactionMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👋' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.message).toBe('Reaction removed successfully');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/messages/${reactionMessageId}/reactions`)
        .send({ emoji: '👋' })
        .expect(401);
    });

    it('should return 400 for missing emoji', async () => {
      const response = await request(app)
        .delete(`/api/messages/${reactionMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .delete('/api/messages/non-existent-id/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👋' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 when reaction does not exist', async () => {
      // Try to remove a reaction that doesn't exist
      const response = await request(app)
        .delete(`/api/messages/${reactionMessageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '❌' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
