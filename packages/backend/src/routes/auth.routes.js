const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const getPrismaClient = require('../prismaClient');
const { performComprehensiveFraudDetection } = require('../services/fraudDetection.service');
const { authenticate } = require('../middlewares/auth');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const authController = require('../controllers/auth.controller');

// Get Prisma instance
const prisma = getPrismaClient();

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
console.log('Auth routes using JWT_SECRET:', JWT_SECRET);

// Public routes
router.post('/register', sensitiveOperationLimiter, authController.register);
router.post('/login', sensitiveOperationLimiter, authController.login);
router.post('/forgot-password', sensitiveOperationLimiter, authController.forgotPassword);
router.post('/reset-password', sensitiveOperationLimiter, authController.resetPassword);
router.post('/verify-email', sensitiveOperationLimiter, authController.verifyEmail);
router.post('/resend-verification', sensitiveOperationLimiter, authController.resendVerification);

// Protected routes
router.use(authenticate);

// Get current user
router.get('/me', authController.getCurrentUser);

// Update user profile
router.put('/profile', sensitiveOperationLimiter, authController.updateProfile);

// Change password
router.put('/change-password', sensitiveOperationLimiter, authController.changePassword);

// Logout
router.post('/logout', authController.logout);

// Verify token route
router.get('/verify', authenticate, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

module.exports = router;
