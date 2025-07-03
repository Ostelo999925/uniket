// Set environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'uniketSuperSecretKey';

// Mock PrismaClient
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn()
  },
  product: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn()
  },
  order: {
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  ticket: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn()
  }
};

jest.mock('../../src/prismaClient', () => {
  return jest.fn(() => mockPrisma);
});

jest.mock('../../src/utils/ticket', () => {
  const original = jest.requireActual('../../src/utils/ticket');
  return {
    ...original,
    verifyTicket: (qrCode) => original.verifyTicket(qrCode, mockPrisma),
    markTicketAsUsed: (ticketId) => original.markTicketAsUsed(ticketId, mockPrisma),
    generateQRCode: original.generateQRCode,
    generateTicketNumber: original.generateTicketNumber,
  };
});

jest.resetModules(); // Ensure all modules use the mock

const request = require('supertest');
const express = require('express');
const { app } = require('../../src/app');
const jwt = require('jsonwebtoken');
const { generateQRCode, generateTicketNumber } = require('../../src/utils/ticket');
const getPrismaClient = require('../../src/prismaClient');

// Get a single Prisma instance for all requests
const prisma = getPrismaClient();
let server;

describe('Ticket Routes', () => {
  let testVendor;
  let testCustomer;
  let testProduct;
  let testOrder;
  let testTicket;
  let vendorToken;
  let customerToken;
  let otherVendorToken;

  beforeAll(async () => {
    // Create test vendor
    testVendor = {
      id: 1,
      name: 'Test Vendor',
      email: 'testvendor@test.com',
      password: 'password123',
      role: 'vendor',
      phone: '1234567890',
      updatedAt: new Date()
    };
    mockPrisma.user.create.mockResolvedValue(testVendor);

    // Create test customer
    testCustomer = {
      id: 2,
        name: 'Test Customer',
      email: 'testcustomer@test.com',
      password: 'password123',
        role: 'customer',
      phone: '0987654321',
      updatedAt: new Date()
    };
    mockPrisma.user.create.mockResolvedValue(testCustomer);

    // Create another vendor for testing unauthorized access
    const otherVendor = {
      id: 3,
      name: 'Other Vendor',
      email: 'othervendor@test.com',
      password: 'password123',
      role: 'vendor',
      phone: '5555555555',
      updatedAt: new Date()
    };
    mockPrisma.user.create.mockResolvedValue(otherVendor);

    // Create test product (event)
    testProduct = {
      id: 1,
      name: 'Test Event',
      description: 'Test Event Description',
      price: 100,
      image: 'test.jpg',
      category: 'Events',
      vendorId: testVendor.id,
      isTicket: true,
      updatedAt: new Date(),
      ticketdetails: {
        id: 1,
        productId: 1,
        eventName: 'Test Event',
        eventDate: new Date(Date.now() + 86400000), // Tomorrow
        eventLocation: 'Test Location',
        ticketType: 'General Admission',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000), // Tomorrow
        terms: 'Test terms and conditions',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    mockPrisma.product.create.mockResolvedValue(testProduct);

    // Create test order
    testOrder = {
      id: 1,
      productId: testProduct.id,
      customerId: testCustomer.id,
      quantity: 1,
      total: 100,
      status: 'Processing'
    };
    mockPrisma.order.create.mockResolvedValue(testOrder);

    // Create test ticket
    const ticketNumber = generateTicketNumber();
    const qrCode = await generateQRCode({
      ticketNumber,
      productId: testProduct.id,
      userId: testCustomer.id
    });

    testTicket = {
      id: 1,
      ticketNumber,
      qrCode,
      productId: testProduct.id,
      orderId: testOrder.id,
      userId: testCustomer.id,
      status: 'VALID',
      updatedAt: new Date()
    };
    mockPrisma.ticket.create.mockResolvedValue(testTicket);

    // Mock findUnique for user lookup
    mockPrisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === testVendor.id) return Promise.resolve(testVendor);
      if (where.id === testCustomer.id) return Promise.resolve(testCustomer);
      if (where.id === otherVendor.id) return Promise.resolve(otherVendor);
      return Promise.resolve(null);
    });

    // Mock findFirst for product ownership check
    mockPrisma.product.findFirst.mockImplementation(({ where }) => {
      if (where.id === testProduct.id && where.vendorId === testVendor.id) {
        return Promise.resolve(testProduct);
      }
      if (where.id === testProduct.id && where.vendorId === 3) { // other vendor
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    // Mock findFirst for ticket lookup
    mockPrisma.ticket.findFirst.mockImplementation(({ where, include }) => {
      if (where.qrCode === testTicket.qrCode) {
        const ticket = {
          ...testTicket,
          product: {
            ...testProduct,
            ticketdetails: testProduct.ticketdetails
          },
          user: testCustomer
        };
        return Promise.resolve(ticket);
      }
      return Promise.resolve(null);
    });

    // Mock findUnique for ticket lookup by ID
    mockPrisma.ticket.findUnique.mockImplementation(({ where, include }) => {
      if (where.id === testTicket.id) {
        const ticket = {
          ...testTicket,
          product: {
            ...testProduct,
            ticketdetails: testProduct.ticketdetails
          },
          user: testCustomer
        };
        return Promise.resolve(ticket);
      }
      return Promise.resolve(null);
    });

    // Mock findMany for getting event tickets
    mockPrisma.ticket.findMany.mockResolvedValue([{
      ...testTicket,
      product: {
        ...testProduct,
        ticketdetails: testProduct.ticketdetails
      },
      user: testCustomer
    }]);

    // Mock update for marking ticket as used
    mockPrisma.ticket.update.mockImplementation(({ where, data }) => {
      if (where.id === testTicket.id) {
        const updatedTicket = {
          ...testTicket,
          ...data,
          product: {
            ...testProduct,
            ticketdetails: testProduct.ticketdetails
          },
          user: testCustomer
        };
        return Promise.resolve(updatedTicket);
      }
      return Promise.resolve(null);
    });

    // Generate JWT tokens
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

    otherVendorToken = jwt.sign(
      { id: otherVendor.id, role: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create server instance
    server = app.listen(0);
  });

  afterAll(async () => {
    // Close server
    await new Promise((resolve) => server.close(resolve));

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/tickets/verify', () => {
    it('should verify a valid ticket', async () => {
      const response = await request(server)
        .post('/api/tickets/verify')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ qrCode: testTicket.qrCode });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ticket');
      expect(response.body.ticket.id).toBe(testTicket.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .post('/api/tickets/verify')
        .send({ qrCode: testTicket.qrCode });

      expect(response.status).toBe(401);
    });

    it('should return 403 when verified by non-event owner', async () => {
      const response = await request(server)
        .post('/api/tickets/verify')
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send({ qrCode: testTicket.qrCode });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid QR code', async () => {
      const response = await request(server)
        .post('/api/tickets/verify')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ qrCode: 'invalid-qr-code' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/tickets/:ticketId/use', () => {
    it('should mark a valid ticket as used', async () => {
      const response = await request(server)
        .post(`/api/tickets/${testTicket.id}/use`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ticket');
      expect(response.body.ticket.status).toBe('USED');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .post(`/api/tickets/${testTicket.id}/use`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when used by non-event owner', async () => {
      const response = await request(server)
        .post(`/api/tickets/${testTicket.id}/use`)
        .set('Authorization', `Bearer ${otherVendorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent ticket', async () => {
      const response = await request(server)
        .post('/api/tickets/999999/use')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tickets/event/:productId', () => {
    it('should get all tickets for an event', async () => {
      const response = await request(server)
        .get(`/api/tickets/event/${testProduct.id}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(response.body.tickets.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .get(`/api/tickets/event/${testProduct.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when accessed by non-event owner', async () => {
      const response = await request(server)
        .get(`/api/tickets/event/${testProduct.id}`)
        .set('Authorization', `Bearer ${otherVendorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for non-existent event', async () => {
      const response = await request(server)
        .get('/api/tickets/event/999999')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
    });
  });
});