// Load test environment variables first
process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });
process.env.JWT_SECRET = 'uniketSuperSecretKey';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // Override DATABASE_URL with TEST_DATABASE_URL
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const vendorRoutes = require('../../src/routes/vendor.routes');
const authRoutes = require('../../src/routes/auth.routes');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../../src/middlewares/auth');

// Initialize Prisma client
const prisma = new PrismaClient();

// Log environment variables for debugging
console.log('TEST ENV: DATABASE_URL:', process.env.DATABASE_URL);
console.log('TEST ENV: TEST_DATABASE_URL:', process.env.TEST_DATABASE_URL);

// Setup test app
const testApp = express();
testApp.use(cors());
testApp.use(express.json());
testApp.use('/api/auth', authRoutes);
testApp.use('/api/vendors', authenticate, authorize(['vendor']), vendorRoutes);

let server;
let testVendor;
let testAdmin;
let testCustomer;
let vendorToken;
let adminToken;
let customerToken;

describe('Vendor Routes', () => {
  beforeAll(async () => {
    try {
      // Ensure Prisma is connected
      await prisma.$connect();
      console.log('Prisma connected in test setup');

      // Reset database and create test users in a single transaction
      await prisma.$transaction(async (tx) => {
        // Reset the database
        await tx.user.deleteMany({});
        await tx.wallet.deleteMany({});
        await tx.product.deleteMany({});
        await tx.order.deleteMany({});
        await tx.bid.deleteMany({});
        await tx.cartitem.deleteMany({});
        await tx.transaction.deleteMany({});
        await tx.review.deleteMany({});
        await tx.notification.deleteMany({});
        await tx.pickuppoint.deleteMany({});
        await tx.productview.deleteMany({});
        await tx.ordertracking.deleteMany({});
        await tx.orderrating.deleteMany({});
        await tx.customerreport.deleteMany({});
        await tx.loginattempt.deleteMany({});
        await tx.useraction.deleteMany({});
        await tx.supportchat.deleteMany({});
        await tx.ticketdetails.deleteMany({});
        await tx.ticket.deleteMany({});
        console.log('Database reset complete');

        // Create test users
        const hashedPassword = await bcrypt.hash('vendorPassword123', 10);
        testVendor = await tx.user.create({
          data: {
            name: 'Test Vendor',
            email: 'vendor@test.com',
            password: hashedPassword,
            role: 'vendor',
            phone: '0555555555',
            profileComplete: 100,
            emailNotifications: true,
            smsNotifications: true,
            updatedAt: new Date()
          }
        });

        const adminHashedPassword = await bcrypt.hash('adminPassword123', 10);
        testAdmin = await tx.user.create({
          data: {
            name: 'Test Admin',
            email: 'admin@test.com',
            password: adminHashedPassword,
            role: 'admin',
            phone: '0555555557',
            profileComplete: 100,
            emailNotifications: true,
            smsNotifications: true,
            updatedAt: new Date()
          }
        });

        const customerHashedPassword = await bcrypt.hash('customerPassword123', 10);
        testCustomer = await tx.user.create({
          data: {
            name: 'Test Customer',
            email: 'customer@test.com',
            password: customerHashedPassword,
            role: 'customer',
            phone: '0555555556',
            profileComplete: 100,
            emailNotifications: true,
            smsNotifications: true,
            updatedAt: new Date()
          }
        });

        // Create test products for vendor
        const testProduct = await tx.product.create({
          data: {
            name: 'Test Product',
            description: 'Test Description',
            price: 100,
            image: 'test.jpg',
            category: 'Test Category',
            vendorId: testVendor.id,
            quantity: 10,
            status: 'APPROVED',
            updatedAt: new Date()
          }
        });

        // Create test orders
        await tx.order.create({
          data: {
            productId: testProduct.id,
            customerId: testCustomer.id,
            quantity: 2,
            total: 200,
            status: 'COMPLETED',
            deliveryMethod: 'PICKUP',
            createdAt: new Date()
          }
        });

        // Create test product views
        await tx.productview.create({
          data: {
            productId: testProduct.id,
            userId: testCustomer.id,
            viewedAt: new Date()
          }
        });
      });

      // Verify users were created
      const allUsers = await prisma.user.findMany();
      console.log('All users in database after creation:', allUsers);

      // Generate tokens
      vendorToken = jwt.sign(
        { 
          id: testVendor.id,
          email: testVendor.email,
          role: testVendor.role,
          name: testVendor.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      adminToken = jwt.sign(
        { 
          id: testAdmin.id, 
          email: testAdmin.email, 
          role: testAdmin.role,
          name: testAdmin.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      customerToken = jwt.sign(
        { 
          id: testCustomer.id,
          email: testCustomer.email,
          role: testCustomer.role,
          name: testCustomer.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Start server on a random port
      server = await new Promise((resolve) => {
        const s = testApp.listen(0, () => {
          resolve(s);
        });
      });

      // Verify users still exist after token generation
      const usersAfterTokenGen = await prisma.user.findMany();
      console.log('Users after token generation:', usersAfterTokenGen);

      // Verify we can find the vendor by ID
      const vendorById = await prisma.user.findUnique({
        where: { id: testVendor.id }
      });
      console.log('Found vendor by ID:', vendorById);

      // Verify database connection is still active
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection verified');

    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  // Add beforeEach to verify database state
  beforeEach(async () => {
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Verify test users exist
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });
    console.log('Users before test:', users);
    
    // Verify vendor exists
    const vendor = await prisma.user.findUnique({
      where: { id: testVendor.id }
    });
    console.log('Vendor before test:', vendor);

    // If vendor doesn't exist, recreate it
    if (!vendor) {
      console.log('Vendor not found, recreating...');
      const hashedPassword = await bcrypt.hash('vendorPassword123', 10);
      testVendor = await prisma.user.create({
        data: {
          name: 'Test Vendor',
          email: 'vendor@test.com',
          password: hashedPassword,
          role: 'vendor',
          phone: '0555555555',
          profileComplete: 100,
          emailNotifications: true,
          smsNotifications: true,
          updatedAt: new Date()
        }
      });
      
      // Regenerate vendor token
      vendorToken = jwt.sign(
        { 
          id: testVendor.id,
          email: testVendor.email,
          role: testVendor.role,
          name: testVendor.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    // Clean up database
    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({});
      await tx.wallet.deleteMany({});
      await tx.product.deleteMany({});
      await tx.order.deleteMany({});
      await tx.bid.deleteMany({});
      await tx.cartitem.deleteMany({});
      await tx.transaction.deleteMany({});
      await tx.review.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.pickuppoint.deleteMany({});
      await tx.productview.deleteMany({});
      await tx.ordertracking.deleteMany({});
      await tx.orderrating.deleteMany({});
      await tx.customerreport.deleteMany({});
      await tx.loginattempt.deleteMany({});
      await tx.useraction.deleteMany({});
      await tx.supportchat.deleteMany({});
      await tx.ticketdetails.deleteMany({});
      await tx.ticket.deleteMany({});
    });
    console.log('Database cleanup complete');

    // Close server and disconnect Prisma
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });

  describe('GET /api/vendors/profile', () => {
    it('should return vendor profile when authenticated as vendor', async () => {
      const response = await request(server)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/vendors/profile');

      expect(response.status).toBe(401);
    });

    it('should return 401 when authenticated as customer', async () => {
      const response = await request(server)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/vendors/profile', () => {
    it('should update vendor profile when authenticated as vendor', async () => {
      const response = await request(server)
        .put('/api/vendors/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Updated Vendor Name',
          phone: '0555555558'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Vendor Name');
      expect(response.body).toHaveProperty('phone', '0555555558');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .put('/api/vendors/profile')
        .send({
          name: 'Updated Vendor Name'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/vendors/dashboard', () => {
    it('should return vendor stats when authenticated as vendor', async () => {
      const response = await request(server)
        .get('/api/vendors/dashboard')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalProducts');
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('totalOrders');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/vendors/dashboard');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/vendors/orders', () => {
    it('should return vendor orders when authenticated as vendor', async () => {
      const response = await request(server)
        .get('/api/vendors/orders')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/vendors/orders');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/vendors/products', () => {
    it('should return vendor products when authenticated as vendor', async () => {
      const response = await request(server)
        .get('/api/vendors/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/vendors/products');

      expect(response.status).toBe(401);
    });
  });
}); 