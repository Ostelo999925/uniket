const express = require('express');
const router = express.Router();
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { authenticate, authorize } = require('../middlewares/auth');

// Get bid history for a user (protected route)
router.get('/user/bids', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bids = await prisma.bid.findMany({
      where: { 
        userId: Number(userId)
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currentBid: true,
            enableBidding: true,
            startingBid: true,
            bidEndDate: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedBids = bids.map(bid => ({
      id: bid.id,
      amount: bid.amount,
      status: bid.status,
      createdAt: bid.createdAt,
      product: bid.product
    }));

    return res.status(200).json(formattedBids);
  } catch (error) {
    console.error('Error fetching user bids:', error);
    return res.status(500).json({ message: 'Failed to fetch user bids' });
  }
});

// Get vendor's active bids (protected route)
router.get('/vendor/active-bids', authenticate, authorize(['vendor']), async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify vendor has products
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId: Number(vendorId) }
    });

    if (!vendorProducts.length) {
      return res.status(404).json({ error: 'No products found for this vendor' });
    }
    
    const bids = await prisma.bid.findMany({
      where: {
        product: {
          vendorId: Number(vendorId)
        },
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currentBid: true,
            startingBid: true,
            bidEndDate: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(bids);
  } catch (error) {
    console.error('Error fetching vendor bids:', error);
    res.status(500).json({ message: 'Failed to fetch vendor bids' });
  }
});

// Get all bids for a product (public route)
router.get('/product/:productId/bids', async (req, res) => {
  try {
    const { productId } = req.params;
    const parsedProductId = parseInt(productId);

    if (isNaN(parsedProductId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    const product = await prisma.product.findUnique({
      where: { 
        id: parsedProductId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const bids = await prisma.bid.findMany({
      where: { 
        productId: parsedProductId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(bids);
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ message: "Failed to fetch bids" });
  }
});

// Place a bid - customers only
router.post('/product/:productId/place', authenticate, authorize(['customer']), async (req, res) => {
  try {
    const { productId } = req.params;
    const parsedProductId = parseInt(productId);
    const { amount } = req.body;
    const userId = req.user.id;

    if (isNaN(parsedProductId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid bid amount' });
    }

    const product = await prisma.product.findUnique({
      where: { 
        id: parsedProductId
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.enableBidding) {
      return res.status(400).json({ error: 'Bidding is not enabled for this product' });
    }

    if (product.bidEndDate && new Date(product.bidEndDate) < new Date()) {
      return res.status(400).json({ error: 'Bidding period has ended' });
    }

    if (product.currentBid && Number(amount) <= product.currentBid) {
      return res.status(400).json({ error: 'Bid amount must be higher than current bid' });
    }

    const bid = await prisma.bid.create({
      data: {
        amount: Number(amount),
        userId: Number(userId),
        productId: parsedProductId,
        status: 'PENDING'
      }
    });

    // Update product's current bid
    await prisma.product.update({
      where: { id: parsedProductId },
      data: { currentBid: Number(amount) }
    });

    res.status(201).json(bid);
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ message: 'Failed to place bid' });
  }
});

// Accept a bid - vendors only
router.put('/bid/:bidId/accept', authenticate, authorize(['vendor']), async (req, res) => {
  try {
    const { bidId } = req.params;
    const parsedBidId = parseInt(bidId);
    const vendorId = req.user.id;

    if (isNaN(parsedBidId)) {
      return res.status(400).json({ error: 'Invalid bid ID' });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: parsedBidId },
      include: {
        product: true
      }
    });

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.product.vendorId !== vendorId) {
      return res.status(403).json({ error: 'Not authorized to accept this bid' });
    }

    const updatedBid = await prisma.bid.update({
      where: { id: parsedBidId },
      data: { status: 'ACCEPTED' }
    });

    res.json(updatedBid);
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ message: 'Failed to accept bid' });
  }
});

// Reject a bid - vendors only
router.put('/bid/:bidId/reject', authenticate, authorize(['vendor']), async (req, res) => {
  try {
    const { bidId } = req.params;
    const parsedBidId = parseInt(bidId);
    const vendorId = req.user.id;

    if (isNaN(parsedBidId)) {
      return res.status(400).json({ error: 'Invalid bid ID' });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: parsedBidId },
      include: {
        product: true
      }
    });

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    if (bid.product.vendorId !== vendorId) {
      return res.status(403).json({ error: 'Not authorized to reject this bid' });
    }

    const updatedBid = await prisma.bid.update({
      where: { id: parsedBidId },
      data: { status: 'REJECTED' }
    });

    res.json(updatedBid);
  } catch (error) {
    console.error('Error rejecting bid:', error);
    res.status(500).json({ message: 'Failed to reject bid' });
  }
});

module.exports = router;
