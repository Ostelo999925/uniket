const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const reviewController = require('../controllers/review.controller');
const productController = require('../controllers/product.controller');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Public routes
router.get('/product/:productId', cacheMiddleware(300), reviewController.getProductReviews);
router.get('/vendor/:vendorId', cacheMiddleware(300), reviewController.getVendorReviews);

// Protected routes
router.use(authenticate);

// Get user reviews
router.get('/user', cacheMiddleware(300), reviewController.getUserReviews);

// Get reported reviews (admin only)
router.get('/reported',
  authorize(['admin']),
  cacheMiddleware(60),
  reviewController.getReportedReviews
);

// Create review
router.post('/',
  sensitiveOperationLimiter,
  reviewController.createReview
);

// Update review
router.put('/:id',
  sensitiveOperationLimiter,
  reviewController.updateReview
);

// Delete review
router.delete('/:id',
  sensitiveOperationLimiter,
  reviewController.deleteReview
);

// Report review
router.post('/:id/report',
  sensitiveOperationLimiter,
  reviewController.reportReview
);

// Review reactions
router.get('/:id/reactions', cacheMiddleware(60), productController.getReviewReactions);
router.post('/:id/reactions', sensitiveOperationLimiter, productController.addReviewReaction);
router.delete('/:id/reactions', sensitiveOperationLimiter, productController.removeReviewReaction);

module.exports = router; 