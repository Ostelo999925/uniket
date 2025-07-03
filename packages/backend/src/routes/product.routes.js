const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { productValidationRules } = require('../middlewares/sanitizer');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const { authenticate, authorize } = require('../middlewares/auth');
const { detectSuspiciousProducts } = require('../services/fraudDetection.service');
const { 
  trackProductView, 
  getAIRecommendations,
  getAllProducts,
  searchProducts,
  getCategories,
  getFeaturedProducts,
  getTrendingProducts,
  getRecommendations,
  getProductById,
  updateProduct,
  deleteProduct,
  rateProduct,
  reportProduct
} = require('../controllers/product.controller');

// Configure storage for product images
const storage = multer.diskStorage({
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

const uploadMulter = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Public routes
router.get('/', cacheMiddleware(300), getAllProducts);
router.get('/search', cacheMiddleware(60), searchProducts);
router.get('/categories', cacheMiddleware(600), getCategories);
router.get('/featured', cacheMiddleware(300), getFeaturedProducts);
router.get('/trending', cacheMiddleware(300), getTrendingProducts);
router.get('/recommendations', cacheMiddleware(300), getRecommendations);
router.get('/ai-recommendations', cacheMiddleware(300), getAIRecommendations);
router.get('/:id', cacheMiddleware(300), getProductById);

// Protected routes
router.use(authenticate);

// Update product (vendor only)
router.put('/:id',
  authorize(['vendor']),
  sensitiveOperationLimiter,
  updateProduct
);

// Delete product (vendor only)
router.delete('/:id',
  authorize(['vendor']),
  sensitiveOperationLimiter,
  deleteProduct
);

// Rate product
router.post('/:id/rate',
  sensitiveOperationLimiter,
  rateProduct
);

// Report product
router.post('/:id/report',
  sensitiveOperationLimiter,
  reportProduct
);

// Product view tracking
router.post('/:id/view', authenticate, trackProductView);

module.exports = router;
