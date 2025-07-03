const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const {
  createTransaction,
  getAllTransactions,
  getUserTransactions,
  getTransactionById,
  updateTransactionStatus,
  getTransactionStats,
  getTransactionsByUserId
} = require('../controllers/transactions.controller');

// Protected routes
router.use(authenticate);

// Get user transactions
router.get('/user', cacheMiddleware(60), getUserTransactions);

// Get vendor transactions
router.get('/vendor',
  authorize(['vendor']),
  cacheMiddleware(60),
  getAllTransactions
);

// Get admin transactions
router.get('/admin',
  authorize(['admin']),
  cacheMiddleware(60),
  getAllTransactions
);

// Create transaction
router.post('/',
  sensitiveOperationLimiter,
  createTransaction
);

// Get transaction by ID
router.get('/:id',
  cacheMiddleware(60),
  getTransactionById
);

// Update transaction
router.put('/:id',
  sensitiveOperationLimiter,
  updateTransactionStatus
);

// Cancel transaction
router.put('/:id/cancel',
  sensitiveOperationLimiter,
  updateTransactionStatus
);

// Get transaction statistics (admin only)
router.get('/stats', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to view transaction statistics' });
  }
  getTransactionStats(req, res, next);
});

// Get transactions for a specific user (admin only)
router.get('/user/:userId', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to view user transactions' });
  }
  getTransactionsByUserId(req, res, next);
});

module.exports = router;
