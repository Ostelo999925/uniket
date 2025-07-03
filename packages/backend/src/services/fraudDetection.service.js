const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { createNotification } = require('../utils/notification');
const { analyzeUserBehavior } = require('./mlAnomalyDetection.service');

// Fraud detection thresholds
const THRESHOLDS = {
  MAX_FAILED_LOGINS: 5,
  MAX_ORDERS_PER_HOUR: 10,
  MAX_BIDS_PER_HOUR: 20,
  SUSPICIOUS_AMOUNT: 1000, // Amount in your currency
  MAX_ACCOUNTS_PER_IP: 3,
  MAX_REPORTS_BEFORE_FLAG: 3,
  RISK_SCORE_THRESHOLD: 70 // New threshold for ML-based risk score
};

// Detect suspicious login attempts
const detectSuspiciousLogins = async (userId, ipAddress) => {
  const recentFailedLogins = await prisma.loginAttempt.count({
    where: {
      userId,
      success: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }
  });

  if (recentFailedLogins >= THRESHOLDS.MAX_FAILED_LOGINS) {
    // Get admin user ID
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: 'FRAUD_ALERT',
        message: `Suspicious login activity detected for user ${userId}`,
        data: {
          type: 'SUSPICIOUS_LOGIN',
          userId,
          ipAddress,
          failedAttempts: recentFailedLogins
        }
      });
    }
    return true;
  }
  return false;
};

// Detect suspicious order patterns
const detectSuspiciousOrders = async (userId) => {
  const recentOrders = await prisma.order.count({
    where: {
      customerId: userId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    }
  });

  if (recentOrders >= THRESHOLDS.MAX_ORDERS_PER_HOUR) {
    // Get admin user ID
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: 'FRAUD_ALERT',
        message: `Suspicious order activity detected for user ${userId}`,
        data: {
          type: 'SUSPICIOUS_ORDERS',
          userId,
          orderCount: recentOrders
        }
      });
    }
    return true;
  }
  return false;
};

// Detect suspicious bidding patterns
const detectSuspiciousBidding = async (userId) => {
  const recentBids = await prisma.bid.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    }
  });

  if (recentBids >= THRESHOLDS.MAX_BIDS_PER_HOUR) {
    // Get admin user ID
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: 'FRAUD_ALERT',
        message: `Suspicious bidding activity detected for user ${userId}`,
        data: {
          type: 'SUSPICIOUS_BIDDING',
          userId,
          bidCount: recentBids
        }
      });
    }
    return true;
  }
  return false;
};

// Detect multiple accounts from same IP
const detectMultipleAccounts = async (ipAddress) => {
  const attempts = await prisma.loginAttempt.findMany({
    where: {
      ipAddress,
      success: true,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    distinct: ['userId']
  });
  const accountsFromIP = attempts.length;

  if (accountsFromIP >= THRESHOLDS.MAX_ACCOUNTS_PER_IP) {
    // Get admin user ID
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: 'FRAUD_ALERT',
        message: `Multiple accounts detected from IP ${ipAddress}`,
        data: {
          type: 'MULTIPLE_ACCOUNTS',
          ipAddress,
          accountCount: accountsFromIP
        }
      });
    }
    return true;
  }
  return false;
};

// Detect suspicious product listings
const detectSuspiciousProducts = async (product) => {
  const suspiciousPatterns = [
    product.price > THRESHOLDS.SUSPICIOUS_AMOUNT,
    product.name.toLowerCase().includes('test'),
    product.description.length < 10,
    !product.image
  ];

  if (suspiciousPatterns.some(pattern => pattern)) {
    // Get admin user ID
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: 'FRAUD_ALERT',
        message: `Suspicious product detected: ${product.name}`,
        data: {
          type: 'SUSPICIOUS_PRODUCT',
          productId: product.id,
          vendorId: product.vendorId,
          patterns: suspiciousPatterns
        }
      });
    }
    return true;
  }
  return false;
};

// Check product reports
const checkProductReports = async (productId) => {
  const reportCount = await prisma.review.count({
    where: {
      productId,
      isReport: true
    }
  });

  if (reportCount >= THRESHOLDS.MAX_REPORTS_BEFORE_FLAG) {
    await prisma.product.update({
      where: { id: productId },
      data: { isFlagged: true }
    });

    // Get admin user ID
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: 'FRAUD_ALERT',
        message: `Product ${productId} flagged due to multiple reports`,
        data: {
          type: 'FLAGGED_PRODUCT',
          productId,
          reportCount
        }
      });
    }
    return true;
  }
  return false;
};

// New function to perform comprehensive fraud detection
const performComprehensiveFraudDetection = async (userId, ipAddress) => {
  try {
    // Run traditional rule-based checks
    const suspiciousLogins = await detectSuspiciousLogins(userId, ipAddress);
    const suspiciousOrders = await detectSuspiciousOrders(userId);
    const suspiciousBidding = await detectSuspiciousBidding(userId);
    const multipleAccounts = await detectMultipleAccounts(ipAddress);

    // Run ML-based analysis
    const mlAnalysis = await analyzeUserBehavior(userId);
    
    // Combine results
    const isSuspicious = suspiciousLogins || suspiciousOrders || 
                        suspiciousBidding || multipleAccounts || 
                        (mlAnalysis && mlAnalysis.riskScore >= THRESHOLDS.RISK_SCORE_THRESHOLD);

    return {
      isSuspicious,
      details: {
        suspiciousLogins,
        suspiciousOrders,
        suspiciousBidding,
        multipleAccounts,
        mlAnalysis
      }
    };
  } catch (error) {
    console.error('Error in comprehensive fraud detection:', error);
    return { isSuspicious: false, error: error.message };
  }
};

module.exports = {
  detectSuspiciousLogins,
  detectSuspiciousOrders,
  detectSuspiciousBidding,
  detectMultipleAccounts,
  detectSuspiciousProducts,
  checkProductReports,
  performComprehensiveFraudDetection,
  THRESHOLDS
}; 