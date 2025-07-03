const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { authenticate, authorize } = require('../middlewares/auth');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const orderController = require('../controllers/order.controller');
const { placeOrder, getVendorOrders } = require('../controllers/order.controller');
const vendorController = require('../controllers/vendor.controller');

// Configure storage for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profile_images/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for product images
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadProfile = multer({ 
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadProduct = multer({ 
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Protected routes - vendor only
router.use(authenticate);
router.use(authorize(['vendor']));

// Get vendor profile with caching
router.get('/profile',
  cacheMiddleware(300), // Cache for 5 minutes
  vendorController.getVendorProfile
);

// Update vendor profile
router.put('/profile',
  sensitiveOperationLimiter,
  vendorController.updateVendorProfile
);

// Update vendor profile image
router.put('/profile/image', 
  uploadProfile.single('image'), 
  vendorController.updateVendorProfileImage
);

// Get vendor dashboard stats with caching
router.get('/dashboard',
  cacheMiddleware(60), // Cache for 1 minute
  vendorController.getDashboardStats
);

// Get vendor orders with caching
router.get('/orders',
  cacheMiddleware(60),
  vendorController.getVendorOrders
);

// Get vendor products with caching
router.get('/products',
  (req, res, next) => {
    // Create a vendor-specific cache key
    req.cacheKey = `vendor_${req.user.id}_products`;
    next();
  },
  cacheMiddleware(300),
  vendorController.getVendorProducts
);

// Create vendor product
router.post('/products',
  sensitiveOperationLimiter,
  uploadProduct.single('image'),
  vendorController.createVendorProduct
);

// Update vendor product
router.put('/products/:id',
  sensitiveOperationLimiter,
  uploadProduct.single('image'),
  vendorController.updateVendorProduct
);

// Delete vendor product
router.delete('/products/:id',
  sensitiveOperationLimiter,
  vendorController.deleteVendorProduct
);

// Get vendor reviews
router.get('/reviews',
  cacheMiddleware(300),
  vendorController.getVendorReviews
);

// Get vendor analytics
router.get('/analytics',
  cacheMiddleware(300),
  vendorController.getVendorAnalytics
);

// Get support notifications
router.get('/support/notifications',
  cacheMiddleware(60),
  vendorController.getSupportNotifications
);

// Mark support notifications as read
router.put('/support/notifications/read',
  sensitiveOperationLimiter,
  vendorController.markSupportNotificationsAsRead
);

// Update vendor settings
router.put('/settings',
  sensitiveOperationLimiter,
  vendorController.updateVendorSettings
);

// Get vendor notifications
router.get('/notifications', async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get pending products count (only unread)
    const pendingProducts = await prisma.notification.count({
      where: { 
        userId: vendorId,
        type: 'PRODUCT_APPROVED',
        read: false
      }
    });

    // Get new orders count (only unread)
    const newOrders = await prisma.notification.count({
      where: {
        userId: vendorId,
        type: 'NEW_ORDER',
        read: false
      }
    });

    // Get pending reviews count (only unread)
    const pendingReviews = await prisma.notification.count({
      where: {
        userId: vendorId,
        type: 'REVIEW',
        read: false
      }
    });

    // Get pending bids count (only unread)
    const pendingBids = await prisma.notification.count({
      where: {
        userId: vendorId,
        type: 'NEW_BID',
        read: false
      }
    });

    res.json({
      products: pendingProducts,
      orders: newOrders,
      reviews: pendingReviews,
      bids: pendingBids
    });
  } catch (error) {
    console.error('Error fetching vendor notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read for different sections
router.put('/notifications/products/read', async (req, res) => {
  try {
    const vendorId = req.user.id;
    await prisma.notification.updateMany({
      where: {
        userId: vendorId,
        type: 'PRODUCT_APPROVED',
        read: false
      },
      data: {
        read: true
      }
    });
    res.json({ message: 'Product notifications marked as read' });
  } catch (error) {
    console.error('Error marking product notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.put('/notifications/orders/read', async (req, res) => {
  try {
    const vendorId = req.user.id;
    await prisma.notification.updateMany({
      where: {
        userId: vendorId,
        type: 'NEW_ORDER',
        read: false
      },
      data: {
        read: true
      }
    });
    res.json({ message: 'Order notifications marked as read' });
  } catch (error) {
    console.error('Error marking order notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.put('/notifications/reviews/read', async (req, res) => {
  try {
    const vendorId = req.user.id;
    await prisma.notification.updateMany({
      where: {
        userId: vendorId,
        type: 'REVIEW',
        read: false
      },
      data: {
        read: true
      }
    });
    res.json({ message: 'Review notifications marked as read' });
  } catch (error) {
    console.error('Error marking review notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.put('/notifications/bids/read', async (req, res) => {
  try {
    const vendorId = req.user.id;
    await prisma.notification.updateMany({
      where: {
        userId: vendorId,
        type: 'NEW_BID',
        read: false
      },
      data: {
        read: true
      }
    });
    res.json({ message: 'Bid notifications marked as read' });
  } catch (error) {
    console.error('Error marking bid notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Toggle product bidding
router.put('/products/:productId/toggle-bidding', async (req, res) => {
  try {
    const { productId } = req.params;
    const { enableBidding, startingBid, bidEndDate } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: { vendorId: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this product' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(productId) },
      data: {
        enableBidding: enableBidding,
        startingBid: startingBid ? parseFloat(startingBid) : null,
        bidEndDate: bidEndDate || null
      }
    });

    await clearCache('products');
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error toggling product bidding:', error);
    res.status(500).json({ error: 'Failed to toggle product bidding' });
  }
});

// Get pending bids for vendor
router.get('/pending-bids', async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const pendingBids = await prisma.bid.findMany({
      where: {
        product: {
          vendorId: vendorId
        },
        status: 'PENDING'
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true
          }
        },
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

    console.log("Found pending bids:", pendingBids.length);
    res.json(pendingBids);
  } catch (error) {
    console.error("Error fetching pending bids:", error);
    res.status(500).json({ error: 'Failed to fetch pending bids' });
  }
});

module.exports = router;