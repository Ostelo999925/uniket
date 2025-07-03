const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { verifyTicket, markTicketAsUsed } = require('../utils/ticket');
const { createNotification } = require('../utils/notification');

/**
 * Verify a ticket using QR code
 */
const verifyTicketController = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const vendorId = req.user.id;

    // Verify the ticket
    const verificationResult = await verifyTicket(qrCode);

    // Check if the vendor is the owner of the event
    const isEventOwner = await prisma.product.findFirst({
      where: {
        id: verificationResult.ticket.productId,
        vendorId: vendorId
      }
    });

    if (!isEventOwner) {
      return res.status(403).json({
        message: 'You are not authorized to verify this ticket'
      });
    }

    res.json({
      message: 'Ticket is valid',
      ...verificationResult
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    res.status(400).json({
      message: error.message || 'Error verifying ticket'
    });
  }
};

/**
 * Mark a ticket as used
 */
const markTicketAsUsedController = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const vendorId = req.user.id;

    // Get ticket details
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(ticketId) },
      include: {
        product: true
      }
    });

    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    // Check if the vendor is the owner of the event
    const isEventOwner = await prisma.product.findFirst({
      where: {
        id: ticket.productId,
        vendorId: vendorId
      }
    });

    if (!isEventOwner) {
      return res.status(403).json({
        message: 'You are not authorized to mark this ticket as used'
      });
    }

    // Mark ticket as used
    const updatedTicket = await markTicketAsUsed(ticket.id);

    res.json({
      message: 'Ticket marked as used successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error marking ticket as used:', error);
    res.status(400).json({
      message: error.message || 'Error marking ticket as used'
    });
  }
};

/**
 * Get all tickets for an event
 */
const getEventTickets = async (req, res) => {
  try {
    const { productId } = req.params;
    const vendorId = req.user.id;

    // Check if the vendor is the owner of the event
    const event = await prisma.product.findFirst({
      where: {
        id: parseInt(productId),
        vendorId: vendorId
      }
    });

    if (!event) {
      return res.status(403).json({
        message: 'You are not authorized to view these tickets'
      });
    }

    // Get all tickets for the event
    const tickets = await prisma.ticket.findMany({
      where: {
        productId: parseInt(productId)
      },
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

    res.json({
      message: 'Tickets retrieved successfully',
      tickets
    });
  } catch (error) {
    console.error('Error getting event tickets:', error);
    res.status(400).json({
      message: error.message || 'Error getting event tickets'
    });
  }
};

// Get user tickets
const getUserTickets = async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error('Error getting user tickets:', error);
    res.status(500).json({ error: 'Failed to get user tickets' });
  }
};

// Get admin tickets
const getAdminTickets = async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error('Error getting admin tickets:', error);
    res.status(500).json({ error: 'Failed to get admin tickets' });
  }
};

// Create ticket
const createTicket = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: req.user.id,
        productId: parseInt(productId),
        quantity,
        status: 'ACTIVE',
        qrCode: `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      include: {
        product: {
          select: {
            name: true,
            image: true,
            price: true
          }
        }
      }
    });

    // Create notification for vendor
    await createNotification({
      userId: product.vendorId,
      type: 'TICKET_CREATED',
      message: `New ticket purchased for ${product.name}`,
      data: { ticketId: ticket.id }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

// Get ticket by ID
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId: req.user.id },
          { product: { vendorId: req.user.id } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
};

// Update ticket
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(id),
        product: { vendorId: req.user.id }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        status: status || undefined,
        notes: notes || undefined
      }
    });

    res.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

// Close ticket
const closeTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId: req.user.id },
          { product: { vendorId: req.user.id } }
        ]
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: { status: 'CLOSED' }
    });

    res.json(updatedTicket);
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
};

// Add reply to ticket
const addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId: req.user.id },
          { product: { vendorId: req.user.id } }
        ]
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: parseInt(id),
        userId: req.user.id,
        message
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Create notification for the other party
    const notificationUserId = req.user.id === ticket.userId ? 
      ticket.product.vendorId : ticket.userId;

    await createNotification({
      userId: notificationUserId,
      type: 'TICKET_REPLY',
      message: `New reply on ticket #${ticket.id}`,
      data: { ticketId: ticket.id }
    });

    res.json(reply);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
};

module.exports = {
  getUserTickets,
  getAdminTickets,
  createTicket,
  getTicketById,
  updateTicket,
  closeTicket,
  addReply,
  verifyTicketController,
  markTicketAsUsedController,
  getEventTickets
}; 