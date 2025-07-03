process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = 'mysql://root:OsTelO05!@localhost:3306/uniket_test';
process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Notification Routes', () => {
  let customerToken;
  let testCustomer;
  let testNotification;

  beforeAll(async () => {
    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '1234567890',
        updatedAt: new Date()
      }
    });

    // Generate customer token
    customerToken = jwt.sign(
      { id: testCustomer.id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test notification
    testNotification = await prisma.notification.create({
      data: {
        message: 'Test notification',
        type: 'ORDER_STATUS',
        userId: testCustomer.id,
        data: JSON.stringify({ orderId: 123 })
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({
      where: {
        userId: testCustomer.id
      }
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testCustomer.id]
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/notifications', () => {
    it('should return notifications when authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id', testNotification.id);
      expect(response.body[0]).toHaveProperty('message', 'Test notification');
      expect(response.body[0]).toHaveProperty('type', 'ORDER_STATUS');
      expect(response.body[0]).toHaveProperty('read', false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread', () => {
    it('should return unread notifications count when authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications/unread');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read when authenticated', async () => {
      const response = await request(app)
        .put(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('read', true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/notifications/${testNotification.id}/read`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when notification does not exist', async () => {
      const response = await request(app)
        .put('/api/notifications/99999/read')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read when authenticated', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'All notifications marked as read');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification when authenticated', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${testNotification.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Notification deleted successfully');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${testNotification.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when notification does not exist', async () => {
      const response = await request(app)
        .delete('/api/notifications/99999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 