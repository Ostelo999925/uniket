const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Create a new transaction
const createTransaction = async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    const userId = req.user.id;

    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid transaction data' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        amount: parseFloat(amount),
        description,
        status: 'PENDING'
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

// Get all transactions (admin only)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Get user's transactions
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const userId = req.user.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check if user is authorized to view this transaction
    if (transaction.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this transaction' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

// Update transaction status (admin only)
const updateTransactionStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const { status } = req.body;

    if (!['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { status }
    });

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

// Get transaction statistics (admin only)
const getTransactionStats = async (req, res) => {
  try {
    const totalTransactions = await prisma.transaction.count();
    const totalAmount = await prisma.transaction.aggregate({
      _sum: {
        amount: true
      }
    });

    const statusCounts = await prisma.transaction.groupBy({
      by: ['status'],
      _count: true
    });

    const stats = {
      totalTransactions,
      totalAmount: totalAmount._sum.amount || 0,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ error: 'Failed to fetch transaction statistics' });
  }
};

// Get transactions for a specific user (admin only)
const getTransactionsByUserId = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getUserTransactions,
  getTransactionById,
  updateTransactionStatus,
  getTransactionStats,
  getTransactionsByUserId
};
