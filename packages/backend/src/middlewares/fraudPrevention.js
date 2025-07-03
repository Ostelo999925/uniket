const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Define restricted actions for suspicious users
const RESTRICTED_ACTIONS = {
  customer: [
    'POST /api/orders',
    'POST /api/bids',
    'PUT /api/orders/:id/cancel',
    'POST /api/reviews'
  ],
  vendor: [
    'POST /api/products',
    'PUT /api/products/:id',
    'DELETE /api/products/:id',
    'POST /api/orders/:id/fulfill'
  ]
};

// Middleware to check if user is suspicious
const checkSuspiciousUser = async (req, res, next) => {
  try {
    // Skip check for admin users
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is marked as suspicious in the token
    if (req.user.isSuspicious) {
      const action = `${req.method} ${req.baseUrl}${req.path}`;
      const restrictedActions = RESTRICTED_ACTIONS[req.user.role] || [];

      if (restrictedActions.includes(action)) {
        return res.status(403).json({
          error: 'Action restricted due to suspicious activity',
          message: 'Your account has been flagged for suspicious activity. Please contact support for assistance.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in fraud prevention middleware:', error);
    next(error);
  }
};

// Middleware to monitor high-value transactions
const monitorHighValueTransaction = async (req, res, next) => {
  try {
    if (req.user.isSuspicious) {
      const { amount } = req.body;
      
      if (amount > 1000) { // High value threshold
        // Create a notification for admin
        await prisma.notification.create({
          data: {
            userId: 1, // Admin ID
            type: 'FRAUD_ALERT',
            message: `High-value transaction attempt by suspicious user ${req.user.id}`,
            data: JSON.stringify({
              type: 'HIGH_VALUE_TRANSACTION',
              userId: req.user.id,
              amount,
              action: `${req.method} ${req.baseUrl}${req.path}`
            })
          }
        });

        // Require additional verification for high-value transactions
        return res.status(403).json({
          error: 'Additional verification required',
          message: 'Due to your account status, high-value transactions require additional verification. Please contact support.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in transaction monitoring middleware:', error);
    next(error);
  }
};

// Middleware to track user actions
const trackUserActions = async (req, res, next) => {
  try {
    const action = `${req.method} ${req.baseUrl}${req.path}`;
    
    // Log the action
    await prisma.userAction.create({
      data: {
        userId: req.user.id,
        action,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: JSON.stringify({
          body: req.body,
          query: req.query,
          params: req.params
        })
      }
    });

    next();
  } catch (error) {
    console.error('Error in action tracking middleware:', error);
    next(error);
  }
};

module.exports = {
  checkSuspiciousUser,
  monitorHighValueTransaction,
  trackUserActions
}; 