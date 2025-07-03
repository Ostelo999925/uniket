// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });

    if (!user) {
      console.log('[AUTH] User not found:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    next();
  } catch (error) {
    console.error('[AUTH] Error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Authentication error' });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    if (!roles.includes(req.user.role)) {
      console.log('[AUTH] Authorization failed:', {
        userRole: req.user.role,
        requiredRoles: roles
      });
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// New middleware for bidding operations
const authorizeBidding = {
  // Only customers can place bids
  canBid: (req, res, next) => {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ 
        error: "Forbidden: Only customers can place bids" 
      });
    }
    next();
  },

  // Only vendors can manage their product bids
  canManageBids: async (req, res, next) => {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ 
        error: "Forbidden: Only vendors can manage bids" 
      });
    }
    next();
  }
};

module.exports = { 
  authenticate, 
  authorize, 
  authorizeBidding 
};