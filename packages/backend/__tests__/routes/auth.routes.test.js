// Load test environment variables first
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const authRoutes = require('../../src/routes/auth.routes');
const getPrismaClient = require('../../src/prismaClient');

// Setup middleware and routes
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Routes', () => {
  let testUser;
  let server;
  let prisma;
  let testUserPassword = 'testPassword123';

  beforeAll(async () => {
    try {
      // Get Prisma instance
      prisma = getPrismaClient();
      
      // Log environment variables for debugging
      console.log('JWT_SECRET:', process.env.JWT_SECRET);
      console.log('Using database URL:', process.env.TEST_DATABASE_URL || 'mysql://root:OsTelO05!@localhost:3306/uniket_test');

      // Start server on a random port
      server = await new Promise((resolve) => {
        const s = app.listen(0, () => {
          resolve(s);
        });
      });

      // Clean up any existing test data
      await prisma.user.deleteMany({
        where: { email: 'test@example.com' }
      });

      // Create test user with hashed password
      const hashedPassword = await bcrypt.hash(testUserPassword, 10);
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'customer',
          phone: '0555555555',
          profileComplete: 100,
          emailNotifications: true,
          smsNotifications: true,
          updatedAt: new Date()
        }
      });

      console.log('Created test user:', testUser);

      // Verify user was created and can be found
      const createdUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      console.log('Verified created user:', createdUser);

      if (!createdUser) {
        throw new Error('Test user was not created successfully');
      }

    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Close server first
      if (server) {
        await new Promise((resolve) => {
          server.close(() => {
            resolve();
          });
        });
      }

      // Clean up test data
      if (testUser) {
        await prisma.user.deleteMany({
          where: { email: 'test@example.com' }
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Generate a unique email using timestamp
      const uniqueEmail = `newuser${Date.now()}@example.com`;
      
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: uniqueEmail,
          password: 'password123',
          phone: '0555555556'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', uniqueEmail);
    });

    it('should return 400 for invalid registration data', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid-email',
          password: '123',
          phone: '0555555557'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for existing email', async () => {
      // First create a user
      await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Existing User',
          email: 'existing@example.com',
          password: 'password123',
          phone: '0555555558'
        });

      // Try to create another user with same email
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'existing@example.com',
          password: 'password123',
          phone: '0555555559'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Verify test user exists before each test
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });

      if (!user) {
        // Recreate test user if it doesn't exist
        const hashedPassword = await bcrypt.hash(testUserPassword, 10);
        testUser = await prisma.user.create({
          data: {
            name: 'Test User',
            email: 'test@example.com',
            password: hashedPassword,
            role: 'customer',
            phone: '0555555555',
            profileComplete: 100,
            emailNotifications: true,
            smsNotifications: true,
            updatedAt: new Date()
          }
        });
        console.log('Recreated test user:', testUser);
      }
    });

    it('should login successfully with correct credentials', async () => {
      // Verify user exists before login
      const userBeforeLogin = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });
      console.log('User before login:', userBeforeLogin);

      if (!userBeforeLogin) {
        throw new Error('Test user not found before login attempt');
      }

      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: testUserPassword
        });

      console.log('Login response:', {
        status: response.status,
        body: response.body
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');

      // Store the token for the /me endpoint test
      testUser.token = response.body.token;
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // First ensure test user exists
      testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });

      if (!testUser) {
        // Create test user if it doesn't exist
        const hashedPassword = await bcrypt.hash(testUserPassword, 10);
        testUser = await prisma.user.create({
          data: {
            name: 'Test User',
            email: 'test@example.com',
            password: hashedPassword,
            role: 'customer',
            phone: '0555555555',
            profileComplete: 100,
            emailNotifications: true,
            smsNotifications: true,
            updatedAt: new Date()
          }
        });
      }

      // Generate a new token for each test
      authToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: 'customer' },
        process.env.JWT_SECRET || 'uniketSuperSecretKey'
      );
    });

    it('should return user profile when authenticated', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('role', 'customer');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 