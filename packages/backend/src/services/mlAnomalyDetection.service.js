const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { createNotification } = require('../utils/notification');

// Feature extraction functions
const extractUserFeatures = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: true,
      bids: true,
      transactions: true,
      loginAttempts: true
    }
  });

  if (!user) return null;

  // Calculate time-based features
  const now = new Date();
  const accountAge = (now - new Date(user.createdAt)) / (1000 * 60 * 60 * 24); // in days
  
  // Calculate order-based features
  const orderAmounts = user.orders.map(order => order.total || 0);
  const avgOrderAmount = orderAmounts.reduce((a, b) => a + b, 0) / (orderAmounts.length || 1);
  const maxOrderAmount = Math.max(...orderAmounts, 0);
  
  // Calculate bid-based features
  const bidAmounts = user.bids.map(bid => bid.amount);
  const avgBidAmount = bidAmounts.reduce((a, b) => a + b, 0) / (bidAmounts.length || 1);
  const maxBidAmount = Math.max(...bidAmounts, 0);
  
  // Calculate transaction-based features
  const transactionAmounts = user.transactions.map(t => t.amount);
  const avgTransactionAmount = transactionAmounts.reduce((a, b) => a + b, 0) / (transactionAmounts.length || 1);
  
  // Calculate login-based features
  const failedLogins = user.loginAttempts.filter(attempt => !attempt.success).length;
  const loginSuccessRate = user.loginAttempts.length > 0 
    ? (user.loginAttempts.filter(attempt => attempt.success).length / user.loginAttempts.length) 
    : 1;

  return {
    accountAge,
    avgOrderAmount,
    maxOrderAmount,
    avgBidAmount,
    maxBidAmount,
    avgTransactionAmount,
    failedLogins,
    loginSuccessRate,
    totalOrders: user.orders.length,
    totalBids: user.bids.length,
    totalTransactions: user.transactions.length
  };
};

// Anomaly detection using statistical methods
const detectAnomalies = (features) => {
  const anomalies = [];
  
  // Define thresholds (these should be tuned based on your data)
  const thresholds = {
    maxOrderAmount: 1000, // Maximum expected order amount
    maxBidAmount: 500,    // Maximum expected bid amount
    failedLogins: 5,      // Maximum failed login attempts
    loginSuccessRate: 0.5 // Minimum expected login success rate
  };

  // Check for anomalies
  if (features.maxOrderAmount > thresholds.maxOrderAmount) {
    anomalies.push({
      type: 'HIGH_VALUE_ORDER',
      severity: 'HIGH',
      details: `Unusually high order amount: ${features.maxOrderAmount}`
    });
  }

  if (features.maxBidAmount > thresholds.maxBidAmount) {
    anomalies.push({
      type: 'HIGH_VALUE_BID',
      severity: 'MEDIUM',
      details: `Unusually high bid amount: ${features.maxBidAmount}`
    });
  }

  if (features.failedLogins > thresholds.failedLogins) {
    anomalies.push({
      type: 'MULTIPLE_FAILED_LOGINS',
      severity: 'HIGH',
      details: `Multiple failed login attempts: ${features.failedLogins}`
    });
  }

  if (features.loginSuccessRate < thresholds.loginSuccessRate) {
    anomalies.push({
      type: 'LOW_LOGIN_SUCCESS',
      severity: 'MEDIUM',
      details: `Low login success rate: ${features.loginSuccessRate}`
    });
  }

  return anomalies;
};

// Main function to analyze user behavior
const analyzeUserBehavior = async (userId) => {
  try {
    const features = await extractUserFeatures(userId);
    if (!features) return null;

    const anomalies = detectAnomalies(features);
    
    if (anomalies.length > 0) {
      // Create notification for each anomaly
      for (const anomaly of anomalies) {
        await createNotification({
          userId: 1, // Admin ID
          type: 'FRAUD_ALERT',
          message: `Anomaly detected for user ${userId}: ${anomaly.type}`,
          data: {
            type: anomaly.type,
            severity: anomaly.severity,
            details: anomaly.details,
            userId,
            features
          }
        });
      }
    }

    return {
      userId,
      features,
      anomalies,
      riskScore: calculateRiskScore(anomalies)
    };
  } catch (error) {
    console.error('Error in analyzeUserBehavior:', error);
    return null;
  }
};

// Calculate risk score based on anomalies
const calculateRiskScore = (anomalies) => {
  const severityWeights = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const totalWeight = anomalies.reduce((sum, anomaly) => 
    sum + severityWeights[anomaly.severity], 0);
  
  // Normalize score between 0 and 100
  return Math.min(100, (totalWeight / 3) * 20);
};

module.exports = {
  analyzeUserBehavior,
  extractUserFeatures,
  detectAnomalies,
  calculateRiskScore
}; 