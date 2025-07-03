const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

// Set JWT secret for testing
process.env.JWT_SECRET = 'uniketSuperSecretKey';

describe('Cart Routes', () => {
  let customerToken;
  let testCustomer;
  let testProduct;
  let testCartItem;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.cartitem.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testcustomer@test.com', 'testvendor@test.com']
        }
      }
    });

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'testcustomer@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '1234567890',
        updatedAt: new Date()
      }
    });

    // Create test vendor
    const testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'testvendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567891',
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
        updatedAt: new Date(),
        isFlagged: false,
        views: 0,
        enableBidding: false
      }
    });

    // Generate customer token
    customerToken = jwt.sign(
      { id: testCustomer.id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create initial cart item for testing
    testCartItem = await prisma.cartitem.create({
      data: {
        userId: testCustomer.id,
        productId: testProduct.id,
        quantity: 1
      },
      include: {
        product: true
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.cartitem.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testcustomer@test.com', 'testvendor@test.com']
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/cart', () => {
    it('should add item to cart when authenticated', async () => {
      // First delete the existing cart item
      await prisma.cartitem.delete({
        where: { id: testCartItem.id }
      });

      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct.id,
          quantity: 2
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('quantity', 2);
      expect(response.body).toHaveProperty('productId', testProduct.id);
      expect(response.body).toHaveProperty('userId', testCustomer.id);

      // Update testCartItem with the new item
      testCartItem = response.body;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({
          productId: testProduct.id,
          quantity: 1
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: 99999,
          quantity: 1
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/cart', () => {
    it('should return cart items when authenticated', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('product');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/cart');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/cart/:id', () => {
    it('should update cart item quantity when authenticated', async () => {
      const response = await request(app)
        .put(`/api/cart/${testCartItem.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 3
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quantity', 3);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/cart/${testCartItem.id}`)
        .send({
          quantity: 3
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when cart item does not exist', async () => {
      const response = await request(app)
        .put('/api/cart/99999')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 3
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/cart/:id', () => {
    it('should delete cart item when authenticated', async () => {
      const response = await request(app)
        .delete(`/api/cart/${testCartItem.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Item removed from cart');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/cart/${testCartItem.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when cart item does not exist', async () => {
      const response = await request(app)
        .delete('/api/cart/99999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 