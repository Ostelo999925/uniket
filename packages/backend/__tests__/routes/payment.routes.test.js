const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

// Set JWT secret for testing
process.env.JWT_SECRET = 'uniketSuperSecretKey';

describe('Payment Routes', () => {
  let customerToken;
  let testCustomer;
  let testOrder;
  let testPayment;
  let paymentReference;

  beforeAll(async () => {
    // Get test user IDs first
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['customer@test.com', 'vendor@test.com']
        }
      },
      select: { id: true }
    });
    const testUserIds = testUsers.map(user => user.id);

    // Clean up any existing test data in reverse order of dependencies
    if (testUserIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.orderrating.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.ordertracking.deleteMany({
        where: {
          order: {
            customerId: {
              in: testUserIds
            }
          }
        }
      });

      await prisma.customerreport.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            { vendorId: { in: testUserIds } }
          ]
        }
      });

      await prisma.order.deleteMany({
        where: {
          customerId: {
            in: testUserIds
          }
        }
      });

      await prisma.cartitem.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.reviewreaction.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.review.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.productview.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.product.deleteMany({
        where: {
          vendorId: {
            in: testUserIds
          }
        }
      });

      await prisma.notification.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.loginattempt.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.useraction.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.supportchat.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.wallet.deleteMany({
        where: {
          userId: {
            in: testUserIds
          }
        }
      });

      await prisma.user.deleteMany({
        where: {
          id: {
            in: testUserIds
          }
        }
      });
    }

    // Create test customer
    testCustomer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: false,
        smsNotifications: false,
        updatedAt: new Date()
      }
    });

    // Create test vendor
    const testVendor = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        password: 'hashedPassword',
        role: 'vendor',
        phone: '1234567891',
        profileComplete: 100,
        emailNotifications: false,
        smsNotifications: false,
        updatedAt: new Date()
      }
    });

    // Create test product
    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Product Description',
        price: 100.00,
        quantity: 10,
        image: 'test.jpg',
        category: 'Test Category',
        vendorId: testVendor.id,
        updatedAt: new Date()
      }
    });

    // Create test order
    testOrder = await prisma.order.create({
      data: {
        productId: testProduct.id,
        customerId: testCustomer.id,
        quantity: 1,
        total: 100.00,
        status: 'PENDING',
        deliveryMethod: 'PICKUP'
      }
    });

    // Generate customer token
    customerToken = jwt.sign(
      { id: testCustomer.id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (testCustomer) {
      // Clean up test data in reverse order of dependencies
      await prisma.transaction.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.orderrating.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.ordertracking.deleteMany({
        where: {
          order: {
            customerId: testCustomer.id
          }
        }
      });

      await prisma.customerreport.deleteMany({
        where: {
          OR: [
            { userId: testCustomer.id },
            {
              vendorId: {
                in: await prisma.user.findMany({
                  where: {
                    email: {
                      in: ['customer@test.com', 'vendor@test.com']
                    }
                  },
                  select: { id: true }
                }).then(users => users.map(u => u.id))
              }
            }
          ]
        }
      });

      await prisma.order.deleteMany({
        where: {
          customerId: testCustomer.id
        }
      });

      await prisma.cartitem.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.reviewreaction.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.review.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.productview.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.product.deleteMany({
        where: {
          vendorId: {
            in: await prisma.user.findMany({
              where: {
                email: {
                  in: ['customer@test.com', 'vendor@test.com']
                }
              },
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        }
      });

      await prisma.notification.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.loginattempt.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.useraction.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.supportchat.deleteMany({
        where: {
          userId: testCustomer.id
        }
      });

      await prisma.wallet.deleteMany({
        where: {
          userId: {
            in: await prisma.user.findMany({
              where: {
                email: {
                  in: ['customer@test.com', 'vendor@test.com']
                }
              },
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        }
      });

      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['customer@test.com', 'vendor@test.com']
          }
        }
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/payments/initialize', () => {
    it('should initialize payment when authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/initialize')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrder.id,
          amount: 100.00,
          paymentMethod: 'CARD'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reference');
      expect(response.body).toHaveProperty('authorizationUrl');
      expect(response.body).toHaveProperty('accessCode');

      paymentReference = response.body.reference;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/initialize')
        .send({
          orderId: testOrder.id,
          amount: 100.00,
          paymentMethod: 'CARD'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when order does not exist', async () => {
      const response = await request(app)
        .post('/api/payments/initialize')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 99999,
          amount: 100.00,
          paymentMethod: 'CARD'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/verify', () => {
    it('should verify payment with valid reference', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reference: paymentReference
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Payment verified successfully');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .send({
          reference: paymentReference
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with invalid reference', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reference: 'invalid-reference'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/refund', () => {
    it('should process refund when authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: testOrder.id,
          reason: 'Customer request'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Refund processed successfully');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send({
          orderId: testOrder.id,
          reason: 'Customer request'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when order does not exist', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 99999,
          reason: 'Customer request'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payments/order/:orderId', () => {
    it('should return payment details for order when authenticated', async () => {
      const response = await request(app)
        .get(`/api/payments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orderId', testOrder.id);
      expect(response.body).toHaveProperty('amount', 100.00);
      expect(response.body).toHaveProperty('status');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/payments/order/${testOrder.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when order does not exist', async () => {
      const response = await request(app)
        .get('/api/payments/order/99999')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/payments/history', () => {
    it('should return payment history when authenticated', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('description');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/payments/history');

      expect(response.status).toBe(401);
    });
  });
}); 