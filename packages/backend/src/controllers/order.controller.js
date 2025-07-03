const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { createNotification } = require('../utils/notification');
const { createTickets } = require('../utils/ticket');
const { ApiError } = require('../utils/ApiError');
const { v4: uuidv4 } = require('uuid');

// Track order by tracking number
const trackOrder = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    const order = await prisma.order.findFirst({
      where: { trackingId: trackingNumber },
      include: {
        customer: {
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
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        ordertracking: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
};

// Get order reports (admin only)
const getOrderReports = async (req, res) => {
  try {
    const reports = await prisma.order.findMany({
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
            price: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        customerreport: true,
        pickuppoint: true,
        orderrating: true,
        ordertracking: true,
        ticket: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(reports);
  } catch (error) {
    console.error('Error getting order reports:', error);
    res.status(500).json({ error: 'Failed to get order reports' });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        pickuppoint: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true
          }
        },
        ordertracking: true,
        orderrating: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders || []);
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({ error: 'Failed to get user orders', details: error.message });
  }
};

// Get vendor orders
const getVendorOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        product: {
          vendorId: req.user.id
        }
      },
      include: {
        customer: {
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
            price: true,
            image: true
          }
        },
        pickupPoint: true,
        ordertracking: true,
        orderrating: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error getting vendor orders:', error);
    res.status(500).json({ error: 'Failed to get vendor orders' });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { customerId: req.user.id },
          { product: { vendorId: req.user.id } }
        ]
      },
      include: {
        user: true,
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        pickuppoint: true,
        ordertracking: true,
        orderrating: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

// Create order
const createOrder = async (req, res) => {
  try {
    const { 
      items,
      shippingAddress,
      deliveryMethod,
      pickupPointId,
      paymentMethod,
      paymentRef,
      totalAmount
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.email) {
      return res.status(400).json({ error: 'Shipping information is required' });
    }

    // If delivery method is PICKUP, verify pickup point exists
    if (deliveryMethod === 'PICKUP' && pickupPointId) {
      const pickupPoint = await prisma.pickuppoint.findUnique({
        where: { id: pickupPointId }
      });

      if (!pickupPoint) {
        return res.status(404).json({ error: 'Selected pickup point not found' });
      }
    }

    // Create order with all items
    const order = await prisma.order.create({
      data: {
        customerId: userId,
        status: 'pending',
        deliveryMethod,
        pickupPointId: pickupPointId || null,
        paymentMethod: paymentMethod || 'card',
        paymentRef: paymentRef || 'N/A',
        total: totalAmount,
        shippingAddress: JSON.stringify({
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          email: shippingAddress.email
        }),
        trackingId: `TRK-${uuidv4().slice(0, 8).toUpperCase()}`,
        productId: items[0].productId, // Since we can only have one product per order
        quantity: items[0].quantity
      },
      include: {
        pickuppoint: true,
        product: {
          include: {
            user: true
          }
        }
      }
    });

    // Create notifications for vendor
    await createNotification({
      userId: order.product.user.id,
      type: 'NEW_ORDER',
      message: `New order #${order.id} received`,
      orderId: order.id
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, estimatedDeliveryTime } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get order with customer details
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        product: {
          include: {
            user: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create tracking information if order is being shipped
    if (status === 'shipped' && !order.ordertracking) {
      await prisma.ordertracking.create({
        data: {
          id: order.trackingId,
          orderId: order.id,
          status: 'in_transit',
          history: [
            {
              status: 'in_transit',
              location: 'Vendor Location',
              timestamp: new Date().toISOString(),
              description: 'Order has been shipped'
            }
          ],
          currentLocation: 'Vendor Location',
          carrier: 'Local Delivery',
          trackingNumber: order.trackingId,
          estimatedDelivery: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days if not provided
          lastUpdate: new Date(),
          nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next update in 24 hours
        }
      });
    }

    // Update order status and estimated delivery time
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { 
        status,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined
      },
      include: {
        user: true,
        product: {
          include: {
            user: true
          }
        },
        ordertracking: true
      }
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: order.user.id,
        type: 'order_status',
        message: `Your order #${order.id} (Tracking ID: ${order.trackingId}) has been ${status}${estimatedDeliveryTime ? ` with estimated delivery on ${new Date(estimatedDeliveryTime).toLocaleDateString()}` : ''}`,
        data: JSON.stringify({
          orderId: order.id,
          status,
          estimatedDeliveryTime,
          trackingId: order.trackingId
        })
      }
    });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(order.user.id.toString()).emit('order_status_update', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        estimatedDeliveryTime: updatedOrder.estimatedDeliveryTime
      });
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        product: {
          include: {
            vendor: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.customerId !== req.user.id && order.product.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel a delivered order' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'cancelled',
        updatedAt: new Date()
      },
      include: {
        user: true,
        product: {
          include: {
            vendor: true
          }
        }
      }
    });

    // Create notification for both parties
    await Promise.all([
      createNotification({
        userId: order.user.id,
        type: 'ORDER_CANCELLED',
        message: `Order #${order.id} has been cancelled`,
        orderId: order.id
      }),
      createNotification({
        userId: order.product.vendorId,
        type: 'ORDER_CANCELLED',
        message: `Order #${order.id} has been cancelled`,
        orderId: order.id
      })
    ]);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

// Rate order
const rateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, categories } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating value' });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        product: {
          include: {
            user: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to rate this order' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Can only rate delivered orders' });
    }

    const existingRating = await prisma.orderrating.findFirst({
      where: { orderId: parseInt(id) }
    });

    if (existingRating) {
      return res.status(400).json({ error: 'Order already rated' });
    }

    const orderRating = await prisma.orderrating.create({
      data: {
        order: { connect: { id: parseInt(id) } },
        rating,
        comment,
        user: { connect: { id: req.user.id } },
        categories: categories || {
          delivery: rating,
          quality: rating,
          value: rating,
          communication: rating
        },
        updatedAt: new Date()
      }
    });

    // Create notification for vendor
    await createNotification({
      userId: order.product.user.id,
      type: 'ORDER_RATED',
      message: `Order #${order.id} has been rated ${rating} stars`,
      orderId: order.id
    });

    res.json(orderRating);
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ error: 'Failed to rate order' });
  }
};

// Get order tracking information
const getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching tracking info for order:', id);
    console.log('User ID:', req.user.id);
    
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { customerId: req.user.id },
          { product: { vendorId: req.user.id } }
        ]
      },
      include: {
        ordertracking: true,
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log('Found order:', order ? 'Yes' : 'No');

    if (!order) {
      console.log('Order not found or user not authorized');
      return res.status(404).json({ 
        error: 'Order not found or you do not have access to this order',
        details: {
          orderId: id,
          userId: req.user.id
        }
      });
    }

    if (!order.ordertracking) {
      console.log('No tracking information available for order');
      return res.status(404).json({ 
        error: 'Tracking information not available for this order',
        details: {
          orderId: order.id,
          status: order.status
        }
      });
    }

    const response = {
      orderId: order.id,
      trackingId: order.ordertracking.id,
      status: order.status,
      tracking: order.ordertracking,
      product: order.product
    };

    console.log('Sending tracking response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error getting order tracking:', error);
    res.status(500).json({ 
      error: 'Failed to get order tracking information',
      details: error.message
    });
  }
};

module.exports = {
  trackOrder,
  getOrderReports,
  getUserOrders,
  getVendorOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  rateOrder,
  getOrderTracking
};
  