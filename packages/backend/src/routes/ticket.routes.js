const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { cacheMiddleware, clearCache } = require('../middlewares/cache');
const { sensitiveOperationLimiter } = require('../middlewares/rateLimiter');
const ticketController = require('../controllers/ticket.controller');

// Protected routes
router.use(authenticate);

// Get user tickets
router.get('/user', cacheMiddleware(60), ticketController.getUserTickets);

// Get admin tickets
router.get('/admin',
  authorize(['admin']),
  cacheMiddleware(60),
  ticketController.getAdminTickets
);

// Create ticket
router.post('/',
  sensitiveOperationLimiter,
  ticketController.createTicket
);

// Get ticket by ID
router.get('/:id',
  cacheMiddleware(60),
  ticketController.getTicketById
);

// Update ticket
router.put('/:id',
  sensitiveOperationLimiter,
  ticketController.updateTicket
);

// Close ticket
router.put('/:id/close',
  sensitiveOperationLimiter,
  ticketController.closeTicket
);

// Add reply to ticket
router.post('/:id/reply',
  sensitiveOperationLimiter,
  ticketController.addReply
);

module.exports = router; 