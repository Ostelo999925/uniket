process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = 'mysql://root:OsTelO05!@localhost:3306/uniket_test';
process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/index');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Wallet Routes', () => {
  let vendorToken;
  let testVendor;
  let testWallet;
  let testProduct;

  beforeAll(async () => {
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

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Description',
        price: 100.00,
        image: 'test.jpg',
        category: 'test',
        vendorId: testVendor.id,
        quantity: 10,
        updatedAt: new Date()
      }
    });

    // Create test orders to generate revenue
    await prisma.order.createMany({
      data: [
        {
          productId: testProduct.id,
          customerId: testVendor.id,
          quantity: 1,
          total: 100.00,
          status: 'COMPLETED',
          createdAt: new Date()
        },
        {
          productId: testProduct.id,
          customerId: testVendor.id,
          quantity: 1,
          total: 100.00,
          status: 'COMPLETED',
          createdAt: new Date()
        }
      ]
    });

    // Create wallet for vendor
    testWallet = await prisma.wallet.create({
      data: {
        userId: testVendor.id,
        balance: 200.00
      }
    });

    // Generate vendor token
    vendorToken = jwt.sign(
      { id: testVendor.id, role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.order.deleteMany({
      where: {
        productId: testProduct.id
      }
    });
    await prisma.product.deleteMany({
      where: {
        id: testProduct.id
      }
    });
    await prisma.transaction.deleteMany({
      where: {
        userId: testVendor.id
      }
    });
    await prisma.wallet.deleteMany({
      where: {
        userId: testVendor.id
      }
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testVendor.id]
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/wallet/:userId', () => {
    it('should return wallet details when authenticated', async () => {
      const response = await request(app)
        .get(`/api/wallet/${testVendor.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testWallet.id);
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('userId', testVendor.id);
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalWithdrawals');
      expect(response.body).toHaveProperty('availableBalance');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/wallet/${testVendor.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when accessing another user\'s wallet', async () => {
      const response = await request(app)
        .get('/api/wallet/999')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/wallet/fund', () => {
    it('should fund wallet when authenticated', async () => {
      const response = await request(app)
        .post('/api/wallet/fund')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: 200.00
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Wallet funded successfully');
      expect(response.body).toHaveProperty('wallet');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/wallet/fund')
        .send({
          amount: 200.00
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when amount is invalid', async () => {
      const response = await request(app)
        .post('/api/wallet/fund')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: -100.00
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/wallet/checkout', () => {
    it('should deduct from wallet when authenticated', async () => {
      const response = await request(app)
        .post('/api/wallet/checkout')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: 100.00
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Payment successful');
      expect(response.body).toHaveProperty('wallet');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/wallet/checkout')
        .send({
          amount: 100.00
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when amount is invalid', async () => {
      const response = await request(app)
        .post('/api/wallet/checkout')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: -100.00
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when insufficient funds', async () => {
      const response = await request(app)
        .post('/api/wallet/checkout')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          amount: 1000000.00
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Insufficient funds');
    });
  });
}); 