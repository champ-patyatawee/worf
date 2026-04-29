import request from 'supertest';
import express from 'express';
import channelRoutes from '../../src/routes/channels';
import messageRoutes from '../../src/routes/messages';
import authRoutes from '../../src/routes/auth';
import { errorHandler } from '../../src/middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api', messageRoutes);
app.use(errorHandler);

describe('Channels API', () => {
  let authToken: string;
  let secondUserToken: string;
  let testChannelId: string;
  
  const testUser = {
    email: 'channel-test@example.com',
    password: 'SecurePass123!',
    name: 'Channel Test User',
  };

  const secondUser = {
    email: 'channel-test-2@example.com',
    password: 'SecurePass123!',
    name: 'Channel Test User 2',
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
  });

  describe('POST /api/channels', () => {
    it('should create a new channel successfully', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-channel',
          description: 'A test channel',
          type: 'public',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'test-channel');
      expect(response.body.data).toHaveProperty('description', 'A test channel');
      expect(response.body.data).toHaveProperty('type', 'public');
      expect(response.body.data).toHaveProperty('id');
      
      testChannelId = response.body.data.id;
    });

    it('should create a channel with default type (public)', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'default-type-channel',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('type', 'public');
    });

    it('should create a private channel', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'private-channel',
          type: 'private',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('type', 'private');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/channels')
        .send({ name: 'test' })
        .expect(401);
    });

    it('should return 400 for empty channel name', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for missing channel name', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid channel type', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'invalid-type-channel',
          type: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for description too long', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'long-desc-channel',
          description: 'a'.repeat(501),
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/channels', () => {
    it('should list all channels for authenticated user', async () => {
      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/channels')
        .expect(401);
    });

    it('should return empty array for user with no channels', async () => {
      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/channels/:id', () => {
    it('should get a specific channel by ID', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testChannelId);
      expect(response.body.data).toHaveProperty('name', 'test-channel');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/channels/${testChannelId}`)
        .expect(401);
    });

    it('should return 404 for non-existent channel', async () => {
      const response = await request(app)
        .get('/api/channels/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/channels/:id', () => {
    it('should update channel name', async () => {
      const response = await request(app)
        .put(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'updated-channel-name' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'updated-channel-name');
    });

    it('should update channel description', async () => {
      const response = await request(app)
        .put(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.data).toHaveProperty('description', 'Updated description');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/channels/${testChannelId}`)
        .send({ name: 'updated' })
        .expect(401);
    });

    it('should return 404 for non-existent channel', async () => {
      const response = await request(app)
        .put('/api/channels/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'updated' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .put(`/api/channels/${testChannelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/channels/:id', () => {
    let channelToDelete: string;

    beforeAll(async () => {
      // Create a channel to delete
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'channel-to-delete' });
      channelToDelete = response.body.data.id;
    });

    it('should delete a channel successfully', async () => {
      const response = await request(app)
        .delete(`/api/channels/${channelToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.message).toBe('Channel deleted successfully');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/channels/${testChannelId}`)
        .expect(401);
    });

    it('should return 404 for already deleted channel', async () => {
      const response = await request(app)
        .delete(`/api/channels/${channelToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/channels/:id/join', () => {
    let joinableChannelId: string;

    beforeAll(async () => {
      // Second user creates a channel
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ name: 'joinable-channel' });
      joinableChannelId = response.body.data.id;
    });

    it('should join a channel successfully', async () => {
      const response = await request(app)
        .post(`/api/channels/${joinableChannelId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.message).toBe('Joined channel successfully');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/channels/${joinableChannelId}/join`)
        .expect(401);
    });

    it('should return 404 for non-existent channel', async () => {
      const response = await request(app)
        .post('/api/channels/non-existent-id/join')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 409 when already a member', async () => {
      // Try to join again
      const response = await request(app)
        .post(`/api/channels/${joinableChannelId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Already a member');
    });
  });

  describe('POST /api/channels/:id/leave', () => {
    let leavableChannelId: string;

    beforeAll(async () => {
      // Second user creates a channel for first user to leave
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ name: 'leavable-channel' });
      leavableChannelId = response.body.data.id;

      // First user joins it
      await request(app)
        .post(`/api/channels/${leavableChannelId}/join`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should leave a channel successfully', async () => {
      const response = await request(app)
        .post(`/api/channels/${leavableChannelId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.message).toBe('Left channel successfully');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/channels/${leavableChannelId}/leave`)
        .expect(401);
    });

    it('should return 404 for non-existent channel', async () => {
      const response = await request(app)
        .post('/api/channels/non-existent-id/leave')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 when not a member', async () => {
      const response = await request(app)
        .post(`/api/channels/${leavableChannelId}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/channels/:id/members', () => {
    it('should get channel members', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/channels/${testChannelId}/members`)
        .expect(401);
    });
  });

  describe('GET /api/channels/:id/messages', () => {
    it('should get channel messages with pagination', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should support page and limit query params', async () => {
      const response = await request(app)
        .get(`/api/channels/${testChannelId}/messages?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/channels/${testChannelId}/messages`)
        .expect(401);
    });
  });

  describe('POST /api/channels/:id/messages', () => {
    it('should send a message to channel', async () => {
      const response = await request(app)
        .post(`/api/channels/${testChannelId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello, world!' })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('content', 'Hello, world!');
      expect(response.body.data).toHaveProperty('channelId', testChannelId);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/channels/${testChannelId}/messages`)
        .send({ content: 'Hello!' })
        .expect(401);
    });

    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .post(`/api/channels/${testChannelId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post(`/api/channels/${testChannelId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent channel', async () => {
      const response = await request(app)
        .post('/api/channels/non-existent-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello!' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 403 when not a channel member', async () => {
      const response = await request(app)
        .post(`/api/channels/${testChannelId}/messages`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ content: 'Hello!' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
