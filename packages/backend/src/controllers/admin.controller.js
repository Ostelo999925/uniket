const { product_status } = require('@prisma/client');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const BANNED_WORDS = ["nude", "sex", "gun", "weapon", "drug", "porn"];
const bcrypt = require('bcryptjs');

// Predefined rejection reasons
const REJECTION_REASONS = [
  "Inappropriate content",
  "Poor quality images",
  "Incomplete product description",
  "Suspicious pricing",
  "Duplicate product",
  "Violates marketplace policies",
  "Incorrect category",
  "Other"
];

// Check for prohibited content
const containsBannedContent = (text) => {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some(word => lowerText.includes(word));
};

// Get dashboard statistics
const getStats = async (req, res) => {
  try {
    const [
      totalProducts,
      pendingProducts,
      totalVendors,
      totalOrders,
      totalUsers
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: product_status.PENDING } }),
      prisma.user.count({ where: { role: 'vendor' } }),
      prisma.order.count(),
      prisma.user.count()
    ]);

    res.json({
      totalProducts,
      pendingProducts,
      totalVendors,
      totalOrders,
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get all products with their status
const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Categorize products by status
    const categorizedProducts = {
      pending: products.filter(p => p.status === product_status.PENDING),
      approved: products.filter(p => p.status === product_status.APPROVED),
      rejected: products.filter(p => p.status === product_status.REJECTED)
    };

    res.json(categorizedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get pending products
const getPendingProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: product_status.PENDING },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({ error: 'Failed to fetch pending products' });
  }
};

// Get admin notifications
const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        role: 'admin',
        type: {
          in: ['FLAGGED_PRODUCT', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'FRAUD_ALERT']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Get rejection reasons
const getRejectionReasons = async (req, res) => {
  try {
    const reasons = [
      'Inappropriate content',
      'Poor quality images',
      'Inaccurate description',
      'Pricing issues',
      'Duplicate product',
      'Violates terms of service',
      'Suspicious activity',
      'Other'
    ];

    res.json(reasons);
  } catch (error) {
    console.error('Error fetching rejection reasons:', error);
    res.status(500).json({ error: 'Failed to fetch rejection reasons' });
  }
};

// Approve product
const approveProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { 
        status: product_status.APPROVED,
        isFlagged: false,
        flaggedReason: null,
        approvedAt: new Date(),
        approvedBy: req.user.id
      }
    });

    // Create notification for vendor
    await prisma.notification.create({
      data: {
        message: `Your product "${product.name}" has been approved and is now visible to customers.`,
        type: 'PRODUCT_APPROVED',
        userId: product.vendorId,
        data: JSON.stringify({ productId: product.id })
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Error approving product:', error);
    res.status(500).json({ error: 'Failed to approve product' });
  }
};

// Reject product
const rejectProduct = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!REJECTION_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid rejection reason' });
  }

  try {
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { 
        status: product_status.REJECTED,
        isFlagged: true,
        flaggedReason: reason
      }
    });

    // Create notification for vendor
    await prisma.notification.create({
      data: {
        message: `Your product "${product.name}" has been rejected. Reason: ${reason}`,
        type: 'PRODUCT_REJECTED',
        userId: product.vendorId,
        data: JSON.stringify({ 
          productId: product.id,
          reason: reason
        })
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Error rejecting product:', error);
    res.status(500).json({ error: 'Failed to reject product' });
  }
};

// Get flagged products
const getFlaggedProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { 
        isFlagged: true,
        status: product_status.PENDING
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching flagged products:', error);
    res.status(500).json({ error: 'Failed to fetch flagged products' });
  }
};

// Get all vendors
const getAllVendors = async (req, res) => {
  try {
    const vendors = await prisma.user.findMany({
      where: { role: 'vendor' },
      include: {
        product: true
      }
    });
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
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
            price: true
          }
        }
      }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get all pickup points
const getAllPickupPoints = async (req, res) => {
  try {
    const pickupPoints = await prisma.pickuppoint.findMany({
      orderBy: {
        region: 'asc'
      }
    });
    res.json(pickupPoints);
  } catch (error) {
    console.error('Error fetching pickup points:', error);
    res.status(500).json({ error: 'Failed to fetch pickup points' });
  }
};

// Add new pickup point
const addPickupPoint = async (req, res) => {
  const { region, school, location, phone } = req.body;
  try {
    // Generate a name from the region, school, and location
    const name = `${region} - ${school} - ${location}`;
    
    const pickupPoint = await prisma.pickupPoint.create({
      data: {
        name,
        region,
        school,
        location,
        phone,
        isActive: true
      }
    });
    res.status(201).json(pickupPoint);
  } catch (error) {
    console.error('Error adding pickup point:', error);
    res.status(500).json({ error: 'Failed to add pickup point' });
  }
};

// Update pickup point
const updatePickupPoint = async (req, res) => {
  const { id } = req.params;
  const { name, region, school, location, phone, isActive } = req.body;
  try {
    const pickupPoint = await prisma.pickupPoint.update({
      where: { id: Number(id) },
      data: {
        name,
        region,
        school,
        location,
        phone,
        isActive
      }
    });
    res.json(pickupPoint);
  } catch (error) {
    console.error('Error updating pickup point:', error);
    res.status(500).json({ error: 'Failed to update pickup point' });
  }
};

// Delete pickup point
const deletePickupPoint = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.pickupPoint.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Pickup point deleted successfully' });
  } catch (error) {
    console.error('Error deleting pickup point:', error);
    res.status(500).json({ error: 'Failed to delete pickup point' });
  }
};

const getVendorStats = async (req, res) => {
  try {
    const vendorId = Number(req.params.vendorId);
    if (isNaN(vendorId)) {
      return res.status(400).json({ error: 'Invalid vendor ID' });
    }

    // Fetch vendor's products
    const products = await prisma.product.findMany({
      where: { vendorId },
      select: { 
        id: true, 
        name: true, 
        image: true, 
        price: true, 
        status: true, 
        views: true,
        createdAt: true
      }
    });

    // Fetch all completed orders for these products
    const orders = await prisma.order.findMany({
      where: { 
        productId: { in: products.map(p => p.id) },
        status: 'completed'
      },
      select: { 
        id: true, 
        productId: true, 
        quantity: true, 
        total: true, 
        status: true,
        createdAt: true
      }
    });

    // Fetch all reviews for these products
    const reviews = await prisma.review.findMany({
      where: { productId: { in: products.map(p => p.id) } },
      select: { rating: true, productId: true }
    });

    // Calculate total products
    const totalProducts = products.length;
    
    // Calculate total sales and revenue
    const totalSales = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calculate total views
    const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
    
    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
      : 0;
    
    // Calculate satisfaction rate (percentage of ratings >= 4)
    const satisfactionRate = reviews.length > 0 
      ? ((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100).toFixed(1) 
      : 0;
    
    // Calculate conversion rate
    const conversionRate = totalViews > 0 
      ? ((totalSales / totalViews) * 100).toFixed(1) 
      : 0;

    // Top products by revenue
    const productSalesMap = {};
    products.forEach(p => { 
      productSalesMap[p.id] = { 
        ...p, 
        sales: 0, 
        revenue: 0, 
        ratingSum: 0, 
        ratingCount: 0 
      }; 
    });

    orders.forEach(order => {
      if (productSalesMap[order.productId]) {
        productSalesMap[order.productId].sales += order.quantity || 0;
        productSalesMap[order.productId].revenue += order.total || 0;
      }
    });

    reviews.forEach(review => {
      if (productSalesMap[review.productId]) {
        productSalesMap[review.productId].ratingSum += review.rating;
        productSalesMap[review.productId].ratingCount += 1;
      }
    });

    const topProducts = Object.values(productSalesMap)
      .map(p => ({
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        views: p.views || 0,
        sales: p.sales,
        revenue: p.revenue,
        rating: p.ratingCount > 0 ? p.ratingSum / p.ratingCount : 0,
        status: p.status
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent orders (last 5)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        productName: products.find(p => p.id === order.productId)?.name || 'Unknown Product',
        amount: order.total || 0,
        date: order.createdAt
      }));

    // Sales over time (last 12 months)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        sales: 0,
        revenue: 0
      });
    }

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = months.find(m => m.key === key);
      if (month) {
        month.sales += order.quantity || 0;
        month.revenue += order.total || 0;
      }
    });

    const salesOverTime = months.map(m => ({ 
      date: m.label, 
      sales: m.sales, 
      revenue: m.revenue 
    }));

    res.json({
      totalProducts,
      totalSales,
      totalRevenue,
      conversionRate,
      averageRating,
      topProducts,
      recentOrders,
      satisfactionRate,
      salesOverTime
    });
  } catch (error) {
    console.error('Error getting vendor stats:', error);
    res.status(500).json({ error: 'Failed to get vendor statistics' });
  }
};

// User management functions
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            orders: true,
            reviews: true
          }
        }
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true
          }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        email: email || undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete user's related data
    await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: { order: { userId: parseInt(id) } }
      }),
      prisma.order.deleteMany({
        where: { userId: parseInt(id) }
      }),
      prisma.review.deleteMany({
        where: { userId: parseInt(id) }
      }),
      prisma.user.delete({
        where: { id: parseInt(id) }
      })
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Product management functions
const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviews: {
          include: {
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

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, category, status } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        price: price ? parseFloat(price) : undefined,
        description: description || undefined,
        category: category || undefined,
        status: status || undefined
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete product's related data
    await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: { productId: parseInt(id) }
      }),
      prisma.review.deleteMany({
        where: { productId: parseInt(id) }
      }),
      prisma.product.delete({
        where: { id: parseInt(id) }
      })
    ]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Order management functions
const searchOrders = async (req, res) => {
  try {
    const { query } = req.query;
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { id: { equals: parseInt(query) || 0 } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } }
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ error: 'Failed to search orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        status: status || undefined,
        trackingNumber: trackingNumber || undefined
      }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

// Review management functions
const getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
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
            price: true
          }
        }
      }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

const searchReviews = async (req, res) => {
  try {
    const { query } = req.query;
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { comment: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { product: { name: { contains: query, mode: 'insensitive' } } }
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
            price: true
          }
        }
      }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Error searching reviews:', error);
    res.status(500).json({ error: 'Failed to search reviews' });
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) },
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
            image: true
          }
        }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, isVisible } = req.body;

    const updatedReview = await prisma.review.update({
      where: { id: parseInt(id) },
      data: {
        rating: rating ? parseInt(rating) : undefined,
        comment: comment || undefined,
        isVisible: isVisible !== undefined ? isVisible : undefined
      }
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.review.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// Report management functions
const getAllReports = async (req, res) => {
  try {
    const reports = await prisma.productReport.findMany({
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
            price: true
          }
        }
      }
    });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

const searchReports = async (req, res) => {
  try {
    const { query } = req.query;
    const reports = await prisma.productReport.findMany({
      where: {
        OR: [
          { reason: { contains: query, mode: 'insensitive' } },
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { product: { name: { contains: query, mode: 'insensitive' } } }
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
            price: true,
            image: true
          }
        }
      }
    });
    res.json(reports);
  } catch (error) {
    console.error('Error searching reports:', error);
    res.status(500).json({ error: 'Failed to search reports' });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.productReport.findUnique({
      where: { id: parseInt(id) },
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
            image: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    // First check if the report exists
    const existingReport = await prisma.customerreport.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updatedReport = await prisma.customerreport.update({
      where: { id: parseInt(id) },
      data: {
        status: status || undefined,
        adminResponse: adminResponse || undefined
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

// Settings management functions
const getSettings = async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    res.json(settings || {});
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { commissionRate, minWithdrawal, maxWithdrawal } = req.body;

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
        minWithdrawal: minWithdrawal ? parseFloat(minWithdrawal) : undefined,
        maxWithdrawal: maxWithdrawal ? parseFloat(maxWithdrawal) : undefined
      },
      create: {
        id: 1,
        commissionRate: parseFloat(commissionRate),
        minWithdrawal: parseFloat(minWithdrawal),
        maxWithdrawal: parseFloat(maxWithdrawal)
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Vendor management functions
const updateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name, email, isActive, commissionRate } = req.body;

    // Check if vendor exists
    const existingVendor = await prisma.user.findUnique({
      where: { 
        id: parseInt(vendorId),
        role: 'vendor'
      }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Validate commission rate if provided
    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 100)) {
      return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
    }

    // Update vendor
    const updatedVendor = await prisma.user.update({
      where: { id: parseInt(vendorId) },
      data: {
        name: name || undefined,
        email: email || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        vendorProfile: commissionRate !== undefined ? {
          update: {
            commissionRate
          }
        } : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        vendorProfile: {
          select: {
            commissionRate: true,
            totalSales: true,
            totalEarnings: true
          }
        }
      }
    });

    await clearCache('vendors');
    res.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update vendor' });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Check if vendor exists
    const vendor = await prisma.user.findUnique({
      where: { 
        id: parseInt(vendorId),
        role: 'vendor'
      }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Delete vendor's products, orders, and other related data
    await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: { product: { vendorId: parseInt(vendorId) } }
      }),
      prisma.bid.deleteMany({
        where: { product: { vendorId: parseInt(vendorId) } }
      }),
      prisma.productImage.deleteMany({
        where: { product: { vendorId: parseInt(vendorId) } }
      }),
      prisma.product.deleteMany({
        where: { vendorId: parseInt(vendorId) }
      }),
      prisma.vendorProfile.delete({
        where: { userId: parseInt(vendorId) }
      }),
      prisma.user.delete({
        where: { id: parseInt(vendorId) }
      })
    ]);

    await clearCache('vendors');
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
};

const getVendorLeaderboard = async (req, res) => {
  try {
    const { category } = req.query;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get all vendors with their products and orders
    const vendors = await prisma.user.findMany({
      where: { role: 'vendor' },
      include: {
        product: {
          include: {
            order: {
              where: {
                createdAt: { gte: thirtyDaysAgo },
                status: 'completed'
              }
            },
            review: true
          }
        }
      }
    });

    // Calculate metrics for each vendor
    const vendorMetrics = vendors.map(vendor => {
      const totalSales = vendor.product.reduce((sum, product) => 
        sum + product.order.reduce((orderSum, order) => orderSum + (order.total || 0), 0), 0);
      
      const totalOrders = vendor.product.reduce((sum, product) => 
        sum + product.order.length, 0);
      
      const totalProducts = vendor.product.length;
      
      const totalReviews = vendor.product.reduce((sum, product) => 
        sum + product.review.length, 0);
      
      const averageRating = vendor.product.reduce((sum, product) => 
        sum + product.review.reduce((reviewSum, review) => reviewSum + review.rating, 0), 0) / 
        (totalReviews || 1);

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        totalSales,
        totalOrders,
        totalProducts,
        totalReviews,
        averageRating: parseFloat(averageRating.toFixed(1))
      };
    });

    // Sort based on category
    let sortedVendors;
    switch (category) {
      case 'topSellers':
        sortedVendors = vendorMetrics.sort((a, b) => b.totalSales - a.totalSales);
        break;
      case 'mostOrders':
        sortedVendors = vendorMetrics.sort((a, b) => b.totalOrders - a.totalOrders);
        break;
      case 'mostProducts':
        sortedVendors = vendorMetrics.sort((a, b) => b.totalProducts - a.totalProducts);
        break;
      case 'bestRated':
        sortedVendors = vendorMetrics.sort((a, b) => b.averageRating - a.averageRating);
        break;
      default:
        sortedVendors = vendorMetrics.sort((a, b) => b.totalSales - a.totalSales);
    }

    // Return top 10 vendors
    res.json(sortedVendors.slice(0, 10));
  } catch (error) {
    console.error('Error getting vendor leaderboard:', error);
    res.status(500).json({ error: 'Failed to get vendor leaderboard' });
  }
};

// Pickup Manager Management
const getAllPickupManagers = async (req, res) => {
  try {
    const managers = await prisma.user.findMany({
      where: { role: 'pickup_manager' },
      include: { managedPickupPoints: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching pickup managers:', error);
    res.status(500).json({ error: 'Failed to fetch pickup managers' });
  }
};

const createPickupManager = async (req, res) => {
  const { name, email, password, phone, pickupPointId } = req.body;
  if (!name || !email || !password || !phone || !pickupPointId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user
    const manager = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'pickup_manager',
        updatedAt: new Date()
      }
    });
    // Assign the manager to the pickup point
    await prisma.pickuppoint.update({
      where: { id: Number(pickupPointId) },
      data: { managerId: manager.id }
    });
    // Optionally, return the manager with their assigned pickup point
    const managerWithPickupPoints = await prisma.user.findUnique({
      where: { id: manager.id },
      include: { managedPickupPoints: true }
    });
    res.status(201).json(managerWithPickupPoints);
  } catch (error) {
    console.error('Error creating pickup manager:', error);
    res.status(500).json({ error: 'Failed to create pickup manager' });
  }
};

const updatePickupManager = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  try {
    const manager = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined
      },
      include: { pickuppoint: true }
    });
    res.json(manager);
  } catch (error) {
    console.error('Error updating pickup manager:', error);
    res.status(500).json({ error: 'Failed to update pickup manager' });
  }
};

const deactivatePickupManager = async (req, res) => {
  const { id } = req.params;
  try {
    const manager = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });
    res.json(manager);
  } catch (error) {
    console.error('Error deactivating pickup manager:', error);
    res.status(500).json({ error: 'Failed to deactivate pickup manager' });
  }
};

module.exports = {
  getStats,
  getAllProducts,
  getPendingProducts,
  getRejectionReasons,
  approveProduct,
  rejectProduct,
  getFlaggedProducts,
  getAllUsers,
  searchUsers,
  getUserById,
  updateUser,
  deleteUser,
  searchProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllOrders,
  searchOrders,
  getOrderById,
  updateOrder,
  getAllReviews,
  searchReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getAllReports,
  searchReports,
  getReportById,
  updateReport,
  getSettings,
  updateSettings,
  getAllVendors,
  getVendorStats,
  updateVendor,
  deleteVendor,
  getAllPickupPoints,
  addPickupPoint,
  updatePickupPoint,
  deletePickupPoint,
  getAdminNotifications,
  getVendorLeaderboard,
  getAllPickupManagers,
  createPickupManager,
  updatePickupManager,
  deactivatePickupManager
};