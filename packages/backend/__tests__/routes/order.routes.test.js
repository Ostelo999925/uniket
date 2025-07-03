const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

// Set JWT secret for testing
process.env.JWT_SECRET = 'uniketSuperSecretKey';

describe('Order Routes', () => {
  let customerToken;
  let vendorToken;
  let testProduct;
  let testCustomer;
  let testVendor;
  let testOrder;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.orderrating.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testcustomer@test.com', 'testvendor@test.com']
        }
      }
    });

    // Create test vendor
    testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'testvendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: false,
        smsNotifications: false,
        updatedAt: new Date()
      }
    });

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'testcustomer@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '0987654321',
        profileComplete: 100,
        emailNotifications: false,
        smsNotifications: false,
        updatedAt: new Date()
      }
    });

    // Generate tokens
    vendorToken = jwt.sign(
      { id: testVendor.id, role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { id: testCustomer.id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        quantity: 100,
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

    // Create test order
    testOrder = await prisma.order.create({
      data: {
        productId: testProduct.id,
        customerId: testCustomer.id,
        quantity: 1,
        total: 99.99,
        status: 'Processing',
        deliveryMethod: 'Pickup',
        shippingAddress: JSON.stringify({
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        }),
        paymentMethod: 'CASH'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.orderrating.deleteMany({});
    await prisma.order.deleteMany({});
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

  describe('POST /api/orders', () => {
    it('should create a new order when authenticated as customer', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{
            productId: testProduct.id,
            quantity: 2
          }],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345'
          },
          paymentMethod: 'CASH'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('total', 199.98); // 99.99 * 2
      expect(response.body).toHaveProperty('status', 'Processing');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [{
            productId: testProduct.id,
            quantity: 1
          }],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345'
          },
          paymentMethod: 'CASH'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid order data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{
            productId: testProduct.id,
            quantity: 0 // Invalid quantity
          }],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345'
          },
          paymentMethod: 'CASH'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('should return customer orders when authenticated as customer', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('total');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return vendor orders when authenticated as vendor', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('total');
      expect(response.body[0]).toHaveProperty('status');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details when authenticated as customer', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testOrder.id);
      expect(response.body).toHaveProperty('total', testOrder.total);
      expect(response.body).toHaveProperty('status', testOrder.status);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/999999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status when authenticated as vendor', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Shipped' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'Shipped');

      // Verify the change in database
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      });
      expect(updatedOrder.status).toBe('Shipped');
    });

    it('should return 403 when authenticated as customer', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'Shipped' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/orders/:id/rate', () => {
    it('should create order rating when authenticated as customer', async () => {
      // First update the order status to Processing
      await request(app)
        .put(`/api/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Processing' });

      const response = await request(app)
        .post(`/api/orders/${testOrder.id}/rate`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          feedback: 'Great service!',
          categories: {
            delivery: 5,
            product: 5,
            communication: 5
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('rating', 5);
      expect(response.body).toHaveProperty('feedback', 'Great service!');
    });

    it('should return 400 for invalid rating data', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrder.id}/rate`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 6, // Invalid rating (should be 1-5)
          feedback: 'Great service!'
        });

      expect(response.status).toBe(400);
    });
  });
}); 