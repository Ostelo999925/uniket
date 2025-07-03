const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const userController = require('../controllers/user.controller');

// Public routes
router.get('/search', cacheMiddleware(60), userController.searchUsers);
router.get('/profile/:username', cacheMiddleware(300), userController.getUserProfile);

// Protected routes
router.use(authenticate);

// Get current user
router.get('/me', userController.getCurrentUser);

// Get user profile (authenticated users can view their own profile)
router.get('/profile', userController.getUserProfile);

// Update current user
router.put('/me', sensitiveOperationLimiter, userController.updateCurrentUser);

// Get user notifications
router.get('/notifications', cacheMiddleware(60), userController.getUserNotifications);

// Mark notification as read
router.put('/notifications/:id/read', sensitiveOperationLimiter, userController.markNotificationAsRead);

// Get user orders
router.get('/orders', cacheMiddleware(60), userController.getUserOrders);

// Get user reviews
router.get('/reviews', cacheMiddleware(300), userController.getUserReviews);

// Admin routes
router.use(authorize(['admin']));

// Get user by ID (admin only)
router.get('/:id', cacheMiddleware(300), userController.getUserById);

// Update user (admin only)
router.put('/:id', sensitiveOperationLimiter, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', sensitiveOperationLimiter, userController.deleteUser);

module.exports = router;
