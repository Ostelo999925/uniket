const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const orderController = require('../controllers/order.controller');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Public routes
router.get('/track/:trackingNumber', orderController.trackOrder);

// Protected routes
router.use(authenticate);

// Get order reports (admin only)
router.get('/reports',
  authorize(['admin']),
  cacheMiddleware(300), // Cache for 5 minutes
  orderController.getOrderReports
);

// Get user orders
router.get('/user',
  cacheMiddleware(60), // Cache for 1 minute
  orderController.getUserOrders
);

// Get vendor orders
router.get('/vendor',
  authorize(['vendor']),
  cacheMiddleware(60), // Cache for 1 minute
  orderController.getVendorOrders
);

// Get order tracking - must come before /:id route
router.get('/:id/tracking',
  cacheMiddleware(60), // Cache for 1 minute
  orderController.getOrderTracking
);

// Get order by ID
router.get('/:id',
  cacheMiddleware(60), // Cache for 1 minute
  orderController.getOrderById
);

// Create order
router.post('/',
  sensitiveOperationLimiter,
  orderController.createOrder
);

// Update order status
router.put('/:id/status',
  sensitiveOperationLimiter,
  orderController.updateOrderStatus
);

// Cancel order
router.put('/:id/cancel',
  sensitiveOperationLimiter,
  orderController.cancelOrder
);

// Rate order
router.post('/:id/rate',
  sensitiveOperationLimiter,
  orderController.rateOrder
);

module.exports = router;
