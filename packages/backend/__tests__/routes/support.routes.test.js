require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.test') });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const getPrismaClient = require('../../src/prismaClient');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const prisma = getPrismaClient();

describe('Support Routes', () => {
  let customerToken;
  let adminToken;
  let testChat;

  beforeAll(async () => {
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['customer@test.com', 'admin@test.com']
        }
      }
    });

    // Create test customer
    const customer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'password123',
        role: 'customer',
        phone: '1234567890',
        updatedAt: new Date()
      }
    });
    console.log('Test Customer created with ID:', customer.id);

    // Create test admin
    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        phone: '1234567890',
        updatedAt: new Date()
      }
    });
    console.log('Test Admin created with ID:', admin.id);

    // Generate tokens
    customerToken = jwt.sign(
      { id: customer.id, role: 'customer' },
      process.env.JWT_SECRET || 'uniketSuperSecretKey',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET || 'uniketSuperSecretKey',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.supportchat.deleteMany({
      where: {
        userId: {
          in: [
            (await prisma.user.findUnique({ where: { email: 'customer@test.com' } })).id,
            (await prisma.user.findUnique({ where: { email: 'admin@test.com' } })).id
          ]
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['customer@test.com', 'admin@test.com']
        }
      }
    });
  });

  describe('POST /api/support/chat', () => {
    it('should create new support chat when authenticated', async () => {
      const response = await request(app)
        .post('/api/support/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'Test support message'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('userMessage');
      expect(response.body.data.userMessage).toHaveProperty('message', 'Test support message');
      expect(response.body.data.userMessage).toHaveProperty('type', 'USER');
      expect(response.body.data.userMessage).toHaveProperty('parentId', null);

      // Store the created chat for later tests
      testChat = response.body.data.userMessage;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/support/chat')
        .send({
          message: 'Test support message'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/support/chat', () => {
    it('should return chat history when authenticated as customer', async () => {
      const response = await request(app)
        .get('/api/support/chat')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('message', 'Test support message');
      expect(response.body.data[0]).toHaveProperty('type', 'USER');
    });

    it('should return chat history when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/support/chat')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/support/chat');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/support/chat/:id/reply', () => {
    it('should add reply to chat when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/support/chat/${testChat.id}/reply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Test admin reply'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('aiMessages');
      expect(Array.isArray(response.body.data.aiMessages)).toBe(true);
      expect(response.body.data.aiMessages[0]).toHaveProperty('type', 'AI');
      expect(response.body.data.aiMessages[0]).toHaveProperty('parentId', testChat.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/support/chat/${testChat.id}/reply`)
        .send({
          message: 'Test admin reply'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as customer', async () => {
      const response = await request(app)
        .post(`/api/support/chat/${testChat.id}/reply`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'Test admin reply'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/support/chat/:id', () => {
    it('should return chat details when authenticated', async () => {
      const response = await request(app)
        .get(`/api/support/chat/${testChat.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message', 'Test support message');
      expect(response.body.data).toHaveProperty('type', 'USER');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/support/chat/${testChat.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when chat does not exist', async () => {
      const response = await request(app)
        .get('/api/support/chat/99999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/support/stats', () => {
    it('should return support statistics when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/support/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalChats');
      expect(response.body).toHaveProperty('activeChats');
      expect(response.body).toHaveProperty('resolvedChats');
      expect(response.body).toHaveProperty('averageResponseTime');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/support/stats');

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as customer', async () => {
      const response = await request(app)
        .get('/api/support/stats')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/support/chat/:id/resolve', () => {
    it('should resolve chat when authenticated as admin', async () => {
      const response = await request(app)
        .put(`/api/support/chat/${testChat.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'Issue resolved'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('type', 'AI');
      expect(response.body.data).toHaveProperty('parentId', testChat.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/support/chat/${testChat.id}/resolve`)
        .send({
          resolution: 'Issue resolved'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as customer', async () => {
      const response = await request(app)
        .put(`/api/support/chat/${testChat.id}/resolve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          resolution: 'Issue resolved'
        });

      expect(response.status).toBe(403);
    });
  });
}); 