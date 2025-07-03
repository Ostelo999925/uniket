process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Transaction Routes', () => {
  let vendorToken;
  let adminToken;
  let testVendor;
  let testAdmin;
  let testTransaction;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { user: { email: 'vendor@test.com' } },
          { user: { email: 'admin@test.com' } }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'vendor@test.com' },
          { email: 'admin@test.com' }
        ]
      }
    });

    // Create test vendor
    testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567890',
        profileComplete: 100,
        updatedAt: new Date()
      }
    });

    // Create test admin
    testAdmin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'hashedPassword',
        role: 'admin',
        phone: '1234567891',
        profileComplete: 100,
        updatedAt: new Date()
      }
    });

    // Generate tokens
    vendorToken = jwt.sign(
      { 
        id: testVendor.id,
        role: 'vendor',
        email: testVendor.email,
        name: testVendor.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { 
        id: testAdmin.id,
        role: 'admin',
        email: testAdmin.email,
        name: testAdmin.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test transaction
    testTransaction = await prisma.transaction.create({
      data: {
        userId: testVendor.id,
        type: 'fund',
        amount: 500.00,
        description: 'Test transaction',
        status: 'PENDING'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { userId: testVendor.id },
          { userId: testAdmin.id }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'vendor@test.com' },
          { email: 'admin@test.com' }
        ]
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/transactions', () => {
    it('should create transaction when authenticated', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          type: 'fund',
          amount: 500.00,
          description: 'Test transaction'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type', 'fund');
      expect(response.body).toHaveProperty('amount', 500.00);
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          type: 'fund',
          amount: 500.00,
          description: 'Test transaction'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when amount is invalid', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          type: 'fund',
          amount: -500.00,
          description: 'Test transaction'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return user transactions when authenticated', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return all transactions when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/transactions');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details when authenticated', async () => {
      const response = await request(app)
        .get(`/api/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testTransaction.id);
      expect(response.body).toHaveProperty('type', 'fund');
      expect(response.body).toHaveProperty('amount', 500.00);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/transactions/${testTransaction.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when transaction does not exist', async () => {
      const response = await request(app)
        .get('/api/transactions/99999')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/transactions/:id/status', () => {
    it('should update transaction status when authenticated as admin', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'COMPLETED');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}/status`)
        .send({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as vendor', async () => {
      const response = await request(app)
        .put(`/api/transactions/${testTransaction.id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/transactions/stats', () => {
    it('should return transaction statistics when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalTransactions');
      expect(response.body).toHaveProperty('totalAmount');
      expect(response.body).toHaveProperty('statusCounts');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/transactions/stats');

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as vendor', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/transactions/user/:userId', () => {
    it('should return user transactions when authenticated as admin', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${testVendor.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${testVendor.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as vendor', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${testVendor.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
    });
  });
});