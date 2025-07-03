const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();
const { createNotification } = require('../utils/notification');
const { clearCache } = require('../middlewares/cache');

// Create a new review
const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!productId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already has a review for this product
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    if (existingReview) {
      // Update the existing review instead of creating a new one
      const updatedReview = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: Number(rating),
          comment
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });

      return res.status(200).json(updatedReview);
    }

    const review = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment,
        userId,
        productId: Number(productId),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Create notification for the vendor
    await createNotification({
      userId: product.vendorId,
      type: 'review',
      message: `New ${rating}-star review received for ${product.name}`,
      data: {
        reviewId: review.id,
        productId: Number(productId),
        rating,
        comment
      },
      role: 'vendor'
    });

    // Update product average rating
    const productReviews = await prisma.review.findMany({
      where: {
        productId: Number(productId)
      }
    });

    const averageRating = productReviews.reduce((acc, review) => acc + review.rating, 0) / productReviews.length;

    await prisma.product.update({
      where: {
        id: productId
      },
      data: {
        averageRating: averageRating,
        updatedAt: new Date()
      }
    });

    // Clear relevant caches
    clearCache(`/api/reviews/product/${productId}`);
    clearCache(`/api/products/${productId}`);

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this review' });
    }

    const updatedReview = await prisma.review.update({
      where: { id: Number(id) },
      data: {
        rating: Number(rating),
        comment
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Update product average rating
    const productReviews = await prisma.review.findMany({
      where: {
        productId: review.productId
      }
    });

    const averageRating = productReviews.reduce((acc, review) => acc + review.rating, 0) / productReviews.length;

    await prisma.product.update({
      where: { id: review.productId },
      data: { average_rating: averageRating }
    });

    // Clear relevant caches
    clearCache(`/api/reviews/product/${review.productId}`);
    clearCache(`/api/products/${review.productId}`);

    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
};

// Get all reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await prisma.review.findMany({
      where: {
        productId: Number(productId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        reviewreaction: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.review.count({
      where: {
        productId: Number(productId)
      }
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getProductReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product reviews',
      error: error.message
    });
  }
};

// Get all reviews for a vendor
const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await prisma.review.findMany({
      where: {
        product: {
          vendorId: Number(vendorId)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        reviewreaction: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.review.count({
      where: {
        product: {
          vendorId: Number(vendorId)
        }
      }
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getVendorReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor reviews',
      error: error.message
    });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    // Delete related review reactions first
    await prisma.reviewreaction.deleteMany({
      where: { reviewId: Number(id) }
    });

    // Then delete the review
    await prisma.review.update({
      where: { id: Number(id) },
      data: { is_deleted: true }
    });

    // Update product average rating
    const productReviews = await prisma.review.findMany({
      where: {
        productId: review.productId
      }
    });

    const averageRating = productReviews.length > 0
      ? productReviews.reduce((acc, review) => acc + review.rating, 0) / productReviews.length
      : 0;

    await prisma.product.update({
      where: { id: review.productId },
      data: { average_rating: averageRating }
    });

    // Clear relevant caches
    clearCache(`/api/reviews/product/${review.productId}`);
    clearCache(`/api/products/${review.productId}`);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// Report a review
const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.userId === userId) {
      return res.status(400).json({ error: 'Cannot report your own review' });
    }

    // Check if user has already reported this review
    const existingReport = await prisma.reviewReport.findFirst({
      where: {
        review_id: Number(id),
        user_id: userId
      }
    });

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this review' });
    }

    await prisma.reviewReport.create({
      data: {
        review_id: Number(id),
        user_id: userId,
        reason
      }
    });

    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ error: 'Failed to report review' });
  }
};

// Get user's reviews
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await prisma.review.findMany({
      where: {
        user_id: userId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        },
        reactions: {
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
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.review.count({
      where: {
        user_id: userId
      }
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getUserReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user reviews',
      error: error.message
    });
  }
};

// React to review
const reactToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body;
    const userId = req.user.id;

    if (!reaction || !['like', 'dislike'].includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user already reacted to this review
    const existingReaction = await prisma.reviewReaction.findFirst({
      where: {
        reviewId: Number(id),
        userId
      }
    });

    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        // Remove reaction if clicking the same reaction type
        await prisma.reviewReaction.delete({
          where: { id: existingReaction.id }
        });
        return res.json({ message: 'Reaction removed' });
      } else {
        // Update reaction if changing reaction type
        await prisma.reviewReaction.update({
          where: { id: existingReaction.id },
          data: { reaction }
        });
        return res.json({ message: 'Reaction updated' });
      }
    }

    // Create new reaction
    await prisma.reviewReaction.create({
      data: {
        reviewId: Number(id),
        userId,
        reaction
      }
    });

    res.json({ message: 'Reaction added' });
  } catch (error) {
    console.error('Error reacting to review:', error);
    res.status(500).json({ error: 'Failed to react to review' });
  }
};

// Get reactions for a review
const getReviewReactions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const reactions = await prisma.reviewreaction.findMany({
      where: {
        reviewId: Number(id)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const likeCount = reactions.filter(r => r.type === 'like').length;
    const dislikeCount = reactions.filter(r => r.type === 'dislike').length;
    const userReaction = reactions.find(r => r.userId === userId);

    res.json({
      likeCount,
      dislikeCount,
      userReaction: userReaction ? userReaction.type : null,
      reactions
    });
  } catch (error) {
    console.error('Error fetching review reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
};

// Get all reported reviews
const getReportedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reportedReviews = await prisma.reviewReport.findMany({
      include: {
        review: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                profile_image: true
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        },
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

    const total = await prisma.reviewReport.count();

    res.json({
      success: true,
      data: reportedReviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getReportedReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reported reviews',
      error: error.message
    });
  }
};

module.exports = {
  createReview,
  updateReview,
  getProductReviews,
  getVendorReviews,
  deleteReview,
  reportReview,
  getUserReviews,
  reactToReview,
  getReviewReactions,
  getReportedReviews
}; 