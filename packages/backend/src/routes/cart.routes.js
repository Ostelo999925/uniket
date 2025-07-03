const express = require('express');
const router = express.Router();
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const { authenticate } = require('../middlewares/auth');

// Protected routes - all cart operations require authentication
router.use(authenticate);

// Get cart
router.get('/',
  cacheMiddleware(60),
  async (req, res) => {
    try {
      const cartItems = await prisma.cartitem.findMany({
        where: { userId: req.user.id },
        include: {
          product: true
        }
      });
      res.json(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ error: 'Failed to fetch cart' });
    }
  }
);

// Add item to cart
router.post('/',
  sensitiveOperationLimiter,
  async (req, res) => {
    try {
      const { productId, quantity } = req.body;

      // Validate input
      if (!productId || !quantity) {
        return res.status(400).json({ error: 'Product ID and quantity are required' });
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if product is already in cart
      const existingItem = await prisma.cartitem.findUnique({
        where: {
          userId_productId: {
            userId: req.user.id,
            productId: parseInt(productId)
          }
        }
      });

      if (existingItem) {
        // Update quantity
        const updatedItem = await prisma.cartitem.update({
          where: {
            userId_productId: {
              userId: req.user.id,
              productId: parseInt(productId)
            }
          },
          data: {
            quantity: existingItem.quantity + quantity
          },
          include: {
            product: true
          }
        });
        res.json(updatedItem);
      } else {
        // Create new cart item
        const newItem = await prisma.cartitem.create({
          data: {
            userId: req.user.id,
            productId: parseInt(productId),
            quantity
          },
          include: {
            product: true
          }
        });
        res.status(201).json(newItem);
      }

      await clearCache('cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ error: 'Failed to add item to cart' });
    }
  }
);

// Update cart item
router.put('/item/:itemId',
  sensitiveOperationLimiter,
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Valid quantity is required' });
      }

      // Check if cart item exists
      const cartItem = await prisma.cartitem.findUnique({
        where: { id: parseInt(itemId) }
      });

      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      // Verify ownership
      if (cartItem.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this cart item' });
      }

      // Update cart item
      const updatedItem = await prisma.cartitem.update({
        where: { id: parseInt(itemId) },
        data: { quantity },
        include: {
          product: true
        }
      });

      await clearCache('cart');
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ error: 'Failed to update cart' });
    }
  }
);

// Remove item from cart
router.delete('/item/:itemId',
  sensitiveOperationLimiter,
  async (req, res) => {
    try {
      const { itemId } = req.params;

      // Check if cart item exists
      const cartItem = await prisma.cartitem.findUnique({
        where: { id: parseInt(itemId) }
      });

      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      // Verify ownership
      if (cartItem.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this cart item' });
      }

      await prisma.cartitem.delete({
        where: { id: parseInt(itemId) }
      });

      await clearCache('cart');
      res.json({ message: 'Item removed from cart' });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ error: 'Failed to remove item from cart' });
    }
  }
);

// Clear cart
router.delete('/',
  sensitiveOperationLimiter,
  async (req, res) => {
    try {
      await prisma.cartitem.deleteMany({
        where: { userId: req.user.id }
      });

      await clearCache('cart');
      res.json({ message: 'Cart cleared' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ error: 'Failed to clear cart' });
    }
  }
);

module.exports = router;
