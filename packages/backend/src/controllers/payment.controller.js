const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Get payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or other cards',
        icon: 'credit-card'
      },
      {
        id: 'mobile_money',
        name: 'Mobile Money',
        description: 'Pay using your mobile money account',
        icon: 'mobile'
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Pay directly from your bank account',
        icon: 'bank'
      }
    ];

    res.json(methods);
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['fund', 'refund'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(payments);
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await prisma.transaction.findFirst({
      where: {
        id: parseInt(id),
        userId,
        type: { in: ['fund', 'refund'] }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error getting payment:', error);
    res.status(500).json({ error: 'Failed to get payment' });
  }
};

// Create payment
const createPayment = async (req, res) => {
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

    res.status(201).json({
      id: payment.id,
      reference,
      amount,
      status: payment.status,
      createdAt: payment.createdAt
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod } = req.body;
    const userId = req.user.id;

    const payment = await prisma.transaction.findFirst({
      where: {
        id: parseInt(id),
        userId,
        type: 'fund'
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const updatedPayment = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        status,
        paymentMethod
      }
    });

    res.json(updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

// Cancel payment
const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await prisma.transaction.findFirst({
      where: {
        id: parseInt(id),
        userId,
        type: 'fund',
        status: 'PENDING'
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found or cannot be cancelled' });
    }

    const cancelledPayment = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' }
    });

    res.json(cancelledPayment);
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
};

// Refund payment
const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const payment = await prisma.transaction.findFirst({
      where: {
        id: parseInt(id),
        userId,
        type: 'fund',
        status: 'COMPLETED'
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found or cannot be refunded' });
    }

    // Create refund transaction
    const refund = await prisma.transaction.create({
      data: {
        userId,
        type: 'refund',
        amount: payment.amount,
        description: `Refund for payment #${id}: ${reason}`,
        status: 'COMPLETED'
      }
    });

    res.json(refund);
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
};

module.exports = {
  getPaymentMethods,
  getPaymentHistory,
  getPaymentById,
  createPayment,
  updatePayment,
  cancelPayment,
  refundPayment
}; 