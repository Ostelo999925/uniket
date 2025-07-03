const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const paymentController = require('../controllers/payment.controller');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Protected routes
router.use(authenticate);

// Get payment methods
router.get('/methods', cacheMiddleware(300), paymentController.getPaymentMethods);

// Get payment history
router.get('/history', cacheMiddleware(60), paymentController.getPaymentHistory);

// Get payment by ID
router.get('/:id', cacheMiddleware(60), paymentController.getPaymentById);

// Create payment
router.post('/',
  sensitiveOperationLimiter,
  paymentController.createPayment
);

// Update payment
router.put('/:id',
  sensitiveOperationLimiter,
  paymentController.updatePayment
);

// Cancel payment
router.put('/:id/cancel',
  sensitiveOperationLimiter,
  paymentController.cancelPayment
);

// Refund payment
router.post('/:id/refund',
  sensitiveOperationLimiter,
  paymentController.refundPayment
);

// Initialize payment
router.post('/initialize', async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId
      }
    });

    if (!order) {
      return res.status(400).json({ error: 'Order not found or unauthorized' });
    }

    // Generate payment reference
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = await prisma.transaction.create({
      data: {
        userId,
        type: 'fund',
        amount,
        description: `Payment for order #${orderId} (${reference})`,
        status: 'PENDING'
      }
    });

    // Return payment details
    res.status(200).json({
      reference: reference,
      authorizationUrl: `/payment/authorize/${reference}`,
      accessCode: reference
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    const userId = req.user.id;

    // Find payment record
    const payment = await prisma.transaction.findFirst({
      where: {
        description: { contains: reference },
        userId,
        status: 'PENDING'
      }
    });

    if (!payment) {
      return res.status(400).json({ error: 'Invalid payment reference or payment already processed' });
    }

    // Update payment status
    await prisma.transaction.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED' }
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Process refund
router.post('/refund', async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.id;

    // Find order and verify ownership
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId
      }
    });

    if (!order) {
      return res.status(400).json({ error: 'Order not found or unauthorized' });
    }

    // Create refund transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'refund',
        amount: order.total,
        description: `Refund for order #${orderId}: ${reason}`,
        status: 'COMPLETED'
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Get payment details for order
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Find order and verify ownership
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(orderId),
        customerId: userId
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }

    // Find payment transaction
    const payment = await prisma.transaction.findFirst({
      where: {
        description: { contains: `Payment for order #${orderId}` },
        userId
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(200).json({
      orderId: order.id,
      amount: order.total,
      status: payment.status,
      paymentMethod: order.paymentMethod,
      createdAt: payment.createdAt
    });
  } catch (error) {
    console.error('Payment details error:', error);
    res.status(500).json({ error: 'Failed to get payment details' });
  }
});

module.exports = router;
