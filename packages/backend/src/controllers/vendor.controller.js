const getPrismaClient = require('../prismaClient');
const fs = require('fs');
const path = require('path');
const { clearCache } = require('../utils/cache');

// Get vendor profile
const getVendorProfile = async (req, res) => {
  try {
    console.log('Getting vendor profile for user:', req.user);
    const prisma = getPrismaClient();
    const vendor = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Error in getVendorProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update vendor profile
const updateVendorProfile = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { name, email, phone } = req.body;
    
    const updatedVendor = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email, phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });

    res.json(updatedVendor);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Update vendor profile image
const updateVendorProfileImage = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const imageUrl = `/uploads/profile_images/${req.file.filename}`;
    
    const updatedVendor = await prisma.user.update({
      where: { id: req.user.id },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    res.json({
      message: 'Profile image updated successfully',
      imageUrl: updatedVendor.image,
      vendor: updatedVendor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getVendorReviews = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const vendorId = req.user.id;
    console.log('Fetching reviews for vendor:', vendorId);
    
    // Find all products from this vendor
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId },
      select: { id: true }
    });
    
    console.log('Found vendor products:', vendorProducts.length);
    
    if (!vendorProducts.length) {
      console.log('No products found for vendor');
      return res.status(200).json([]);
    }
    
    // Get product IDs
    const productIds = vendorProducts.map(p => p.id);
    console.log('Product IDs:', productIds);
    
    // Find all reviews for these products
    const reviews = await prisma.review.findMany({
      where: {
        productId: { in: productIds }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found reviews:', reviews.length);
    
    // Check for unread notifications about these reviews
    const reviewNotifications = await prisma.notification.findMany({
      where: {
        userId: vendorId,
        type: 'review',
        read: false
      }
    });
    
    console.log('Found unread review notifications:', reviewNotifications.length);
    
    // Mark reviews as new if they have unread notifications
    const reviewsWithNewFlag = reviews.map(review => {
      const hasUnreadNotification = reviewNotifications.some(notification => {
        try {
          const data = JSON.parse(notification.data || '{}');
          return data.reviewId === review.id;
        } catch (e) {
          console.error('Error parsing notification data:', e);
          return false;
        }
      });
      
      return {
        ...review,
        isNew: hasUnreadNotification
      };
    });
    
    console.log('Returning reviews with new flags');
    return res.status(200).json(reviewsWithNewFlag);
  } catch (error) {
    console.error('Error fetching vendor reviews:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to fetch reviews',
      details: error.message
    });
  }
};

// Add missing controller functions

const getDashboardStats = async (req, res) => {
  try {
    console.log('Fetching dashboard stats for vendor:', req.user.id);
    const prisma = getPrismaClient();
    const vendorId = req.user.id;

    // Get total products
    const totalProducts = await prisma.product.count({
      where: { vendorId }
    });

    // Get total orders
    const totalOrders = await prisma.order.count({
      where: {
        product: { vendorId }
      }
    });

    // Get total revenue
    const totalRevenue = await prisma.order.aggregate({
      where: {
        product: { vendorId },
        status: 'delivered'
      },
      _sum: { total: true }
    });

    // Get low stock products
    const lowStockProducts = await prisma.product.count({
      where: {
        vendorId,
        quantity: { lt: 5 }
      }
    });

    // Get total product views
    const totalProductViews = await prisma.productview.count({
      where: {
        product: { vendorId }
      }
    });

    // Get total sales
    const totalSales = await prisma.order.aggregate({
      where: {
        product: { vendorId }
      },
      _sum: { quantity: true }
    });

    // Get top product
    const topProduct = await prisma.product.findFirst({
      where: { vendorId },
      orderBy: { views: 'desc' },
      select: {
        id: true,
        name: true,
        views: true
      }
    });

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await prisma.order.count({
      where: {
        product: { vendorId },
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Ensure we have default values for all stats
    const stats = {
      totalProducts: totalProducts || 0,
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue?._sum?.total || 0,
      totalSales: totalSales?._sum?.quantity || 0,
      lowStockProducts: lowStockProducts || 0,
      topProduct: topProduct || { name: 'N/A', views: 0 },
      totalProductViews: totalProductViews || 0,
      recentOrders: recentOrders || 0
    };

    console.log('Dashboard stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

const getVendorOrders = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const orders = await prisma.order.findMany({
      where: {
        product: {
          vendorId: req.user.id
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pickuppoint: true,
        ordertracking: true,
        orderrating: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getVendorProducts = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const products = await prisma.product.findMany({
      where: { vendorId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    console.error('Error getting vendor products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

const updateVendorSettings = async (req, res) => {
  res.status(200).json({ message: 'updateVendorSettings not implemented yet' });
};

const getVendorAnalytics = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get all orders for this vendor's products
    const prisma = getPrismaClient();
    const orders = await prisma.order.findMany({
      where: {
        product: {
          vendorId: vendorId
        }
      },
      include: {
        product: true
      }
    });

    // Calculate total sales
    const totalSales = orders.length;

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Calculate conversion rate (orders / product views)
    const productViews = await prisma.productView.count({
      where: {
        product: {
          vendorId: vendorId
        }
      }
    });

    const conversionRate = productViews > 0 ? (totalSales / productViews) * 100 : 0;

    // Get top performing products
    const productStats = await prisma.product.findMany({
      where: {
        vendorId: vendorId
      },
      include: {
        _count: {
          select: {
            orders: true,
            productViews: true,
            reviews: true
          }
        },
        orders: {
          select: {
            total: true
          }
        }
      }
    });

    // Calculate performance metrics for each product
    const topProducts = productStats.map(product => {
      const totalRevenue = product.orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const avgRating = product._count.reviews > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product._count.reviews 
        : 0;
      
      return {
        id: product.id,
        name: product.name,
        image: product.image,
        totalSales: product._count.orders,
        totalRevenue: totalRevenue,
        views: product._count.productViews,
        rating: avgRating,
        conversionRate: product._count.productViews > 0 
          ? (product._count.orders / product._count.productViews) * 100 
          : 0
      };
    });

    // Sort products by total revenue
    topProducts.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Get sales trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const salesTrend = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const dailyOrders = await prisma.order.count({
          where: {
            product: {
              vendorId: vendorId
            },
            createdAt: {
              gte: startOfDay,
              lt: endOfDay
            }
          }
        });

        const dailyRevenue = await prisma.order.aggregate({
          where: {
            product: {
              vendorId: vendorId
            },
            createdAt: {
              gte: startOfDay,
              lt: endOfDay
            }
          },
          _sum: {
            total: true
          }
        });

        return {
          date,
          orders: dailyOrders,
          revenue: dailyRevenue._sum.total || 0
        };
      })
    );

    res.json({
      totalSales,
      totalRevenue,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      topProducts: topProducts.slice(0, 5), // Return top 5 products
      salesTrend
    });
  } catch (error) {
    console.error('Error getting vendor analytics:', error);
    res.status(500).json({ error: 'Failed to get vendor analytics' });
  }
};

// Add support chat notification handling
const getSupportNotifications = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const prisma = getPrismaClient();
    const notifications = await prisma.notification.findMany({
      where: {
        userId: vendorId,
        type: 'support',
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching support notifications:', error);
    res.status(500).json({ error: 'Failed to fetch support notifications' });
  }
};

const markSupportNotificationsAsRead = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const prisma = getPrismaClient();
    await prisma.notification.updateMany({
      where: {
        userId: vendorId,
        type: 'support',
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({ message: 'Support notifications marked as read' });
  } catch (error) {
    console.error('Error marking support notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark support notifications as read' });
  }
};

// Create vendor product
const createVendorProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      category,
      quantity,
      enableBidding,
      startingBid,
      bidEndDate,
      isTicket
    } = req.body;

    const vendorId = req.user.id;

    const prisma = getPrismaClient();
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image,
        category,
        quantity: parseInt(quantity) || 0,
        vendorId,
        enableBidding: enableBidding || false,
        startingBid: startingBid ? parseFloat(startingBid) : null,
        bidEndDate: bidEndDate ? new Date(bidEndDate) : null,
        isTicket: isTicket || false,
        updatedAt: new Date()
      }
    });

    // Clear relevant caches
    await clearCache('products');
    await clearCache(`vendor_${vendorId}_products`);

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Update vendor product
const updateVendorProduct = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const { name, description, price, quantity, category, enableBidding, startingBid, bidEndDate } = req.body;
    const imageUrl = req.file ? `${req.file.filename}` : product.image;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name || product.name,
        description: description || product.description,
        price: price ? parseFloat(price) : product.price,
        quantity: quantity ? parseInt(quantity) : product.quantity,
        category: category || product.category,
        image: imageUrl,
        enableBidding: enableBidding === 'true',
        startingBid: startingBid ? parseFloat(startingBid) : product.startingBid,
        bidEndDate: bidEndDate ? new Date(bidEndDate) : product.bidEndDate,
        updatedAt: new Date()
      }
    });

    await clearCache('products');
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete vendor product
const deleteVendorProduct = async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.vendorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    // Delete related data first
    await prisma.$transaction([
      // Delete related review reactions first
      prisma.reviewreaction.deleteMany({
        where: {
          review: {
            productId
          }
        }
      }),
      // Delete related reviews
      prisma.review.deleteMany({
        where: { productId }
      }),
      // Delete related ratings
      prisma.rating.deleteMany({
        where: { productId }
      }),
      // Delete related product views
      prisma.productview.deleteMany({
        where: { productId }
      }),
      // Delete related cart items
      prisma.cartitem.deleteMany({
        where: { productId }
      }),
      // Delete related bids
      prisma.bid.deleteMany({
        where: { productId }
      }),
      // Delete related order ratings
      prisma.orderrating.deleteMany({
        where: {
          order: {
            productId
          }
        }
      }),
      // Delete related order tracking
      prisma.ordertracking.deleteMany({
        where: {
          order: {
            productId
          }
        }
      }),
      // Delete related tickets
      prisma.ticket.deleteMany({
        where: { productId }
      }),
      // Delete related ticket details
      prisma.ticketdetails.deleteMany({
        where: { productId }
      }),
      // Delete related customer reports
      prisma.customerreport.deleteMany({
        where: {
          order: {
            productId
          }
        }
      }),
      // Delete related orders
      prisma.order.deleteMany({
        where: { productId }
      }),
      // Finally delete the product
      prisma.product.delete({
        where: { id: productId }
      })
    ]);

    // Clear relevant caches
    await clearCache('products');
    await clearCache(`vendor_${req.user.id}_products`);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Update module.exports to include the new functions
module.exports = {
  getVendorProfile,
  updateVendorProfile,
  updateVendorProfileImage,
  getVendorReviews,
  getDashboardStats,
  getVendorOrders,
  getVendorProducts,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  updateVendorSettings,
  getVendorAnalytics,
  getSupportNotifications,
  markSupportNotificationsAsRead
};