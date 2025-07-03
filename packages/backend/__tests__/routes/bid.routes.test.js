// Set test environment before any imports
process.env.NODE_ENV = 'test';

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Bid Routes', () => {
  let customerToken;
  let vendorToken;
  let testProduct;
  let testCustomer;
  let testVendor;
  let testBid;

  beforeAll(async () => {
    console.log('Setting up test data...');
    console.log('Database URL:', process.env.TEST_DATABASE_URL);

    // Clean up any existing test data
    console.log('Cleaning up existing test data...');
    try {
      // First, delete all notifications as they reference users
      await prisma.notification.deleteMany({});
      
      // Then delete bids as they reference both users and products
      await prisma.bid.deleteMany({});
      
      // Delete products next as they reference users
      await prisma.product.deleteMany({});
      
      // Finally, delete users
      await prisma.user.deleteMany({});
    } catch (error) {
      console.error('Error during initial cleanup:', error);
    }

    // Create test vendor
    console.log('Creating test vendor...');
    testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });
    console.log('Test vendor created:', testVendor);

    // Create test customer
    console.log('Creating test customer...');
    testCustomer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '0987654321',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });
    console.log('Test customer created:', testCustomer);

    // Generate tokens
    console.log('Generating tokens...');
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

    customerToken = jwt.sign(
      { 
        id: testCustomer.id, 
        role: 'customer',
        email: testCustomer.email,
        name: testCustomer.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test product
    console.log('Creating test product...');
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        vendorId: testVendor.id,
        category: 'Test Category',
        image: 'test.jpg',
        quantity: 10,
        enableBidding: true,
        startingBid: 50,
        currentBid: 60,
        status: 'APPROVED',
        isFlagged: false,
        views: 0,
        isTicket: false,
        updatedAt: new Date()
      }
    });
    console.log('Test product created:', testProduct);

    // Create test bid
    console.log('Creating test bid...');
    testBid = await prisma.bid.create({
      data: {
        amount: 60.00,
        status: 'PENDING',
        userId: testCustomer.id,
        productId: testProduct.id,
        updatedAt: new Date()
      }
    });
    console.log('Test bid created:', testBid);

    // Verify test data
    console.log('Verifying test data...');
    const products = await prisma.product.findMany();
    const users = await prisma.user.findMany();
    const bids = await prisma.bid.findMany();
    console.log('Products in database:', products);
    console.log('Users in database:', users);
    console.log('Bids in database:', bids);
  });

  afterAll(async () => {
    try {
      console.log('Cleaning up test data...');
      // Clean up test data in correct order
      await prisma.notification.deleteMany({});
      await prisma.bid.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('POST /api/bidding/:productId/place', () => {
    it('should create a new bid when authenticated as customer', async () => {
      console.log('Test: Creating new bid');
      console.log('Using product ID:', testProduct.id);
      console.log('Using customer token:', customerToken);

      const response = await request(app)
        .post(`/api/bidding/${testProduct.id}/place`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 70.00
        });

      console.log('Response:', response.status, response.body);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('amount', 70.00);
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/bidding/${testProduct.id}/place`)
        .send({
          amount: 70.00
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for bid amount lower than current bid', async () => {
      const response = await request(app)
        .post(`/api/bidding/${testProduct.id}/place`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 40.00 // Lower than current bid
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/bidding/:productId/bids', () => {
    it('should return all bids for a product', async () => {
      const response = await request(app)
        .get(`/api/bidding/${testProduct.id}/bids`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/bidding/999999/bids');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/bidding/user/bids', () => {
    it('should return user bids when authenticated', async () => {
      const response = await request(app)
        .get('/api/bidding/user/bids')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('product');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/bidding/user/bids');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/bidding/user/bids')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
  });

  describe('PUT /api/bidding/:id/accept', () => {
    it('should accept bid when authenticated as vendor', async () => {
      const response = await request(app)
        .put(`/api/bidding/${testBid.id}/accept`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ACCEPTED');

      // Verify the change in database
      const updatedBid = await prisma.bid.findUnique({
        where: { id: testBid.id }
      });
      expect(updatedBid.status).toBe('ACCEPTED');
    });

    it('should return 403 when authenticated as customer', async () => {
      const response = await request(app)
        .put(`/api/bidding/${testBid.id}/accept`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/bidding/:id/reject', () => {
    it('should reject bid when authenticated as vendor', async () => {
      const response = await request(app)
        .put(`/api/bidding/${testBid.id}/reject`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'REJECTED');

      // Verify the change in database
      const updatedBid = await prisma.bid.findUnique({
        where: { id: testBid.id }
      });
      expect(updatedBid.status).toBe('REJECTED');
    });

    it('should return 403 when authenticated as customer', async () => {
      const response = await request(app)
        .put(`/api/bidding/${testBid.id}/reject`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });
  });
}); 