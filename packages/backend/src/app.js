const express = require('express');
const cors = require('cors');
const path = require("path");
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const getPrismaClient = require('./prismaClient');
const fs = require('fs');

// Import middlewares
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { cacheMiddleware } = require('./middlewares/cache');
const paginationMiddleware = require('./middlewares/pagination');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const adminRoutes = require('./routes/admin.routes');
const walletRoute = require('./routes/wallet.routes');
const transactionRoute = require('./routes/transaction.routes');

// Create a basic webhook router as fallback
const webhookRoutes = (() => {
  try {
    return require('./routes/webhook.routes');
  } catch (error) {
    console.warn('Webhook routes not found, using fallback router');
    const router = express.Router();
    router.post('*', (req, res) => res.status(501).json({ error: 'Webhook endpoints not implemented' }));
    return router;
  }
})();

const orderRoutes = require('./routes/order.routes');
const vendorRoutes = require('./routes/vendor.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const biddingRoutes = require('./routes/bidding.routes');
const pickupRoutes = require('./routes/pickup.routes');
const reviewRoutes = require('./routes/review.routes');
const withdrawalRoutes = require('./routes/withdrawal.routes');
const supportRoutes = require('./routes/support.routes');
const ticketRoutes = require('./routes/ticket.routes');

const prisma = getPrismaClient();
const app = express();

// Define safeUse function
function safeUse(path, ...args) {
  if (typeof path === 'string') {
    // Check if path is a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      console.error('Invalid route path (full URL detected):', path);
      console.trace('Stack trace for invalid route path:');
      return app;
    }
    
    // Check if path contains invalid characters
    if (path.includes('://') || path.includes('//')) {
      console.error('Invalid route path (contains invalid characters):', path);
      return app;
    }
    
    // Check for other invalid characters
    if (/[<>:"|?*]/.test(path)) {
      console.error('Invalid route path (contains invalid characters):', path);
      return app;
    }
    
    // Ensure path starts with a forward slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove any trailing slashes
    path = path.replace(/\/+$/, '');
    
    // Remove any double slashes
    path = path.replace(/\/+/g, '/');
    
    // Ensure path is properly encoded
    path = encodeURI(path);
  }
  
  try {
    // Validate that args[0] is a valid middleware or router
    if (args.length > 0) {
      const middleware = args[0];
      if (typeof middleware !== 'function' && !middleware.stack) {
        console.error('Invalid middleware or router:', middleware);
        return app;
      }
    }
    
    return app.use(path, ...args);
  } catch (error) {
    console.error('Error registering route:', {
      originalPath: path,
      error: error.message,
      stack: error.stack
    });
    return app;
  }
}

// Enhanced security middleware
safeUse(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      connectSrc: ["'self'", "http:", "https:", "ws:", "wss:", "https://api.paystack.co"],
      fontSrc: ["'self'", "http:", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "http:", "https:"],
      frameSrc: ["'self'", "http:", "https:"]
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  safeUse(morgan('dev'));
} else {
  safeUse(morgan('combined', {
    skip: (req, res) => res.statusCode < 400, // Only log errors in production
  }));
}

safeUse(cookieParser());

// CORS configuration
safeUse(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Body parsing middleware with limits
safeUse(express.json({ limit: '10kb' }));
safeUse(express.urlencoded({ extended: true, limit: '10kb' }));

// Parameter validation middleware - must be before routes
safeUse((req, res, next) => {
  // Check for any route parameters that might be undefined
  const params = req.params;
  for (const key in params) {
    if (params[key] === undefined || params[key] === null) {
      return res.status(400).json({ error: `Missing required parameter: ${key}` });
    }
  }
  next();
});

// Serve static files from uploads directory
safeUse('/uploads', express.static(path.join(__dirname, '../uploads')));
safeUse('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
safeUse('/api/auth', authRoutes);
safeUse('/api/users', userRoutes);
safeUse('/api/products', productRoutes);
safeUse('/api/vendor', vendorRoutes);
safeUse('/api/cart', cartRoutes);
safeUse('/api/admin', adminRoutes);
safeUse('/api/wallet', walletRoute);
safeUse('/api/transactions', transactionRoute);
safeUse('/api/webhooks', webhookRoutes);
safeUse('/api/orders', orderRoutes);
safeUse('/api/payments', paymentRoutes);
safeUse('/api/notifications', notificationRoutes);
safeUse('/api/bidding', biddingRoutes);
safeUse('/api/pickup', pickupRoutes);
safeUse('/api/reviews', reviewRoutes);
safeUse('/api/withdrawals', withdrawalRoutes);
safeUse('/api/support', supportRoutes);
safeUse('/api/tickets', ticketRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiting to all routes except auth and health check
safeUse('/api', (req, res, next) => {
  // Skip rate limiting for auth routes and health check
  if (req.path === '/auth' || req.path.startsWith('/auth/') || req.path === '/health') {
    return next();
  }
  apiLimiter(req, res, next);
});

// Apply pagination middleware only to routes that need it
safeUse('/api/products', paginationMiddleware);
safeUse('/api/orders', paginationMiddleware);
safeUse('/api/users', paginationMiddleware);

// Cache middleware for specific routes
safeUse('/api/products', cacheMiddleware(300)); // Cache products for 5 minutes
safeUse('/api/categories', cacheMiddleware(600)); // Cache categories for 10 minutes

// Set server timeout
app.set('timeout', 120000); // 2 minutes

// Add keep-alive configuration
safeUse((req, res, next) => {
  res.set('Connection', 'keep-alive');
  res.set('Keep-Alive', 'timeout=120'); // 2 minutes
  next();
});

// Add timeout middleware
safeUse((req, res, next) => {
  res.setTimeout(120000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// 404 handler
safeUse((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware - must be last
app.use(errorHandler);

// Setup Socket.IO
const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Handle order updates
    socket.on('order_update', (data) => {
      io.emit('order_status', data);
    });

    // Handle support messages
    socket.on('support_message', (data) => {
      io.emit('support_message', data);
    });

    // Handle typing status
    socket.on('support_typing', (data) => {
      socket.broadcast.emit('support_typing', data);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

// Export the app and setupSocketIO function
module.exports = { app, setupSocketIO }; 