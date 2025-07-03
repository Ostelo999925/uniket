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
const productRoutes = require('../../src/routes/product.routes');
const { authenticate, authorize } = require('../../src/middlewares/auth');
const getPrismaClient = require('../../src/prismaClient');
const fs = require('fs');
const multer = require('multer');

// Initialize Prisma client
const prisma = getPrismaClient();

// Setup test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/products', productRoutes);

let server;
let testVendor;
let testCustomer;
let testAdmin;
let vendorToken;
let customerToken;
let adminToken;
let createdProduct;
let testImagePath;

// Mock multer for file uploads
jest.mock('multer', () => {
  const mockMulter = () => ({
    single: () => (req, res, next) => {
      // Create a mock file object
      req.file = {
        fieldname: 'image',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: 'uploads/products',
        filename: 'test-image.jpg',
        path: 'uploads/products/test-image.jpg',
        size: 1024
      };

      // Parse form fields and convert types
      const formFields = { ...req.body };
      
      // Convert string values to appropriate types
      if (formFields.price) {
        formFields.price = parseFloat(formFields.price);
      }
      if (formFields.quantity) {
        formFields.quantity = parseInt(formFields.quantity, 10);
      }
      if (formFields.enableBidding) {
        formFields.enableBidding = formFields.enableBidding === 'true';
      }
      if (formFields.startingBid) {
        formFields.startingBid = parseFloat(formFields.startingBid);
      }
      if (formFields.bidEndDate) {
        formFields.bidEndDate = new Date(formFields.bidEndDate);
      }
      if (formFields.updatedAt) {
        formFields.updatedAt = new Date(formFields.updatedAt);
      }
      
      req.body = formFields;
      next();
    }
  });

  mockMulter.diskStorage = () => ({
    _handleFile: (req, file, cb) => {
      cb(null, {
        fieldname: 'image',
        originalname: 'test-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: 'uploads/products',
        filename: 'test-image.jpg',
        path: 'uploads/products/test-image.jpg',
        size: 1024
      });
    },
    _removeFile: (req, file, cb) => {
      cb(null);
    }
  });

  return mockMulter;
});

// Mock auth middleware
jest.mock('../../src/middlewares/auth', () => {
  const jwt = require('jsonwebtoken');
  return {
    authenticate: (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    },
    authorize: (roles) => (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      next();
    }
  };
});

// Mock cache middleware
jest.mock('../../src/middlewares/cache', () => ({
  cacheMiddleware: (duration) => (req, res, next) => next(),
  clearCache: () => Promise.resolve(),
  clearAllCache: () => Promise.resolve()
}));

// Mock rate limiter middleware
jest.mock('../../src/middlewares/rateLimiter', () => ({
  apiLimiter: (req, res, next) => next(),
  sensitiveOperationLimiter: (req, res, next) => next()
}));

// Mock sanitizer middleware
jest.mock('../../src/middlewares/sanitizer', () => ({
  sanitizeRequest: () => (req, res, next) => next(),
  productValidationRules: (req, res, next) => next(),
  productUpdateValidationRules: (req, res, next) => next()
}));

beforeAll(async () => {
  // Ensure Prisma is connected
  await prisma.$connect();
  console.log('Prisma connected in test setup');

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../../uploads/products');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create admin user
  testAdmin = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'admin@test.com',
      password: await bcrypt.hash('password123', 10),
      role: 'admin',
      phone: '1234567890',
      profileComplete: 1,
      country: 'Test Country',
      emailNotifications: true,
      smsNotifications: true,
      updatedAt: new Date(),
      createdAt: new Date()
    }
  });

  adminToken = jwt.sign(
    { id: testAdmin.id, role: testAdmin.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  // Start server
  server = app.listen(3001);
});

beforeEach(async () => {
  // Create test users
  testVendor = await prisma.user.create({
    data: {
      name: 'Test Vendor',
      email: 'testvendor@test.com',
      password: await bcrypt.hash('password123', 10),
      role: 'vendor',
      phone: '1234567890',
      profileComplete: 1,
      country: 'Ghana',
      updatedAt: new Date()
    }
  });

  testCustomer = await prisma.user.create({
    data: {
      name: 'Test Customer',
      email: 'testcustomer@test.com',
      password: await bcrypt.hash('password123', 10),
      role: 'customer',
      phone: '0987654321',
      profileComplete: 1,
      country: 'Ghana',
      updatedAt: new Date()
    }
  });

  // Generate tokens
  vendorToken = jwt.sign(
    { id: testVendor.id, role: testVendor.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  customerToken = jwt.sign(
    { id: testCustomer.id, role: testCustomer.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterEach(async () => {
  // Clean up test data
  await prisma.$transaction([
    prisma.reviewreaction.deleteMany(),
    prisma.review.deleteMany(),
    prisma.cartitem.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.orderrating.deleteMany(),
    prisma.ordertracking.deleteMany(),
    prisma.order.deleteMany(),
    prisma.product.deleteMany()
  ]);
});

afterAll(async () => {
  // Clean up users and close connections
  await prisma.$transaction([
    prisma.reviewreaction.deleteMany(),
    prisma.review.deleteMany(),
    prisma.cartitem.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.orderrating.deleteMany(),
    prisma.ordertracking.deleteMany(),
    prisma.order.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany()
  ]);
  
  // Close server and database connection
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

describe('Product Routes', () => {
  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', '100')
        .field('category', 'Test Category')
        .field('quantity', '10')
        .field('enableBidding', 'false')
        .field('status', 'APPROVED')
        .field('updatedAt', new Date().toISOString())
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Product');
      expect(response.body.vendorId).toBe(testVendor.id);
    });

    it('should not allow customer to create product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', '100')
        .field('category', 'Test Category')
        .field('quantity', '10')
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized');
    });
  });

  describe('GET /api/products', () => {
    it('should get all products', async () => {
      // Create a test product first
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', '100')
        .field('category', 'Test Category')
        .field('quantity', '10')
        .field('enableBidding', 'false')
        .field('status', 'APPROVED')
        .field('updatedAt', new Date().toISOString())
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    let testProduct;

    beforeEach(async () => {
      // Create a test product for this test suite
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', '100')
        .field('category', 'Test Category')
        .field('quantity', '10')
        .field('enableBidding', 'false')
        .field('status', 'APPROVED')
        .field('updatedAt', new Date().toISOString())
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });
      testProduct = createResponse.body;
    });

    it('should get product by id', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testProduct.id);
      expect(response.body.vendorId).toBe(testVendor.id);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/999999')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    let testProduct;

    beforeEach(async () => {
      // Create a test product for this test suite
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', '100')
        .field('category', 'Test Category')
        .field('quantity', '10')
        .field('enableBidding', 'false')
        .field('status', 'PENDING')
        .field('updatedAt', new Date().toISOString())
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });
      testProduct = createResponse.body;
    });

    it('should update product', async () => {
      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('name', 'Updated Product')
        .field('description', 'Updated Description')
        .field('price', '200')
        .field('category', 'Updated Category')
        .field('quantity', '20')
        .field('enableBidding', 'false')
        .field('status', testProduct.status)
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Product');
      expect(response.body.description).toBe('Updated Description');
      expect(response.body.price).toBe(200);
      expect(response.body.category).toBe('Updated Category');
      expect(response.body.quantity).toBe(20);
      expect(response.body.vendorId).toBe(testVendor.id);
    });

    it('should not allow customer to update product', async () => {
      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .field('name', 'Updated Product')
        .field('description', 'Updated Description')
        .field('price', '200')
        .field('category', 'Updated Category')
        .field('quantity', '20')
        .field('enableBidding', 'false')
        .field('status', 'PENDING')
        .field('updatedAt', new Date().toISOString())
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let testProduct;

    beforeEach(async () => {
      // Create a test product for this test suite
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('name', 'Test Product')
        .field('description', 'Test Description')
        .field('price', '100')
        .field('category', 'Test Category')
        .field('quantity', '10')
        .field('enableBidding', 'false')
        .field('status', 'APPROVED')
        .field('updatedAt', new Date().toISOString())
        .attach('image', Buffer.from('test image'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });
      testProduct = createResponse.body;
    });

    it('should delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
    });

    it('should not allow customer to delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized');
    });
  });
});