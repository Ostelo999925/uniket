process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Review Routes', () => {
  let customerToken;
  let testCustomer;
  let testVendor;
  let testProduct;
  let testReview;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.reviewreaction.deleteMany({
      where: {
        OR: [
          { user: { email: 'customer@test.com' } },
          { user: { email: 'vendor@test.com' } }
        ]
      }
    });
    await prisma.review.deleteMany({
      where: {
        OR: [
          { user: { email: 'customer@test.com' } },
          { user: { email: 'vendor@test.com' } }
        ]
      }
    });
    await prisma.product.deleteMany({
      where: {
        user: {
          email: 'vendor@test.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'customer@test.com' },
          { email: 'vendor@test.com' }
        ]
      }
    });

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });

    // Create test vendor
    testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567891',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Product Description',
        price: 100.0,
        quantity: 50,
        image: 'test.jpg',
        category: 'Test Category',
        vendorId: testVendor.id,
        status: 'APPROVED',
        updatedAt: new Date()
      }
    });

    // Generate customer token with correct payload structure
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

    // Create test review
    testReview = await prisma.review.create({
      data: {
        productId: testProduct.id,
        userId: testCustomer.id,
        rating: 5,
        comment: 'Great product!',
        updatedAt: new Date()
      }
    });
  });

  afterAll(async () => {
    // Clean up test data in the correct order
    await prisma.reviewreaction.deleteMany({
      where: {
        OR: [
          { reviewId: testReview?.id },
          { user: { email: 'customer@test.com' } },
          { user: { email: 'vendor@test.com' } }
        ]
      }
    });
    await prisma.review.deleteMany({
      where: {
        OR: [
          { id: testReview?.id },
          { userId: testCustomer?.id }
        ]
      }
    });
    await prisma.product.deleteMany({
      where: {
        user: {
          email: 'vendor@test.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'customer@test.com' },
          { email: 'vendor@test.com' }
        ]
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/reviews', () => {
    it('should create or update a review when authenticated', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct.id,
          rating: 5,
          comment: 'Great product!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('rating', 5);
      expect(response.body).toHaveProperty('comment', 'Great product!');
      expect(response.body).toHaveProperty('productId', testProduct.id);
      expect(response.body).toHaveProperty('userId', testCustomer.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          productId: testProduct.id,
          rating: 5,
          comment: 'Great product!'
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: 99999,
          rating: 5,
          comment: 'Great product!'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/reviews/product/:productId', () => {
    it('should return reviews for a product', async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct.id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id', testReview.id);
      expect(response.body[0]).toHaveProperty('user');
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .get('/api/reviews/product/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should update review when authenticated', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 4,
          comment: 'Updated review'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rating', 4);
      expect(response.body).toHaveProperty('comment', 'Updated review');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .send({
          rating: 4,
          comment: 'Updated review'
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when review does not exist', async () => {
      const response = await request(app)
        .put('/api/reviews/99999')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 4,
          comment: 'Updated review'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/reviews/:id/reactions', () => {
    it('should add reaction to review when authenticated', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/reactions`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          type: 'like'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reaction');
      expect(response.body.reaction).toHaveProperty('type', 'like');
      expect(response.body.reaction).toHaveProperty('userId', testCustomer.id);
      expect(response.body.reaction).toHaveProperty('reviewId', testReview.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/reactions`)
        .send({
          type: 'like'
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when review does not exist', async () => {
      const response = await request(app)
        .post('/api/reviews/99999/reactions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          type: 'like'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should delete review when authenticated', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Review deleted successfully');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when review does not exist', async () => {
      const response = await request(app)
        .delete('/api/reviews/99999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 