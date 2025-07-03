const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

  // Register new user
const register = async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;

      // Validate required fields
      if (!name || !email || !password || !phone) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          required: ['name', 'email', 'password', 'phone']
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'customer',
          phone,
          updatedAt: new Date(),
          country: 'Ghana',
          emailNotifications: false,
          smsNotifications: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          createdAt: true
        }
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Error in register:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ message: 'Email already registered' });
      }
      res.status(500).json({ message: 'Error registering user' });
    }
};

  // Login user
const login = async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      // Generate token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          role: user.role,
          name: user.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ message: 'Error logging in' });
    }
};

  // Get user profile
const getProfile = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          image: true,
          address: true,
          city: true,
          region: true,
          zipCode: true,
          country: true,
          profileComplete: true,
          createdAt: true,
          updatedAt: true,
          emailNotifications: true,
          smsNotifications: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({ message: 'Error getting profile' });
    }
};

  // Update user profile
const updateProfile = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      const { name, phone } = req.body;

      // First check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          phone
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          image: true,
          address: true,
          city: true,
          region: true,
          zipCode: true,
          country: true,
          profileComplete: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
};

  // Forgot password
const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // In a real application, you would:
      // 1. Generate a password reset token
      // 2. Save it to the database with an expiration
      // 3. Send an email with the reset link

      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      res.status(500).json({ message: 'Error processing request' });
    }
};

  // Reset password
const resetPassword = async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }

      // Simulate token verification for testing
      if (token !== 'valid-reset-token') {
        return res.status(400).json({ message: 'Invalid token' });
      }

      // In a real application, you would:
      // 1. Verify the token
      // 2. Check if it's expired
      // 3. Update the password

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      res.status(500).json({ message: 'Error resetting password' });
    }
};

  // Change password
const changePassword = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      const { currentPassword, newPassword } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error in changePassword:', error);
      res.status(500).json({ message: 'Error changing password' });
    }
};

  // Get user orders
const getUserOrders = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      const orders = await prisma.order.findMany({
        where: { customerId: userId },
        include: {
          product: true,
          tracking: true
        }
      });

      res.json(orders);
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      res.status(500).json({ message: 'Error getting orders' });
    }
};

  // Update notification preferences
const updateNotificationPreferences = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);
      const { emailNotifications, smsNotifications } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          emailNotifications,
          smsNotifications
        },
        select: {
          id: true,
          emailNotifications: true,
          smsNotifications: true
        }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      res.status(500).json({ message: 'Error updating preferences' });
    }
};

  // Delete account
const deleteAccount = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      // Delete user and all related data
      await prisma.$transaction([
        prisma.reviewReaction.deleteMany({
          where: { userId }
        }),
        prisma.review.deleteMany({
          where: { userId }
        }),
        prisma.cartItem.deleteMany({
          where: { userId }
        }),
        prisma.bid.deleteMany({
          where: { userId }
        }),
        prisma.orderRating.deleteMany({
          where: { userId }
        }),
        prisma.orderTracking.deleteMany({
          where: { order: { customerId: userId } }
        }),
        prisma.order.deleteMany({
          where: { customerId: userId }
        }),
        prisma.user.delete({
          where: { id: userId }
        })
      ]);

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      res.status(500).json({ message: 'Error deleting account' });
    }
};

  // Deactivate account
const deactivateAccount = async (req, res) => {
    try {
      const userId = parseInt(req.user.id);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false
        },
        select: {
          id: true,
          isActive: true
        }
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error in deactivateAccount:', error);
      res.status(500).json({ message: 'Error deactivating account' });
    }
};

  // Get user by ID
const getUserById = async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          image: true,
          country: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error in getUserById:', error);
      res.status(500).json({ message: 'Error getting user details' });
    }
};

// Search users
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
        phone: true,
        image: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// Get user profile by ID
const getUserProfile = async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        address: true,
        city: true,
        region: true,
        zipCode: true,
        country: true,
        profileComplete: true,
        createdAt: true,
        updatedAt: true,
        emailNotifications: true,
        smsNotifications: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        emailVerified: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

// Update current user
const updateCurrentUser = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating current user:', error);
    res.status(500).json({ error: 'Failed to update current user' });
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { read: true }
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Get user reviews
const getUserReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Error getting user reviews:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email, role, phone },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  getUserOrders,
  updateNotificationPreferences,
  deleteAccount,
  deactivateAccount,
  getUserById,
  searchUsers,
  getUserProfile,
  getCurrentUser,
  updateCurrentUser,
  getUserNotifications,
  markNotificationAsRead,
  getUserReviews,
  updateUser,
  deleteUser
};
