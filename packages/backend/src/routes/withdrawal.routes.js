const express = require('express');
const router = express.Router();
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { authenticate } = require('../middlewares/auth');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');

// Protected routes - all withdrawal operations require authentication
router.use(authenticate);

// Get withdrawal history
router.get('/history', async (req, res) => {
  try {
    const withdrawals = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        type: 'withdrawal'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal history' });
  }
});

// Create withdrawal request
router.post('/', sensitiveOperationLimiter, async (req, res) => {
  try {
    const { amount, bankName, accountNumber, accountName } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    // Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check if user has sufficient balance
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create withdrawal transaction
    const withdrawal = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        type: 'withdrawal',
        amount: parseFloat(amount),
        status: 'PENDING',
        description: JSON.stringify({
          bankName,
          accountNumber,
          accountName
        })
      }
    });

    res.json(withdrawal);
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(500).json({ error: 'Failed to create withdrawal' });
  }
});

// Get all withdrawals
router.get('/', async (req, res) => {
  try {
    let withdrawals;
    
    if (req.user.role === 'admin') {
      // Admin can see all withdrawals
      withdrawals = await prisma.transaction.findMany({
        where: {
          type: 'withdrawal'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Vendors can only see their withdrawals
      withdrawals = await prisma.transaction.findMany({
        where: {
          userId: req.user.id,
          type: 'withdrawal'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Get withdrawal by ID
router.get('/:id', async (req, res) => {
  try {
    const withdrawalId = parseInt(req.params.id);
    if (isNaN(withdrawalId)) {
      return res.status(400).json({ message: 'Invalid withdrawal ID' });
    }

    const withdrawal = await prisma.transaction.findUnique({
      where: {
        id: withdrawalId
      }
    });

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    // Check if user is authorized to view this withdrawal
    if (req.user.role !== 'admin' && withdrawal.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this withdrawal' });
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({ message: 'Error fetching withdrawal' });
  }
});

// Approve withdrawal
router.put('/:id/approve', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve withdrawals' });
    }

    const withdrawal = await prisma.transaction.findUnique({
      where: {
        id: parseInt(req.params.id)
      }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending withdrawals can be approved' });
    }

    const updatedWithdrawal = await prisma.transaction.update({
      where: {
        id: parseInt(req.params.id)
      },
      data: {
        status: 'APPROVED'
      }
    });

    res.json(updatedWithdrawal);
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

// Reject withdrawal
router.put('/:id/reject', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reject withdrawals' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const withdrawal = await prisma.transaction.findUnique({
      where: {
        id: parseInt(req.params.id)
      }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending withdrawals can be rejected' });
    }

    // Reject withdrawal and refund wallet
    const updatedWithdrawal = await prisma.$transaction(async (prisma) => {
      // Update withdrawal status
      const rejectedWithdrawal = await prisma.transaction.update({
        where: {
          id: parseInt(req.params.id)
        },
        data: {
          status: 'REJECTED',
          description: JSON.stringify({
            ...JSON.parse(withdrawal.description),
            rejectionReason: reason
          })
        }
      });

      // Refund wallet
      await prisma.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          balance: {
            increment: withdrawal.amount
          }
        }
      });

      return rejectedWithdrawal;
    });

    res.json(updatedWithdrawal);
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

module.exports = router; 