const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const walletController = require('../controllers/wallet.controller');

// Protected routes
router.use(authenticate);

// Get wallet balance
router.get('/balance', cacheMiddleware(60), walletController.getWalletBalance);

// Get wallet transactions
router.get('/transactions', cacheMiddleware(60), walletController.getWalletTransactions);

// Add funds to wallet
router.post('/add-funds',
  sensitiveOperationLimiter,
  walletController.addFunds
);

// Withdraw funds from wallet
router.post('/withdraw',
  sensitiveOperationLimiter,
  walletController.withdrawFunds
);

// Get withdrawal history
router.get('/withdrawals', cacheMiddleware(60), walletController.getWithdrawalHistory);

// Get withdrawal by ID
router.get('/withdrawals/:id',
  cacheMiddleware(60),
  walletController.getWithdrawalById
);

// Cancel withdrawal
router.put('/withdrawals/:id/cancel',
  sensitiveOperationLimiter,
  walletController.cancelWithdrawal
);

module.exports = router;
