const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const QRCode = require('qrcode');
const crypto = require('crypto');
const { createNotification } = require('./notification');

/**
 * Generate a unique ticket number
 */
const generateTicketNumber = () => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex');
  return `TKT-${timestamp}-${random}`;
};

/**
 * Generate QR code for a ticket
 */
const generateQRCode = async (ticketData = null) => {
  try {
    // For testing, generate a very short QR code
    if (!ticketData) {
      return crypto.randomBytes(8).toString('hex');
    }

    // Create a minimal data object
    const qrData = {
      t: ticketData.ticketNumber.slice(-4),  // last 4 chars of ticket number
      p: ticketData.productId.toString(36),  // base36 encoded product id
      u: ticketData.userId.toString(36),     // base36 encoded user id
      ts: Math.floor(Date.now() / 1000).toString(36).slice(-4)  // last 4 chars of base36 timestamp
    };
    
    // Convert to base64 and take only first 50 chars
    const base64Data = Buffer.from(JSON.stringify(qrData)).toString('base64').slice(0, 50);
    
    // Generate QR code and return just the base64 data without the data URL prefix
    const dataUrl = await QRCode.toDataURL(base64Data, { 
      errorCorrectionLevel: 'L',
      margin: 0,
      width: 50,
      scale: 1
    });
    
    // Extract just the base64 data from the data URL
    return dataUrl.split(',')[1].slice(0, 150);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Create tickets for an order
 */
const createTickets = async (orderId, productId, userId, quantity) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { ticketDetails: true }
    });

    if (!product.isTicket || !product.ticketDetails) {
      throw new Error('Product is not a ticket');
    }

    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = generateTicketNumber();
      const qrCode = await generateQRCode({
        ticketNumber,
        productId,
        userId
      });

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          qrCode,
          productId,
          orderId,
          userId,
          status: 'VALID'
        }
      });

      tickets.push(ticket);
    }

    // Get user details for notification
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Create notification with ticket details
    await createNotification({
      userId,
      type: 'ticket',
      message: `Your tickets for ${product.ticketDetails.eventName} have been issued.`,
      data: {
        eventName: product.ticketDetails.eventName,
        eventDate: product.ticketDetails.eventDate,
        eventLocation: product.ticketDetails.eventLocation,
        ticketType: product.ticketDetails.ticketType,
        ticketCount: quantity,
        tickets: tickets.map(ticket => ({
          ticketNumber: ticket.ticketNumber,
          qrCode: ticket.qrCode
        }))
      }
    });

    // In test mode, log ticket details to console
    console.log('=== TICKET ISSUED (TEST MODE) ===');
    console.log(`Event: ${product.ticketDetails.eventName}`);
    console.log(`Date: ${product.ticketDetails.eventDate}`);
    console.log(`Location: ${product.ticketDetails.eventLocation}`);
    console.log(`Ticket Type: ${product.ticketDetails.ticketType}`);
    console.log(`Quantity: ${quantity}`);
    console.log('Tickets:');
    tickets.forEach(ticket => {
      console.log(`- Ticket #${ticket.ticketNumber}`);
      console.log(`  QR Code: ${ticket.qrCode}`);
    });
    console.log('==============================');

    return tickets;
  } catch (error) {
    console.error('Error creating tickets:', error);
    throw error;
  }
};

/**
 * Verify a ticket using QR code
 */
const verifyTicket = async (qrCode, prismaInstance = prisma) => {
  try {
    const ticket = await prismaInstance.ticket.findFirst({
      where: { qrCode },
      include: {
        product: {
          include: {
            ticketdetails: true
          }
        },
        user: true
      }
    });

    if (!ticket) {
      throw new Error('Invalid ticket');
    }

    if (ticket.status !== 'VALID') {
      throw new Error(`Ticket is ${ticket.status.toLowerCase()}`);
    }

    if (new Date() > ticket.product.ticketdetails.validUntil) {
      await prismaInstance.ticket.update({
        where: { id: ticket.id },
        data: { status: 'EXPIRED' }
      });
      throw new Error('Ticket has expired');
    }

    return {
      isValid: true,
      ticket,
      eventName: ticket.product.ticketdetails.eventName,
      eventDate: ticket.product.ticketdetails.eventDate,
      eventLocation: ticket.product.ticketdetails.eventLocation,
      ticketType: ticket.product.ticketdetails.ticketType,
      userName: ticket.user.name
    };
  } catch (error) {
    console.error('Error verifying ticket:', error);
    throw error;
  }
};

/**
 * Mark a ticket as used
 */
const markTicketAsUsed = async (ticketId, prismaInstance = prisma) => {
  try {
    const ticket = await prismaInstance.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'USED',
        usedAt: new Date()
      }
    });

    await createNotification({
      userId: ticket.userId,
      type: 'ticket',
      message: `Your ticket #${ticket.ticketNumber} has been used.`,
      data: {
        ticketNumber: ticket.ticketNumber,
        usedAt: ticket.usedAt
      }
    });

    return ticket;
  } catch (error) {
    console.error('Error marking ticket as used:', error);
    throw error;
  }
};

module.exports = {
  createTickets,
  verifyTicket,
  markTicketAsUsed,
  generateQRCode,
  generateTicketNumber
}; 