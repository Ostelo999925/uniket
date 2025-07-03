process.env.JWT_SECRET = 'uniketSuperSecretKey';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const getPrismaClient = require('../../src/prismaClient');
const prisma = getPrismaClient();

describe('Pickup Point Routes', () => {
  let adminToken;
  let testPickupPoint;
  let customerToken;

  beforeAll(async () => {
    // Clean up any existing test data first
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'testadmin123@test.com' },
          { email: 'testcustomer123@test.com' }
        ]
      }
    });

    await prisma.pickuppoint.deleteMany({
      where: {
        OR: [
          { name: 'Test Pickup Point' },
          { name: 'New Pickup Point' },
          { name: 'Updated Pickup Point' },
          { name: 'Greater Accra Point' }
        ]
      }
    });

    // Create test admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'testadmin123@test.com',
        password: 'hashedPassword',
        role: 'admin',
        phone: '1234567890',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });

    // Generate admin token with correct payload structure
    adminToken = jwt.sign(
      { 
        id: admin.id,
        role: 'admin',
        email: admin.email,
        name: admin.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test customer user
    const customer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'testcustomer123@test.com',
        password: 'hashedPassword',
        role: 'customer',
        phone: '0987654321',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });

    customerToken = jwt.sign(
      { 
        id: customer.id,
        role: 'customer',
        email: customer.email,
        name: customer.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test pickup point
    testPickupPoint = await prisma.pickuppoint.create({
      data: {
        name: 'Test Pickup Point',
        phone: '1234567890',
        region: 'Greater Accra',
        school: 'KTU',
        location: 'Getfund',
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Create a pickup point in Greater Accra region for the filter test
    await prisma.pickuppoint.create({
      data: {
        name: 'Greater Accra Point',
        phone: '1234567890',
        region: 'Greater Accra',
        school: 'KTU',
        location: 'Test Location',
        isActive: true,
        updatedAt: new Date()
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pickuppoint.deleteMany({
      where: {
        OR: [
          { id: testPickupPoint?.id },
          { name: 'Test Pickup Point' },
          { name: 'New Pickup Point' },
          { name: 'Updated Pickup Point' },
          { name: 'Greater Accra Point' }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'testadmin123@test.com' },
          { email: 'testcustomer123@test.com' }
        ]
      }
    });
  });

  describe('POST /api/pickup', () => {
    it('should create a new pickup point when authenticated as admin', async () => {
      const response = await request(app)
        .post('/api/pickup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Pickup Point',
          phone: '0987654321',
          region: 'Ashanti',
          school: 'KSTU',
          location: 'Ceremonial Grounds'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Pickup Point');
      expect(response.body).toHaveProperty('region', 'Ashanti');
      expect(response.body).toHaveProperty('isActive', true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/pickup')
        .send({
          name: 'New Pickup Point',
          phone: '0987654321',
          region: 'Ashanti',
          school: 'KSTU',
          location: 'Ceremonial Grounds'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid pickup point data', async () => {
      const response = await request(app)
        .post('/api/pickup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '', // Invalid empty name
          phone: 'invalid-phone',
          region: 'Invalid Region'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pickup', () => {
    it('should return all active pickup points', async () => {
      const response = await request(app)
        .get('/api/pickup');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('region');
      expect(response.body[0]).toHaveProperty('isActive');
    });

    it('should filter pickup points by region', async () => {
      const response = await request(app)
        .get('/api/pickup?region=Greater%20Accra');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].region).toBe('Greater Accra');
    });
  });

  describe('GET /api/pickup/:id', () => {
    it('should return pickup point details by id', async () => {
      const response = await request(app)
        .get(`/api/pickup/${testPickupPoint.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testPickupPoint.id);
      expect(response.body).toHaveProperty('name', testPickupPoint.name);
      expect(response.body).toHaveProperty('region', testPickupPoint.region);
    });

    it('should return 404 for non-existent pickup point', async () => {
      const response = await request(app)
        .get('/api/pickup/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/pickup/:id', () => {
    it('should update pickup point when authenticated as admin', async () => {
      const response = await request(app)
        .put(`/api/pickup/${testPickupPoint.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Pickup Point',
          location: 'New Location'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Pickup Point');
      expect(response.body).toHaveProperty('location', 'New Location');

      // Verify the change in database
      const updatedPickupPoint = await prisma.pickuppoint.findUnique({
        where: { id: testPickupPoint.id }
      });
      expect(updatedPickupPoint.name).toBe('Updated Pickup Point');
      expect(updatedPickupPoint.location).toBe('New Location');
    });

    it('should return 403 when not authenticated as admin', async () => {
      const response = await request(app)
        .put(`/api/pickup/${testPickupPoint.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Updated Pickup Point',
          location: 'New Location'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/pickup/:id', () => {
    it('should soft delete pickup point when authenticated as admin', async () => {
      const response = await request(app)
        .delete(`/api/pickup/${testPickupPoint.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isActive', false);

      // Verify the change in database
      const deletedPickupPoint = await prisma.pickuppoint.findUnique({
        where: { id: testPickupPoint.id }
      });
      expect(deletedPickupPoint.isActive).toBe(false);
    });

    it('should return 403 when not authenticated as admin', async () => {
      const response = await request(app)
        .delete(`/api/pickup/${testPickupPoint.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
    });
  });
}); 