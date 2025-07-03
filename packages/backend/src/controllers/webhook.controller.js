const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Handle payment webhook
const handlePaymentWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    // Log webhook
    const log = await prisma.webhookLog.create({
      data: {
        type: 'PAYMENT',
        payload: JSON.stringify(req.body),
        status: 'RECEIVED'
      }
    });

    // Process based on webhook type
    switch (type) {
      case 'payment.success':
        await handleSuccessfulPayment(data);
        break;
      case 'payment.failed':
        await handleFailedPayment(data);
        break;
      default:
        console.warn(`Unknown payment webhook type: ${type}`);
    }

    // Update log status
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'PROCESSED' }
    });

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    
    // Update log status if it exists
    if (log) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { 
          status: 'FAILED',
          error: error.message
        }
      });
    }

    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

// Handle order webhook
const handleOrderWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    // Log webhook
    const log = await prisma.webhookLog.create({
      data: {
        type: 'ORDER',
        payload: JSON.stringify(req.body),
        status: 'RECEIVED'
      }
    });

    // Process based on webhook type
    switch (type) {
      case 'order.created':
        await handleOrderCreated(data);
        break;
      case 'order.updated':
        await handleOrderUpdated(data);
        break;
      case 'order.cancelled':
        await handleOrderCancelled(data);
        break;
      default:
        console.warn(`Unknown order webhook type: ${type}`);
    }

    // Update log status
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'PROCESSED' }
    });

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing order webhook:', error);
    
    // Update log status if it exists
    if (log) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { 
          status: 'FAILED',
          error: error.message
        }
      });
    }

    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

// Handle notification webhook
const handleNotificationWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    // Log webhook
    const log = await prisma.webhookLog.create({
      data: {
        type: 'NOTIFICATION',
        payload: JSON.stringify(req.body),
        status: 'RECEIVED'
      }
    });

    // Process based on webhook type
    switch (type) {
      case 'notification.sent':
        await handleNotificationSent(data);
        break;
      case 'notification.failed':
        await handleNotificationFailed(data);
        break;
      default:
        console.warn(`Unknown notification webhook type: ${type}`);
    }

    // Update log status
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'PROCESSED' }
    });

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing notification webhook:', error);
    
    // Update log status if it exists
    if (log) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { 
          status: 'FAILED',
          error: error.message
        }
      });
    }

    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

// Handle mobile money webhook
const mobileMoneyWebhook = async (req, res) => {
  try {
    const { transactionId, amount, phoneNumber, status } = req.body;

    // Validate required fields
    if (!transactionId || !amount || !phoneNumber || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log webhook
    const log = await prisma.webhookLog.create({
      data: {
        type: 'MOBILE_MONEY',
        payload: JSON.stringify(req.body),
        status: 'RECEIVED'
      }
    });

    // Find user wallet by phone number
    const user = await prisma.user.findFirst({
      where: { phone: phoneNumber }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update wallet balance if payment is successful
    if (status === 'SUCCESS') {
      await prisma.wallet.update({
        where: { userId: user.id },
        data: {
          balance: {
            increment: parseFloat(amount)
          }
        }
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: parseFloat(amount),
          status: 'COMPLETED',
          reference: transactionId,
          description: 'Mobile money deposit'
        }
      });
    }

    // Update log status
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'PROCESSED' }
    });

    res.json({ message: 'Mobile money webhook processed successfully' });
  } catch (error) {
    console.error('Error processing mobile money webhook:', error);
    
    // Update log status if it exists
    if (log) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: { 
          status: 'FAILED',
          error: error.message
        }
      });
    }

    res.status(500).json({ error: 'Failed to process mobile money webhook' });
  }
};

// Get webhook logs
const getWebhookLogs = async (req, res) => {
  try {
    const logs = await prisma.webhookLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('Error getting webhook logs:', error);
    res.status(500).json({ error: 'Failed to get webhook logs' });
  }
};

// Get webhook log by ID
const getWebhookLogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await prisma.webhookLog.findUnique({
      where: { id: parseInt(id) }
    });

    if (!log) {
      return res.status(404).json({ error: 'Webhook log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error getting webhook log:', error);
    res.status(500).json({ error: 'Failed to get webhook log' });
  }
};

// Retry failed webhook
const retryWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await prisma.webhookLog.findUnique({
      where: { id: parseInt(id) }
    });

    if (!log) {
      return res.status(404).json({ error: 'Webhook log not found' });
    }

    if (log.status !== 'FAILED') {
      return res.status(400).json({ error: 'Can only retry failed webhooks' });
    }

    // Parse the original payload
    const payload = JSON.parse(log.payload);
    const { type, data } = payload;

    // Process based on webhook type
    switch (log.type) {
      case 'PAYMENT':
        if (type === 'payment.success') {
          await handleSuccessfulPayment(data);
        } else if (type === 'payment.failed') {
          await handleFailedPayment(data);
        }
        break;
      case 'ORDER':
        if (type === 'order.created') {
          await handleOrderCreated(data);
        } else if (type === 'order.updated') {
          await handleOrderUpdated(data);
        } else if (type === 'order.cancelled') {
          await handleOrderCancelled(data);
        }
        break;
      case 'NOTIFICATION':
        if (type === 'notification.sent') {
          await handleNotificationSent(data);
        } else if (type === 'notification.failed') {
          await handleNotificationFailed(data);
        }
        break;
    }

    // Update log status
    await prisma.webhookLog.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'PROCESSED',
        retryCount: { increment: 1 }
      }
    });

    res.json({ message: 'Webhook retried successfully' });
  } catch (error) {
    console.error('Error retrying webhook:', error);
    
    // Update log status
    await prisma.webhookLog.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'FAILED',
        error: error.message,
        retryCount: { increment: 1 }
      }
    });

    res.status(500).json({ error: 'Failed to retry webhook' });
  }
};

// Helper functions for processing webhooks
const handleSuccessfulPayment = async (data) => {
  // TODO: Implement payment success handling
  console.log('Processing successful payment:', data);
};

const handleFailedPayment = async (data) => {
  // TODO: Implement payment failure handling
  console.log('Processing failed payment:', data);
};

const handleOrderCreated = async (data) => {
  // TODO: Implement order creation handling
  console.log('Processing order creation:', data);
};

const handleOrderUpdated = async (data) => {
  // TODO: Implement order update handling
  console.log('Processing order update:', data);
};

const handleOrderCancelled = async (data) => {
  // TODO: Implement order cancellation handling
  console.log('Processing order cancellation:', data);
};

const handleNotificationSent = async (data) => {
  // TODO: Implement notification sent handling
  console.log('Processing notification sent:', data);
};

const handleNotificationFailed = async (data) => {
  // TODO: Implement notification failure handling
  console.log('Processing notification failure:', data);
};

module.exports = {
  handlePaymentWebhook,
  handleOrderWebhook,
  handleNotificationWebhook,
  getWebhookLogs,
  getWebhookLogById,
  retryWebhook,
  mobileMoneyWebhook
}; 