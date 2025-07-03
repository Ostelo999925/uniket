const express = require('express');
const router = express.Router();
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Get wallet balance
const getWalletBalance = async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Get total revenue from delivered orders
    const totalRevenue = await prisma.order.aggregate({
      where: {
        product: { vendorId: req.user.id },
        status: 'delivered'
      },
      _sum: { total: true }
    });

    // Get total withdrawals
    const totalWithdrawals = await prisma.transaction.aggregate({
      where: {
        userId: req.user.id,
        type: 'withdrawal',
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });
    
    res.json({ 
      balance: wallet.balance,
      totalRevenue: totalRevenue._sum.total || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ error: 'Failed to get wallet balance' });
  }
};

// Get wallet transactions
const getWalletTransactions = async (req, res) => {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    res.status(500).json({ error: 'Failed to get wallet transactions' });
  }
};

// Add funds to wallet
const addFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId: req.user.id },
      update: { balance: { increment: amount } },
      create: { userId: req.user.id, balance: amount }
    });

    // Create transaction record
    await prisma.walletTransaction.create({
      data: {
        userId: req.user.id,
        amount,
        type: 'CREDIT',
        description: 'Wallet funding'
      }
    });

    res.json({ message: 'Funds added successfully', wallet });
  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({ error: 'Failed to add funds' });
  }
};

// Withdraw funds from wallet
const withdrawFunds = async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!bankDetails) {
      return res.status(400).json({ error: 'Bank details are required' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: req.user.id,
        amount,
        bankDetails,
        status: 'PENDING'
      }
    });

    // Deduct from wallet
    await prisma.wallet.update({
      where: { userId: req.user.id },
      data: { balance: { decrement: amount } }
    });

    // Create transaction record
    await prisma.walletTransaction.create({
      data: {
        userId: req.user.id,
        amount: -amount,
        type: 'DEBIT',
        description: 'Withdrawal request',
        withdrawalId: withdrawal.id
      }
    });

    res.json({ message: 'Withdrawal request submitted', withdrawal });
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    res.status(500).json({ error: 'Failed to withdraw funds' });
  }
};

// Get withdrawal history
const getWithdrawalHistory = async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Error getting withdrawal history:', error);
    res.status(500).json({ error: 'Failed to get withdrawal history' });
  }
};

// Get withdrawal by ID
const getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('Error getting withdrawal:', error);
    res.status(500).json({ error: 'Failed to get withdrawal details' });
  }
};

// Cancel withdrawal
const cancelWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        status: 'PENDING'
      }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found or cannot be cancelled' });
    }

    // Update withdrawal status
    await prisma.withdrawal.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' }
    });

    // Refund to wallet
    await prisma.wallet.update({
      where: { userId: req.user.id },
      data: { balance: { increment: withdrawal.amount } }
    });

    // Create transaction record
    await prisma.walletTransaction.create({
      data: {
        userId: req.user.id,
        amount: withdrawal.amount,
        type: 'CREDIT',
        description: 'Withdrawal cancellation refund'
      }
    });

    res.json({ message: 'Withdrawal cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    res.status(500).json({ error: 'Failed to cancel withdrawal' });
  }
};

module.exports = {
  getWalletBalance,
  getWalletTransactions,
  addFunds,
  withdrawFunds,
  getWithdrawalHistory,
  getWithdrawalById,
  cancelWithdrawal
};
