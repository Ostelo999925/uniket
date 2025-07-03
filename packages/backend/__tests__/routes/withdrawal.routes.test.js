process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = 'mysql://root:OsTelO05!@localhost:3306/uniket_test';
process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Withdrawal Routes', () => {
  let vendorToken;
  let adminToken;
  let testVendor;
  let testAdmin;
  let testWithdrawal;
  let server;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0); // Use port 0 to get a random available port

    // Clean up any existing test data
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['vendor@test.com', 'admin@test.com']
        }
      }
    });

    if (testUsers.length > 0) {
      const userIds = testUsers.map(user => user.id);
      await prisma.$transaction([
        prisma.transaction.deleteMany({
          where: {
            userId: {
              in: userIds
            }
          }
        }),
        prisma.wallet.deleteMany({
          where: {
            userId: {
              in: userIds
            }
          }
        }),
        prisma.user.deleteMany({
          where: {
            id: {
              in: userIds
            }
          }
        })
      ]);
    }

    // Create test vendor
    testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567890',
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
        updatedAt: new Date()
      }
    });

    // Create wallet for vendor
    await prisma.wallet.create({
      data: {
        userId: testVendor.id,
        balance: 1000.00
      }
    });

    // Generate tokens
    vendorToken = jwt.sign(
      { id: testVendor.id, role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: testAdmin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Create a test withdrawal before each test
    testWithdrawal = await prisma.transaction.create({
      data: {
        userId: testVendor.id,
        type: 'withdrawal',
        amount: 500.00,
        status: 'PENDING',
        description: JSON.stringify({
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          accountName: 'Test Vendor'
        })
      }
    });
  });

  afterEach(async () => {
    // Clean up test withdrawal after each test
    if (testWithdrawal && testWithdrawal.id) {
      await prisma.transaction.deleteMany({
        where: {
          id: testWithdrawal.id
        }
      });
    }
  });

  afterAll(async () => {
    // Clean up test data in the correct order to handle foreign key constraints
    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: {
          userId: {
            in: [testVendor.id, testAdmin.id]
          }
        }
      }),
      prisma.wallet.deleteMany({
        where: {
          userId: {
            in: [testVendor.id, testAdmin.id]
          }
        }
      }),
      prisma.user.deleteMany({
        where: {
          id: {
            in: [testVendor.id, testAdmin.id]
          }
        }
      })
    ]);

    // Close server and database connection
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  describe('POST /api/withdrawals', () => {
    it('should create withdrawal request when authenticated as vendor', async () => {
      const response = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: 500.00,
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          accountName: 'Test Vendor'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('amount', 500.00);
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('userId', testVendor.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/withdrawals')
        .send({
          amount: 500.00,
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          accountName: 'Test Vendor'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when amount exceeds wallet balance', async () => {
      const response = await request(app)
        .post('/api/withdrawals')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: 2000.00,
          bankName: 'Test Bank',
          accountNumber: '1234567890',
          accountName: 'Test Vendor'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/withdrawals', () => {
    it('should return vendor withdrawals when authenticated as vendor', async () => {
      const response = await request(app)
        .get('/api/withdrawals')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id', testWithdrawal.id);
    });

    it('should return all withdrawals when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/withdrawals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/withdrawals');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/withdrawals/:id/approve', () => {
    it('should approve withdrawal when authenticated as admin', async () => {
      const response = await request(app)
        .put(`/api/withdrawals/${testWithdrawal.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'APPROVED');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/withdrawals/${testWithdrawal.id}/approve`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as vendor', async () => {
      const response = await request(app)
        .put(`/api/withdrawals/${testWithdrawal.id}/approve`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/withdrawals/:id/reject', () => {
    it('should reject withdrawal when authenticated as admin', async () => {
      const response = await request(app)
        .put(`/api/withdrawals/${testWithdrawal.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Invalid bank details'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'REJECTED');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/withdrawals/${testWithdrawal.id}/reject`)
        .send({
          reason: 'Invalid bank details'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as vendor', async () => {
      const response = await request(app)
        .put(`/api/withdrawals/${testWithdrawal.id}/reject`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          reason: 'Invalid bank details'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/withdrawals/:id', () => {
    it('should return withdrawal details when authenticated as vendor', async () => {
      const response = await request(app)
        .get(`/api/withdrawals/${testWithdrawal.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testWithdrawal.id);
      expect(response.body).toHaveProperty('amount', 500.00);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/withdrawals/${testWithdrawal.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when withdrawal does not exist', async () => {
      const response = await request(app)
        .get('/api/withdrawals/99999')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 