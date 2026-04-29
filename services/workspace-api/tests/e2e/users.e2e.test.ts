import request from 'supertest';
import express from 'express';
import userRoutes from '../../src/routes/users';
import authRoutes from '../../src/routes/auth';
import { errorHandler } from '../../src/middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use(errorHandler);

describe('Users API', () => {
  let authToken: string;
  let testUserId: string;
  let secondUserId: string;
  
  const testUser = {
    email: 'user-test@example.com',
    password: 'SecurePass123!',
    name: 'User Test User',
  };

  const secondUser = {
    email: 'user-test-2@example.com',
    password: 'SecurePass123!',
    name: 'Another User',
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
    testUserId = loginResponse.body.data.user.id;

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
    secondUserId = secondLoginResponse.body.data.user.id;
  });

  describe('GET /api/users', () => {
    it('should list all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should include user properties in response', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const user = response.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('status');
      expect(user).not.toHaveProperty('password');
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users/search?q=User Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/users/search?q=user-test@example.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/users/search?q=test')
        .expect(401);
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Search query is required');
    });

    it('should return empty array when no matches found', async () => {
      const response = await request(app)
        .get('/api/users/search?q=nonexistentuser12345')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should be case insensitive', async () => {
      const response = await request(app)
        .get('/api/users/search?q=USER TEST')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get a specific user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('name', testUser.name);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/users/${testUserId}`)
        .expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not found');
    });

    it('should include channels in user response', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('channels');
      expect(Array.isArray(response.body.data.channels)).toBe(true);
    });
  });

  describe('PUT /api/users/:id/status', () => {
    it('should update user status to busy', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'busy' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'busy');
    });

    it('should update user status to away', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'away' })
        .expect(200);

      expect(response.body.data.status).toBe('away');
    });

    it('should update user status to online', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'online' })
        .expect(200);

      expect(response.body.data.status).toBe('online');
    });

    it('should update user status to offline', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'offline' })
        .expect(200);

      expect(response.body.data.status).toBe('offline');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/users/${testUserId}/status`)
        .send({ status: 'busy' })
        .expect(401);
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing status', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/non-existent-id/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'busy' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/users/:id/presence', () => {
    it('should get user presence', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/presence`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/users/${testUserId}/presence`)
        .expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id/presence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/users/:id/messages', () => {
    it('should get direct messages with user', async () => {
      const response = await request(app)
        .get(`/api/users/${secondUserId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/users/${secondUserId}/messages`)
        .expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/users/:id/messages', () => {
    it('should send a direct message to another user', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUserId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello, this is a direct message!' })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('content', 'Hello, this is a direct message!');
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(response.body.data).toHaveProperty('recipientId', secondUserId);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/users/${secondUserId}/messages`)
        .send({ content: 'Hello!' })
        .expect(401);
    });

    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUserId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUserId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent recipient', async () => {
      const response = await request(app)
        .post('/api/users/non-existent-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello!' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for content too long', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUserId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'a'.repeat(10001) })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
