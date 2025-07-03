const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { ProductStatus, product_status, Prisma } = require('@prisma/client');

// List of banned words
const bannedWords = ['banned', 'inappropriate', 'offensive', 'nude', 'sex', 'gun', 'weapon', 'drug', 'porn']; // Add your banned words here

// Function to check for banned words
const containsBannedWords = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return bannedWords.some(word => lowerText.includes(word.toLowerCase()));
};

// ✅ Create Product
const createProduct = async (req, res) => {
  const { name, category, price, description, quantity, enableBidding, startingBid, bidEndDate } = req.body;
  const imageFile = req.file;

  if (!name || !category || !price || !imageFile) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const image = imageFile.filename;

  try {
    // Check for inappropriate content
    const isInappropriate = containsBannedWords(name) || containsBannedWords(description);
    
    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        description,
        image,
        status: ProductStatus.PENDING,
        isFlagged: isInappropriate,
        flaggedReason: isInappropriate ? 'Contains inappropriate content' : null,
        vendorId: req.user.id,
        enableBidding: enableBidding === 'true',
        startingBid: enableBidding === 'true' ? parseFloat(startingBid) : null,
        bidEndDate: enableBidding === 'true' ? new Date(bidEndDate) : null,
      },
    });

    // Create notification for admin if product is flagged
    if (isInappropriate) {
      await prisma.notification.create({
        data: {
          message: `New flagged product "${name}" requires review`,
          type: 'FLAGGED_PRODUCT',
          userId: 1, // Assuming 1 is the admin ID
          data: JSON.stringify({ productId: product.id })
        }
      });
    }

    res.status(201).json({ 
      message: "Product created", 
      product,
      isFlagged: isInappropriate 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product", details: err.message });
  }
};


// ✅ Get Vendor Products
// Get products by vendor
const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user.id; // user info from JWT

    const products = await prisma.product.findMany({
      where: { vendorId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        bids: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            amount: 'desc'
          },
          take: 1
        }
      }
    });

    // Add stock status to each product
    const productsWithStockStatus = products.map(product => {
      let stockStatus = 'IN_STOCK';
      if (product.quantity <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (product.quantity <= 5) {
        stockStatus = 'LOW_STOCK';
      }

      // Format bid details
      const formattedProduct = {
        ...product,
        stockStatus,
        startingBid: product.startingBid ? Number(product.startingBid) : null,
        bidEndDate: product.bidEndDate ? new Date(product.bidEndDate).toISOString() : null,
        currentBid: product.bids[0] ? Number(product.bids[0].amount) : null
      };

      return formattedProduct;
    });

    res.json(productsWithStockStatus);
  } catch (error) {
    console.error("Error fetching vendor products:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// ✅ Update Product
// Update a product
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const vendorId = req.user.id;
  const { name, price, category, description, quantity, enableBidding, startingBid, bidEndDate } = req.body;

  try {
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.vendorId !== vendorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Not authorized to update this product" });
    }

    // Check for inappropriate content
    const isInappropriate = containsBannedWords(name) || containsBannedWords(description);

    // Prepare update data
    const updateData = {
      name: name || undefined,
      description: description || undefined,
      price: price ? parseFloat(price) : undefined,
      quantity: quantity ? parseInt(quantity) : undefined,
      category: category || undefined,
      enableBidding: enableBidding === 'true',
      status: isInappropriate ? ProductStatus.PENDING : product.status,
      isFlagged: isInappropriate,
      flaggedReason: isInappropriate ? 'Contains inappropriate content' : null,
      updatedAt: new Date()
    };

    // Add bidding fields if enabled
    if (enableBidding === 'true') {
      if (!startingBid || !bidEndDate) {
        return res.status(400).json({ error: "Starting bid and bid end date are required when enabling bidding" });
      }

      const parsedDate = new Date(bidEndDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid bid end date format" });
      }

      // Ensure the date is in the future
      if (parsedDate <= new Date()) {
        return res.status(400).json({ error: "Bid end date must be in the future" });
      }

      updateData.startingBid = parseFloat(startingBid);
      updateData.bidEndDate = parsedDate;
    }

    // Add image if a new one was uploaded
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create notification for admin if product is flagged
    if (isInappropriate) {
      await prisma.notification.create({
        data: {
          message: `Updated product "${name}" has been flagged and requires review`,
          type: 'FLAGGED_PRODUCT',
          userId: 1, // Assuming 1 is the admin ID
          data: JSON.stringify({ productId: updated.id })
        }
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};



// ✅ Delete Product
// Delete a product
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const vendorId = req.user.id;

  try {
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });

    if (!product || product.vendorId !== vendorId) {
      return res.status(403).json({ error: "Unauthorized or product not found" });
    }

    await prisma.product.delete({ where: { id: Number(id) } });

    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get stats for a vendor

const getVendorStats = async (req, res) => {
  const vendorId = req.user.id;

  try {
    const totalProducts = await prisma.product.count({
      where: { vendorId },
    });

    res.json({ totalProducts });
  } catch (err) {
    console.error("Error fetching vendor stats:", err);
    res.status(500).json({ message: "Failed to get vendor stats" });
  }
};

// Get all products (for customers)
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: {
            not: 'REJECTED'
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },
          review: {
            select: {
              rating: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.product.count({
        where: {
          status: {
            not: 'REJECTED'
          }
        }
      })
    ]);

    // Add stock status and calculate average rating for each product
    const updatedProducts = products.map(product => {
      let stockStatus = 'IN_STOCK';
      if (product.quantity <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (product.quantity <= 5) {
        stockStatus = 'LOW_STOCK';
      }

      // Calculate average rating
      const avgRating = product.review.length > 0
        ? product.review.reduce((sum, review) => sum + review.rating, 0) / product.review.length
        : 0;

      return {
        ...product,
        stockStatus,
        rating: avgRating,
        ratingCount: product.review.length,
        vendor: product.user // Map user to vendor for frontend compatibility
      };
    });

    console.log('getAllProducts count:', updatedProducts.length);
    res.json({
      products: updatedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    res.status(500).json({ message: "Failed to fetch products", error: error.message });
  }
};

// Track product view
const trackProductView = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?.id; // Get user ID from authenticated request

  try {
    // Only track views for authenticated users
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to track views' });
    }

    // Check if user has already viewed this product
    const existingView = await prisma.productView.findUnique({
      where: {
        productId_userId: {
          productId: Number(productId),
          userId: userId
        }
      }
    });

    if (!existingView) {
      // Create new view record
      await prisma.productView.create({
        data: {
          productId: Number(productId),
          userId: userId
        }
      });

      // Increment the views count for the product
      const updatedProduct = await prisma.product.update({
        where: { id: Number(productId) },
        data: {
          views: {
            increment: 1
          }
        }
      });

      res.json({ success: true, views: updatedProduct.views });
    } else {
      // User has already viewed this product, just return current view count
      const product = await prisma.product.findUnique({
        where: { id: Number(productId) }
      });
      res.json({ success: true, views: product.views });
    }
  } catch (error) {
    console.error('Error tracking product view:', error);
    res.status(500).json({ error: 'Failed to track product view' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching product with ID:', id); // Debug log

    // Parse the id as an integer
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        review: {
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

    // Map user to vendor for frontend compatibility
    const productWithVendor = {
      ...product,
      vendor: product.user
    };

    res.json(productWithVendor);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Get AI-powered product recommendations
const getAIRecommendations = async (req, res) => {
  try {
    const query = req.query.query;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    // Validate query parameter
    if (!query) {
      return res.status(400).json({ error: 'Search query parameter is required' });
    }

    // Sanitize query - remove special characters and trim
    const sanitizedQuery = query.trim().replace(/[^\w\s]/gi, '');

    // Ensure sanitized query is not empty
    if (sanitizedQuery.length === 0) {
      return res.status(400).json({ error: 'Search query cannot be empty or contain only special characters' });
    }

    // Get user's purchase history and preferences if userId is provided
    let userPreferences = {};
    if (userId) {
      const userOrders = await prisma.order.findMany({
        where: { customerId: userId },
        include: {
          product: {
            select: {
              category: true,
              price: true
            }
          }
        }
      });

      // Calculate user preferences
      const categories = {};
      const priceRanges = [];
      userOrders.forEach(order => {
        if (order.product) {  // Add null check for product
          // Track category preferences
          categories[order.product.category] = (categories[order.product.category] || 0) + 1;
          // Track price range preferences
          priceRanges.push(order.product.price);
        }
      });

      userPreferences = {
        favoriteCategories: Object.entries(categories)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category),
        averagePrice: priceRanges.length > 0 
          ? priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length 
          : null
      };
    }

    // Get all products that match the search query
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: sanitizedQuery } },
          { description: { contains: sanitizedQuery } },
          { category: { contains: sanitizedQuery } }
        ],
        status: 'APPROVED',
        quantity: { gt: 0 }  // Only show products in stock
      },
      include: {
        review: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        order: true,
        user: {
          select: {
            id: true,
            name: true,
            product: {
              include: {
                review: true
              }
            }
          }
        },
        productview: true
      },
      take: 20  // Limit results to prevent performance issues
    });

    // If no products found, return empty array
    if (!products.length) {
      return res.json([]);
    }

    // Calculate performance metrics for each product
    const productsWithMetrics = products.map(product => {
      // Calculate average rating
      const avgRating = product.review.length > 0
        ? product.review.reduce((sum, review) => sum + review.rating, 0) / product.review.length
        : 0;

      // Calculate total sales
      const totalSales = product.order.reduce((sum, order) => sum + order.quantity, 0);

      // Calculate conversion rate (orders / views)
      const conversionRate = product.productview.length > 0 ? (totalSales / product.productview.length) * 100 : 0;

      // Calculate vendor's average rating across all their products
      const vendorProducts = product.user.product;
      const vendorReviews = vendorProducts.flatMap(p => p.review);
      const vendorScore = vendorReviews.length > 0
        ? vendorReviews.reduce((sum, review) => sum + review.rating, 0) / vendorReviews.length
        : 0;

      // Calculate popularity score based on views and sales
      const popularityScore = Math.min(
        ((product.productview.length * 0.3 + totalSales * 0.7) / 100) * 100,
        100
      );

      // Calculate relevance score based on user preferences
      let relevanceScore = 0;
      if (userId && userPreferences.favoriteCategories) {
        // Category match bonus
        if (userPreferences.favoriteCategories.includes(product.category)) {
          relevanceScore += 30;
        }
        // Price range match bonus
        if (userPreferences.averagePrice) {
          const priceDiff = Math.abs(product.price - userPreferences.averagePrice);
          const priceMatchScore = Math.max(0, 20 - (priceDiff / userPreferences.averagePrice) * 20);
          relevanceScore += priceMatchScore;
        }
      }

      // Calculate overall performance score
      const performanceScore = Math.min(
        (avgRating * 0.3 + conversionRate * 0.2 + vendorScore * 0.2 + popularityScore * 0.2 + relevanceScore * 0.1) * 2,
        100
      );

      // Determine if product is top rated
      const isTopRated = avgRating >= 4.5 && totalSales > 10;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
        rating: avgRating,
        performanceScore: Math.round(performanceScore),
        isTopRated,
        totalSales,
        conversionRate: Math.round(conversionRate),
        vendorName: product.user.name,
        vendorRating: Math.round(vendorScore * 10) / 10, // Round to 1 decimal place
        popularityScore: Math.round(popularityScore),
        relevanceScore: Math.round(relevanceScore),
        discount: product.discount || 0
      };
    });

    // Sort products by performance score and rating
    const sortedProducts = productsWithMetrics.sort((a, b) => {
      // First sort by top rated status
      if (a.isTopRated && !b.isTopRated) return -1;
      if (!a.isTopRated && b.isTopRated) return 1;

      // Then sort by performance score
      if (a.performanceScore !== b.performanceScore) {
        return b.performanceScore - a.performanceScore;
      }

      // Then sort by relevance score if user is logged in
      if (userId && a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Finally sort by rating
      return b.rating - a.rating;
    });

    res.json(sortedProducts);
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ error: 'Failed to get AI recommendations' });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, sortBy } = req.query;
    
    const where = {
      status: {
        not: ProductStatus.REJECTED
      }
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const orderBy = {};
    if (sortBy === 'price_asc') orderBy.price = 'asc';
    else if (sortBy === 'price_desc') orderBy.price = 'desc';
    else if (sortBy === 'newest') orderBy.createdAt = 'desc';
    else if (sortBy === 'popular') orderBy.views = 'desc';
    else orderBy.createdAt = 'desc';

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      }
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        rating: avgRating,
        ratingCount: product.reviews.length
      };
    });

    res.json(productsWithRating);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      select: {
        category: true
      },
      distinct: ['category']
    });

    const uniqueCategories = categories.map(cat => cat.category).filter(Boolean);
    res.json(uniqueCategories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: {
          not: ProductStatus.REJECTED
        },
        isFeatured: true
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      },
      take: 10
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        rating: avgRating,
        ratingCount: product.reviews.length
      };
    });

    res.json(productsWithRating);
  } catch (error) {
    console.error('Error getting featured products:', error);
    res.status(500).json({ error: 'Failed to get featured products' });
  }
};

// Get trending products
const getTrendingProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: {
          not: ProductStatus.REJECTED
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy: {
        views: 'desc'
      },
      take: 10
    });

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        rating: avgRating,
        ratingCount: product.reviews.length
      };
    });

    res.json(productsWithRating);
  } catch (error) {
    console.error('Error getting trending products:', error);
    res.status(500).json({ error: 'Failed to get trending products' });
  }
};

// Get recommendations
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    let products;

    if (userId) {
      // Get user's purchase history
      const userOrders = await prisma.order.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              category: true
            }
          }
        }
      });

      // Get categories from user's purchase history
      const userCategories = [...new Set(userOrders.map(order => order.product.category))];

      // Get products from same categories
      products = await prisma.product.findMany({
        where: {
          status: {
            not: ProductStatus.REJECTED
          },
          category: {
            in: userCategories
          }
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true
            }
          },
          reviews: {
            select: {
              rating: true
            }
          }
        },
        take: 10
      });
    } else {
      // If no user, return popular products
      products = await prisma.product.findMany({
        where: {
          status: {
            not: ProductStatus.REJECTED
          }
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true
            }
          },
          reviews: {
            select: {
              rating: true
            }
          }
        },
        orderBy: {
          views: 'desc'
        },
        take: 10
      });
    }

    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        rating: avgRating,
        ratingCount: product.reviews.length
      };
    });

    res.json(productsWithRating);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

// Rate product
const rateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating value' });
    }

    // Check if user has purchased the product
    const hasPurchased = await prisma.order.findFirst({
      where: {
        userId,
        productId: parseInt(id),
        status: 'DELIVERED'
      }
    });

    if (!hasPurchased) {
      return res.status(403).json({ error: 'You must purchase the product before rating it' });
    }

    // Check if user has already rated this product
    const existingRating = await prisma.review.findFirst({
      where: {
        userId,
        productId: parseInt(id)
      }
    });

    if (existingRating) {
      // Update existing rating
      const updatedRating = await prisma.review.update({
        where: { id: existingRating.id },
        data: {
          rating: parseInt(rating),
          comment: comment || null
        }
      });
      res.json(updatedRating);
    } else {
      // Create new rating
      const newRating = await prisma.review.create({
        data: {
          rating: parseInt(rating),
          comment: comment || null,
          userId,
          productId: parseInt(id)
        }
      });
      res.status(201).json(newRating);
    }
  } catch (error) {
    console.error('Error rating product:', error);
    res.status(500).json({ error: 'Failed to rate product' });
  }
};

// Report product
const reportProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

    // Create report
    const report = await prisma.productReport.create({
      data: {
        reason,
        userId,
        productId: parseInt(id)
      }
    });

    // Update product status to PENDING for review
    await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        status: ProductStatus.PENDING,
        isFlagged: true,
        flaggedReason: reason
      }
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        message: `Product #${id} has been reported and requires review`,
        type: 'REPORTED_PRODUCT',
        userId: 1, // Admin ID
        data: JSON.stringify({ productId: parseInt(id), reportId: report.id })
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error reporting product:', error);
    res.status(500).json({ error: 'Failed to report product' });
  }
};

// Get review reactions
const getReviewReactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reactions = await prisma.reviewReaction.findMany({
      where: {
        review_id: parseInt(id)
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_image: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.reviewReaction.count({
      where: {
        review_id: parseInt(id)
      }
    });

    res.json({
      success: true,
      data: reactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getReviewReactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review reactions',
      error: error.message
    });
  }
};

// Add review reaction
const addReviewReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { type } = req.body;

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user has already reacted to this review
    const existingReaction = await prisma.reviewReaction.findFirst({
      where: {
        review_id: parseInt(id),
        user_id: userId
      }
    });

    if (existingReaction) {
      return res.status(400).json({
        success: false,
        message: 'You have already reacted to this review'
      });
    }

    const reaction = await prisma.reviewReaction.create({
      data: {
        review_id: parseInt(id),
        user_id: userId,
        type
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_image: true
          }
        }
      }
    });

    // Clear relevant caches
    clearCache(`/api/reviews/${id}/reactions`);
    clearCache(`/api/reviews/product/${review.product_id}`);

    res.status(201).json({
      success: true,
      message: 'Reaction added successfully',
      data: reaction
    });
  } catch (error) {
    console.error('Error in addReviewReaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: error.message
    });
  }
};

// Remove review reaction
const removeReviewReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user has reacted to this review
    const existingReaction = await prisma.reviewReaction.findFirst({
      where: {
        review_id: parseInt(id),
        user_id: userId
      }
    });

    if (!existingReaction) {
      return res.status(400).json({
        success: false,
        message: 'You have not reacted to this review'
      });
    }

    await prisma.reviewReaction.delete({
      where: {
        id: existingReaction.id
      }
    });

    // Clear relevant caches
    clearCache(`/api/reviews/${id}/reactions`);
    clearCache(`/api/reviews/product/${review.product_id}`);

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Error in removeReviewReaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  getVendorStats,
  getAllProducts,
  trackProductView,
  getProductById,
  getAIRecommendations,
  searchProducts,
  getCategories,
  getFeaturedProducts,
  getTrendingProducts,
  getRecommendations,
  rateProduct,
  reportProduct,
  getReviewReactions,
  addReviewReaction,
  removeReviewReaction
};
