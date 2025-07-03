const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware } = require('../middlewares/cache');

// Public webhook endpoints
router.post('/mobile-money', webhookController.mobileMoneyWebhook);
router.post('/payment', webhookController.handlePaymentWebhook);
router.post('/order', webhookController.handleOrderWebhook);
router.post('/notification', webhookController.handleNotificationWebhook);

// Protected webhook endpoints
router.get('/logs', authenticate, authorize(['admin']), webhookController.getWebhookLogs);
router.get('/logs/:id', authenticate, authorize(['admin']), webhookController.getWebhookLogById);
router.post('/logs/:id/retry', authenticate, authorize(['admin']), webhookController.retryWebhook);

module.exports = router;
