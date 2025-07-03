// Load test environment variables first
process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });
process.env.JWT_SECRET = 'uniketSuperSecretKey';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRoutes = require('../../src/routes/user.routes');
const { authenticate } = require('../../src/middlewares/auth');
const getPrismaClient = require('../../src/prismaClient');

// Initialize Prisma client
const prisma = getPrismaClient();

// Setup test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);

let server;
let testUser;
let userToken;

describe('User Routes', () => {
  beforeAll(async () => {
    try {
      // Ensure Prisma is connected
      await prisma.$connect();
      console.log('Prisma connected in test setup');

      // Reset database
      await prisma.$transaction(async (tx) => {
        await tx.reviewreaction.deleteMany({});
        await tx.review.deleteMany({});
        await tx.cartitem.deleteMany({});
        await tx.bid.deleteMany({});
        await tx.orderrating.deleteMany({});
        await tx.ordertracking.deleteMany({});
        await tx.order.deleteMany({});
        await tx.product.deleteMany({});
        await tx.user.deleteMany({});
      });

      // Create test user
      const hashedPassword = await bcrypt.hash('testPassword123', 10);
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@test.com',
          password: hashedPassword,
          role: 'customer',
          phone: '1234567890',
          profileComplete: 100,
          updatedAt: new Date(),
          country: 'Ghana',
          emailNotifications: false,
          smsNotifications: false
        }
      });

      // Verify user was created and persisted
      const createdUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      console.log('Created test user:', createdUser);

      if (!createdUser) {
        throw new Error('Test user was not created properly');
      }

      // Generate token with correct user ID
      userToken = jwt.sign(
        { 
          id: createdUser.id,
          email: createdUser.email,
          role: createdUser.role,
          name: createdUser.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Start server
      server = await new Promise((resolve) => {
        const s = app.listen(0, () => {
          resolve(s);
        });
      });

    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Recreate test user if it doesn't exist
    const user = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('testPassword123', 10);
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@test.com',
          password: hashedPassword,
          role: 'customer',
          phone: '1234567890',
          profileComplete: 100,
          updatedAt: new Date(),
          country: 'Ghana',
          emailNotifications: false,
          smsNotifications: false
        }
      });

      // Regenerate token
      userToken = jwt.sign(
        { 
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          name: testUser.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await prisma.$transaction(async (tx) => {
        await tx.reviewreaction.deleteMany({});
        await tx.review.deleteMany({});
        await tx.cartitem.deleteMany({});
        await tx.bid.deleteMany({});
        await tx.orderrating.deleteMany({});
        await tx.ordertracking.deleteMany({});
        await tx.order.deleteMany({});
        await tx.product.deleteMany({});
        await tx.user.deleteMany({});
      });

      // Close server and disconnect Prisma
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await prisma.$disconnect();
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const response = await request(server)
        .post('/api/users/register')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
          role: 'customer',
          phone: '1234567891'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New User');
      expect(response.body).toHaveProperty('email', 'newuser@test.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 400 when email already exists', async () => {
      const response = await request(server)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123',
          role: 'customer',
          phone: '1234567890'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(server)
        .post('/api/users/register')
        .send({
          name: 'New User',
          email: 'newuser@test.com'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/users/login', () => {
    it('should login user with correct credentials', async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          email: 'test@test.com',
          password: 'testPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', testUser.id);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 with incorrect password', async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(server)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile when authenticated', async () => {
      const response = await request(server)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('name', 'Test User');
      expect(response.body).toHaveProperty('email', 'test@test.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile when authenticated', async () => {
      const response = await request(server)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          phone: '9876543210'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Name');
      expect(response.body).toHaveProperty('phone', '9876543210');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .put('/api/users/profile')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(server)
        .post('/api/users/forgot-password')
        .send({
          email: 'test@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should return 404 when email does not exist', async () => {
      const response = await request(server)
        .post('/api/users/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users/reset-password', () => {
    it('should reset password with valid token', async () => {
      // Note: In a real test, you would need to generate a valid reset token
      const response = await request(server)
        .post('/api/users/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset successful');
    });

    it('should return 400 with invalid token', async () => {
      const response = await request(server)
        .post('/api/users/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/users/change-password', () => {
    it('should change password when authenticated', async () => {
      const response = await request(server)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'testPassword123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .put('/api/users/change-password')
        .send({
          currentPassword: 'testPassword123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with incorrect current password', async () => {
      const response = await request(server)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
    });
  });
}); 