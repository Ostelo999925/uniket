// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const { authenticate, authorize } = require('../middlewares/auth');
const { 
  asyncHandler, 
  NotFoundError, 
  DatabaseError,
  logError 
} = require('../utils/errorHandler');
const adminController = require('../controllers/admin.controller');

// Protected routes - admin only
router.use(authenticate);
router.use(authorize(['admin']));

// Dashboard stats
router.get('/dashboard', cacheMiddleware(60), adminController.getStats);

// Notifications
router.get('/notifications', cacheMiddleware(60), adminController.getAdminNotifications);

// Rejection reasons
router.get('/rejection-reasons', cacheMiddleware(300), adminController.getRejectionReasons);

// User management
router.get('/users', cacheMiddleware(300), adminController.getAllUsers);
router.get('/users/search', cacheMiddleware(60), adminController.searchUsers);
router.get('/users/:id', cacheMiddleware(300), adminController.getUserById);
router.put('/users/:id', sensitiveOperationLimiter, adminController.updateUser);
router.delete('/users/:id', sensitiveOperationLimiter, adminController.deleteUser);

// Product management
router.get('/products', cacheMiddleware(300), adminController.getAllProducts);
router.get('/products/pending', cacheMiddleware(60), adminController.getPendingProducts);
router.get('/products/flagged', cacheMiddleware(60), adminController.getFlaggedProducts);
router.get('/products/rejection-reasons', adminController.getRejectionReasons);
router.get('/products/search', cacheMiddleware(60), adminController.searchProducts);
router.get('/products/:id', cacheMiddleware(300), adminController.getProductById);
router.put('/products/:id', sensitiveOperationLimiter, adminController.updateProduct);
router.put('/products/:id/approve', sensitiveOperationLimiter, adminController.approveProduct);
router.put('/products/:id/reject', sensitiveOperationLimiter, adminController.rejectProduct);
router.delete('/products/:id', sensitiveOperationLimiter, adminController.deleteProduct);

// Order management
router.get('/orders', cacheMiddleware(60), adminController.getAllOrders);
router.get('/orders/search', cacheMiddleware(60), adminController.searchOrders);
router.get('/orders/:id', cacheMiddleware(60), adminController.getOrderById);
router.put('/orders/:id', sensitiveOperationLimiter, adminController.updateOrder);

// Review management
router.get('/reviews', cacheMiddleware(300), adminController.getAllReviews);
router.get('/reviews/search', cacheMiddleware(60), adminController.searchReviews);
router.get('/reviews/:id', cacheMiddleware(300), adminController.getReviewById);
router.put('/reviews/:id', sensitiveOperationLimiter, adminController.updateReview);
router.delete('/reviews/:id', sensitiveOperationLimiter, adminController.deleteReview);

// Report management
router.get('/reports', cacheMiddleware(60), adminController.getAllReports);
router.get('/reports/search', cacheMiddleware(60), adminController.searchReports);
router.get('/reports/:id', cacheMiddleware(60), adminController.getReportById);
router.put('/reports/:id', sensitiveOperationLimiter, adminController.updateReport);

// Settings management
router.get('/settings', cacheMiddleware(300), adminController.getSettings);
router.put('/settings', sensitiveOperationLimiter, adminController.updateSettings);

// Vendor management
router.get('/vendors', cacheMiddleware(300), adminController.getAllVendors);
router.get('/vendors/:vendorId/stats', cacheMiddleware(60), adminController.getVendorStats);
router.get('/vendor-leaderboard', cacheMiddleware(60), adminController.getVendorLeaderboard);
router.put('/vendors/:vendorId', sensitiveOperationLimiter, adminController.updateVendor);
router.delete('/vendors/:vendorId', sensitiveOperationLimiter, adminController.deleteVendor);

// Pickup points management
router.get('/pickup-points', cacheMiddleware(300), adminController.getAllPickupPoints);
router.post('/pickup-points', sensitiveOperationLimiter, adminController.addPickupPoint);
router.put('/pickup-points/:id', sensitiveOperationLimiter, adminController.updatePickupPoint);
router.delete('/pickup-points/:id', sensitiveOperationLimiter, adminController.deletePickupPoint);

module.exports = router;