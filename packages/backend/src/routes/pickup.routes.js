const express = require('express');
const router = express.Router();
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { authenticate, authorize } = require('../middlewares/auth');

// Get all active pickup points
router.get('/', async (req, res) => {
  console.log('Fetching pickup points...');
  try {
    const { region } = req.query;
    const where = { isActive: true };
    if (region) {
      where.region = region;
    }

    const pickupPoints = await prisma.pickuppoint.findMany({
      where,
      orderBy: { region: 'asc' }
    });
    console.log('Found pickup points:', pickupPoints);
    res.json(pickupPoints);
  } catch (error) {
    console.error('Error fetching pickup points:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pickup points',
      details: error.message 
    });
  }
});

// Get pickup point by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pickupPoint = await prisma.pickuppoint.findUnique({
      where: { id: Number(id) }
    });

    if (!pickupPoint) {
      return res.status(404).json({ error: 'Pickup point not found' });
    }

    res.json(pickupPoint);
  } catch (error) {
    console.error('Error fetching pickup point:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pickup point',
      details: error.message 
    });
  }
});

// Admin: Add new pickup point
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { name, region, school, location, phone } = req.body;

    // Validate required fields
    if (!name || !region || !school || !location || !phone) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'name, region, school, location, and phone are required'
      });
    }

    const pickupPoint = await prisma.pickuppoint.create({
      data: { 
        name,
        region,
        school,
        location,
        phone,
        isActive: true,
        updatedAt: new Date()
      }
    });
    res.status(201).json(pickupPoint);
  } catch (error) {
    console.error('Error creating pickup point:', error);
    res.status(500).json({ 
      error: 'Failed to create pickup point',
      details: error.message 
    });
  }
});

// Admin: Update pickup point
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region, school, location, phone, isActive } = req.body;

    // Check if pickup point exists
    const existingPickupPoint = await prisma.pickuppoint.findUnique({
      where: { id: Number(id) }
    });

    if (!existingPickupPoint) {
      return res.status(404).json({ error: 'Pickup point not found' });
    }

    const pickupPoint = await prisma.pickuppoint.update({
      where: { id: Number(id) },
      data: { 
        name,
        region,
        school,
        location,
        phone,
        isActive,
        updatedAt: new Date()
      }
    });
    res.json(pickupPoint);
  } catch (error) {
    console.error('Error updating pickup point:', error);
    res.status(500).json({ 
      error: 'Failed to update pickup point',
      details: error.message 
    });
  }
});

// Admin: Delete pickup point (soft delete)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if pickup point exists
    const existingPickupPoint = await prisma.pickuppoint.findUnique({
      where: { id: Number(id) }
    });

    if (!existingPickupPoint) {
      return res.status(404).json({ error: 'Pickup point not found' });
    }

    const pickupPoint = await prisma.pickuppoint.update({
      where: { id: Number(id) },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });
    res.json(pickupPoint);
  } catch (error) {
    console.error('Error deleting pickup point:', error);
    res.status(500).json({ 
      error: 'Failed to delete pickup point',
      details: error.message 
    });
  }
});

module.exports = router; 