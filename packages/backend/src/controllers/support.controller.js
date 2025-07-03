const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { createNotification } = require('../utils/notification');

// Predefined responses for common queries
const COMMON_RESPONSES = {
  greeting: [
    "Hello! How can I help you today?",
    "Hi there! What can I assist you with?",
    "Welcome! How may I help you?"
  ],
  bidding: [
    "I'll help you check your bidding information.",
    "Let me fetch your bidding details for you."
  ],
  products: [
    "I'll check the number of products in your account.",
    "Let me count your products for you."
  ],
  orders: [
    "I'll help you check your orders.",
    "Let me fetch your order information."
  ],
  notifications: [
    "I'll check your notifications.",
    "Let me fetch your notification details."
  ],
  default: [
    "I understand your concern. Let me help you with that.",
    "I'll do my best to assist you with this matter.",
    "Thank you for bringing this to our attention. I'll help you resolve it."
  ]
};

// Keywords for response selection with natural language patterns
const KEYWORDS = {
  greeting: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
  bidding: ['bid', 'bidding', 'bids', 'auction', 'offer', 'offers', 'price'],
  products: ['product', 'products', 'items', 'listings', 'how many', 'list', 'show', 'display'],
  orders: ['order', 'orders', 'delivery', 'tracking', 'status', 'shipped', 'delivered'],
  notifications: ['notification', 'notifications', 'alerts', 'updates', 'messages'],
  reviews: ['review', 'reviews', 'rating', 'ratings', 'feedback', 'comments', 'opinions'],
  sales: ['sale', 'sales', 'revenue', 'earnings', 'income', 'profit', 'money'],
  customers: ['customer', 'customers', 'buyers', 'clients', 'shoppers']
};

// Get vendor's order information
const getVendorOrders = async (userId) => {
  const orders = await prisma.order.findMany({
    where: {
      product: {
        vendorId: userId
      }
    },
    include: {
      product: true,
      customer: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      },
      tracking: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return {
    totalOrders: orders.length,
    recentOrders: orders.slice(0, 5),
    statusBreakdown: {
      processing: orders.filter(o => o.status === 'Processing').length,
      shipped: orders.filter(o => o.status === 'Shipped').length,
      delivered: orders.filter(o => o.status === 'Delivered').length,
      cancelled: orders.filter(o => o.status === 'Cancelled').length
    }
  };
};

// Get vendor's product information
const getVendorProducts = async (userId) => {
  const products = await prisma.product.findMany({
    where: { 
      vendorId: userId 
    },
    include: {
      review: true,
      bid: true
    }
  });

  return {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'APPROVED').length,
    pendingProducts: products.filter(p => p.status === 'PENDING').length,
    totalReviews: products.reduce((acc, p) => acc + p.review.length, 0),
    averageRating: products.reduce((acc, p) => {
      const ratings = p.review.map(r => r.rating);
      return acc + (ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0);
    }, 0) / products.length || 0
  };
};

// Get vendor's bidding information
const getVendorBiddingInfo = async (userId) => {
  const bids = await prisma.bid.findMany({
    where: { userId },
    include: {
      product: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return {
    totalBids: bids.length,
    activeBids: bids.filter(bid => bid.status === 'PENDING').length,
    wonBids: bids.filter(bid => bid.status === 'WON').length,
    recentBids: bids.slice(0, 5)
  };
};

// Get specific order details
const getOrderDetails = async (orderId, userId) => {
  const order = await prisma.order.findFirst({
    where: {
      id: parseInt(orderId),
      product: {
        vendorId: userId
      }
    },
    include: {
      product: true,
      customer: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      },
      tracking: true
    }
  });

  return order;
};

// Get vendor's notifications
const getVendorNotifications = async (userId) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      role: 'vendor'
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  return {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    recent: notifications.map(n => ({
      id: n.id,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
      data: n.data ? JSON.parse(n.data) : null
    }))
  };
};

// Get vendor's reviews
const getVendorReviews = async (userId) => {
  const reviews = await prisma.review.findMany({
    where: {
      product: {
        vendorId: userId
      }
    },
    include: {
      product: true,
      user: {
        select: {
          name: true,
          image: true
        }
      },
      reactions: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;
  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  };

  return {
    total: reviews.length,
    averageRating: averageRating.toFixed(1),
    ratingDistribution,
    recent: reviews.slice(0, 5).map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      product: review.product.name,
      customer: review.user.name,
      date: review.createdAt,
      likes: review.reactions.filter(r => r.type === 'like').length,
      dislikes: review.reactions.filter(r => r.type === 'dislike').length
    }))
  };
};

// Get vendor's sales information
const getVendorSales = async (userId) => {
  const orders = await prisma.order.findMany({
    where: {
      product: {
        vendorId: userId
      },
      status: {
        in: ['Delivered', 'Completed']
      }
    },
    include: {
      product: true
    }
  });

  const totalSales = orders.reduce((acc, order) => acc + (order.total || 0), 0);
  const recentSales = orders.slice(0, 5);

  return {
    totalSales,
    totalOrders: orders.length,
    recentSales: recentSales.map(order => ({
      id: order.id,
      product: order.product.name,
      amount: order.total,
      date: order.createdAt
    }))
  };
};

// Analyze message and select appropriate response
const analyzeMessage = async (message, userId) => {
  const lowerMessage = message.toLowerCase();
  
  // Check for review-related queries
  if (KEYWORDS.reviews.some(word => lowerMessage.includes(word))) {
    const reviewInfo = await getVendorReviews(userId);
    if (reviewInfo.total === 0) {
      return "You haven't received any reviews yet.";
    }
    
    return `Your Reviews Summary:\n` +
           `Total Reviews: ${reviewInfo.total}\n` +
           `Average Rating: ${reviewInfo.averageRating}/5\n\n` +
           `Rating Distribution:\n` +
           `5★: ${reviewInfo.ratingDistribution[5]}\n` +
           `4★: ${reviewInfo.ratingDistribution[4]}\n` +
           `3★: ${reviewInfo.ratingDistribution[3]}\n` +
           `2★: ${reviewInfo.ratingDistribution[2]}\n` +
           `1★: ${reviewInfo.ratingDistribution[1]}\n\n` +
           `Recent Reviews:\n` +
           reviewInfo.recent.map(r => 
             `${r.rating}★ - ${r.product}\n` +
             `"${r.comment}"\n` +
             `By: ${r.customer} (${new Date(r.date).toLocaleDateString()})\n` +
             `👍 ${r.likes} 👎 ${r.dislikes}\n`
           ).join('\n');
  }

  // Check for sales-related queries
  if (KEYWORDS.sales.some(word => lowerMessage.includes(word))) {
    const salesInfo = await getVendorSales(userId);
    return `Your Sales Summary:\n` +
           `Total Sales: $${salesInfo.totalSales.toFixed(2)}\n` +
           `Total Orders: ${salesInfo.totalOrders}\n\n` +
           `Recent Sales:\n` +
           salesInfo.recentSales.map(sale => 
             `#${sale.id} - ${sale.product}\n` +
             `Amount: $${sale.amount}\n` +
             `Date: ${new Date(sale.date).toLocaleDateString()}\n`
           ).join('\n');
  }

  // Check for notification-related queries
  if (KEYWORDS.notifications.some(word => lowerMessage.includes(word))) {
    const notificationInfo = await getVendorNotifications(userId);
    if (notificationInfo.total === 0) {
      return "You have no notifications at the moment.";
    }
    
    return `Your Notifications Summary:\n` +
           `Total Notifications: ${notificationInfo.total}\n` +
           `Unread Notifications: ${notificationInfo.unread}\n\n` +
           `Recent Notifications:\n` +
           notificationInfo.recent.map(n => 
             `[${n.read ? '✓' : '•'}] ${n.message} (${new Date(n.createdAt).toLocaleDateString()})`
           ).join('\n');
  }

  // Check for order-related queries
  if (KEYWORDS.orders.some(word => lowerMessage.includes(word))) {
    const orderMatch = lowerMessage.match(/#(\d+)/);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const order = await getOrderDetails(orderId, userId);
      if (order) {
        return `Order #${orderId} Details:\n` +
               `Status: ${order.status}\n` +
               `Product: ${order.product.name}\n` +
               `Customer: ${order.customer.name}\n` +
               `Date: ${new Date(order.createdAt).toLocaleDateString()}\n` +
               `Tracking: ${order.tracking ? order.tracking.trackingNumber : 'Not available'}`;
      } else {
        return `I couldn't find order #${orderId}. Please check the order number and try again.`;
      }
    }

    const orderInfo = await getVendorOrders(userId);
    return `Your Order Summary:\n` +
           `Total Orders: ${orderInfo.totalOrders}\n` +
           `Processing: ${orderInfo.statusBreakdown.processing}\n` +
           `Shipped: ${orderInfo.statusBreakdown.shipped}\n` +
           `Delivered: ${orderInfo.statusBreakdown.delivered}\n` +
           `Cancelled: ${orderInfo.statusBreakdown.cancelled}\n\n` +
           `Recent Orders:\n` +
           orderInfo.recentOrders.map(order => 
             `#${order.id} - ${order.product.name} (${order.status})`
           ).join('\n');
  }

  // Check for product-related queries
  if (KEYWORDS.products.some(word => lowerMessage.includes(word))) {
    const productInfo = await getVendorProducts(userId);
    return `Your Product Summary:\n` +
           `Total Products: ${productInfo.totalProducts}\n` +
           `Active Products: ${productInfo.activeProducts}\n` +
           `Pending Products: ${productInfo.pendingProducts}\n` +
           `Total Reviews: ${productInfo.totalReviews}\n` +
           `Average Rating: ${productInfo.averageRating.toFixed(1)}/5`;
  }

  // Check for bidding-related queries
  if (KEYWORDS.bidding.some(word => lowerMessage.includes(word))) {
    const biddingInfo = await getVendorBiddingInfo(userId);
    return `Your Bidding Summary:\n` +
           `Total Bids: ${biddingInfo.totalBids}\n` +
           `Active Bids: ${biddingInfo.activeBids}\n` +
           `Won Bids: ${biddingInfo.wonBids}\n\n` +
           `Recent Bids:\n` +
           biddingInfo.recentBids.map(bid => 
             `${bid.product.name} - ${bid.amount} (${bid.status})`
           ).join('\n');
  }

  // If no specific category matches, return a default response
  return "I can help you with information about your orders, products, reviews, sales, and notifications. What would you like to know?";
};

// Get chat history for a user
const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 50, offset = 0 } = req.query;

    // Construct the query
    const query = {
      orderBy: {
        createdAt: 'asc'
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: {
          select: {
            name: true,
            image: true
          }
        },
        parent: true,
        children: true
      }
    };

    // Add where clause based on user role
    if (userRole !== 'admin') {
      query.where = { userId };
    }

    // Execute the query
    const messages = await prisma.supportchat.findMany(query);

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.message,
      type: msg.type,
      timestamp: msg.createdAt,
      user: msg.user,
      parentId: msg.parentId,
      hasChildren: msg.children.length > 0
    }));

    res.json({
      success: true,
      data: formattedMessages
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

// Handle incoming chat messages
const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const { id } = req.params;
    const isReply = req.path.includes('/reply');
    const isResolve = req.path.includes('/resolve');

    if (!message && !isResolve) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (isResolve) {
      const { resolution } = req.body;
      if (!resolution) {
        return res.status(400).json({ error: 'Resolution message is required' });
      }

      const chat = await prisma.supportchat.update({
        where: { id: parseInt(id) },
        data: {
          message: resolution,
          type: 'AI',
          parentId: parseInt(id),
          updatedAt: new Date()
        }
      });

      return res.json({
        success: true,
        data: {
          ...chat,
          status: 'resolved'
        }
      });
    }

    // For replies, verify the parent chat exists
    let parentId = null;
    if (isReply) {
      const parentChat = await prisma.supportchat.findUnique({
        where: { id: parseInt(id) }
      });
      if (!parentChat) {
        return res.status(404).json({ error: 'Parent chat not found' });
      }
      parentId = parentChat.id;
    }

    // Store the user message
    const chatMessage = await prisma.supportchat.create({
      data: {
        userId,
        message: message.slice(0, 1000), // Truncate user message if too long
        type: 'USER',
        parentId,
        updatedAt: new Date()
      }
    });

    // Analyze message and generate AI response
    const aiResponse = await analyzeMessage(message, userId);

    // Truncate AI response if too long and split into multiple messages if needed
    const maxMessageLength = 1000;
    const aiResponseChunks = [];
    
    if (aiResponse.length > maxMessageLength) {
      // Split response into chunks at newlines
      const lines = aiResponse.split('\n');
      let currentChunk = '';
      
      for (const line of lines) {
        if ((currentChunk + '\n' + line).length > maxMessageLength) {
          if (currentChunk) {
            aiResponseChunks.push(currentChunk);
            currentChunk = line;
          } else {
            // If a single line is too long, split it
            const words = line.split(' ');
            for (const word of words) {
              if ((currentChunk + ' ' + word).length > maxMessageLength) {
                aiResponseChunks.push(currentChunk);
                currentChunk = word;
              } else {
                currentChunk += (currentChunk ? ' ' : '') + word;
              }
            }
          }
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      
      if (currentChunk) {
        aiResponseChunks.push(currentChunk);
      }
    } else {
      aiResponseChunks.push(aiResponse);
    }

    // Store AI responses
    const aiMessages = [];
    for (const chunk of aiResponseChunks) {
      const aiMessage = await prisma.supportchat.create({
        data: {
          userId,
          message: chunk,
          type: 'AI',
          parentId: isReply ? parentId : chatMessage.id, // Use parentId for replies, chatMessage.id for new chats
          updatedAt: new Date()
        }
      });
      aiMessages.push({
        ...aiMessage,
        status: 'resolved'
      });
    }

    // Create notification for the user
    try {
      await createNotification({
        userId,
        type: 'support',
        message: 'New support message received',
        data: {
          messageId: aiMessages[0].id,
          response: aiResponseChunks[0] // Store only the first chunk in notification
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't fail the request if notification creation fails
    }

    res.json({
      success: true,
      message: aiResponseChunks[0], // Return first chunk as main response
      data: {
        userMessage: {
          ...chatMessage,
          status: 'active'
        },
        aiMessages,
        isMultiPart: aiResponseChunks.length > 1
      }
    });

  } catch (error) {
    console.error('Error handling chat message:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2000') {
      return res.status(400).json({ 
        error: 'Message is too long. Please try a shorter message.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a specific message
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = parseInt(req.params.messageId);

    // Check if message exists and belongs to the user
    const message = await prisma.supportchat.findFirst({
      where: {
        id: messageId,
        userId: userId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    // Delete the message
    await prisma.supportchat.delete({
      where: {
        id: messageId
      }
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  handleChatMessage,
  getChatHistory,
  deleteMessage
}; 