const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const notificationController = require('../controllers/notification.controller');

// Protected routes
router.use(authenticate);

// Get user notifications
router.get('/', cacheMiddleware(60), notificationController.getUserNotifications);

// Get unread notifications count
router.get('/unread', cacheMiddleware(60), notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read',
  sensitiveOperationLimiter,
  notificationController.markAsRead
);

// Mark all notifications as read
router.put('/read-all',
  sensitiveOperationLimiter,
  notificationController.markAllAsRead
);

// Delete notification
router.delete('/:id',
  sensitiveOperationLimiter,
  notificationController.deleteNotification
);

// Delete all notifications
router.delete('/',
  sensitiveOperationLimiter,
  notificationController.deleteAllNotifications
);

module.exports = router;
