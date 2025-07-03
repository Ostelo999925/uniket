process.env.NODE_ENV = 'test';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.test') });
process.env.JWT_SECRET = 'uniketSuperSecretKey';
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const adminRoutes = require('../../src/routes/admin.routes');
const getPrismaClient = require('../../src/prismaClient');
const { authenticate, authorize } = require('../../src/middlewares/auth');

describe('Admin Routes', () => {
  let app;
  let prisma;
  let adminToken;
  let vendorToken;
  let testAdmin;
  let testVendor;

  beforeAll(async () => {
    // Get a single Prisma instance
    prisma = getPrismaClient();
    
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: {
        email: { in: ['admin@test.com', 'vendor@test.com'] }
      }
    });
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(cors());
    
    // Add auth middleware
    app.use('/api/admin', authenticate, authorize(['admin']), adminRoutes);
    
    // Create test users without transaction to ensure they are committed
    // Create admin user
    testAdmin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        name: 'Test Admin',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });

    // Create vendor user
    testVendor = await prisma.user.create({
      data: {
        email: 'vendor@test.com',
        password: 'password123',
        role: 'vendor',
        name: 'Test Vendor',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });
    
    // Generate tokens with the correct payload structure
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

    // Verify users exist and log their details
    const adminExists = await prisma.user.findUnique({
      where: { id: testAdmin.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });
    const vendorExists = await prisma.user.findUnique({
      where: { id: testVendor.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });

    console.log('Admin exists:', adminExists);
    console.log('Vendor exists:', vendorExists);
    console.log('Admin token payload:', jwt.decode(adminToken));
    console.log('Vendor token payload:', jwt.decode(vendorToken));

    // Add more detailed logging
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });
    console.log('All users in database:', allUsers);

    if (!adminExists || !vendorExists) {
      throw new Error('Test users not created successfully');
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testAdmin.id, testVendor.id]
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/admin/users', () => {
    it('should return all users when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('role');
    });

    it('should return 403 when authenticated as vendor', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${vendorToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return user details when authenticated as admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${testVendor.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
    });
  });
});