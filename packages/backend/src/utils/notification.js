const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const rateLimit = require('express-rate-limit');

// Define valid notification types
const VALID_NOTIFICATION_TYPES = [
  'bid',
  'review',
  'order',
  'product',
  'system',
  'FLAGGED_PRODUCT',
  'PRODUCT_APPROVED',
  'PRODUCT_REJECTED',
  'bid_status',
  'NEW_ORDER'
];

// Rate limiter for notifications
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

/**
 * Create a notification for a user
 * @param {Object} params
 * @param {number} params.userId - The ID of the user to notify
 * @param {string} params.type - The type of notification
 * @param {string} params.message - The notification message
 * @param {Object} [params.data] - Additional data to store with the notification
 * @param {string} [params.role='customer'] - The role of the user (customer or vendor)
 */
const createNotification = async ({ userId, type, message, data, role = 'customer' }) => {
  try {
    // Truncate message if too long
    const truncatedMessage = message.slice(0, 1000);

    // Handle data object
    let dataString = null;
    if (data) {
      try {
        // If data is already a string, parse it first
        const dataObj = typeof data === 'string' ? JSON.parse(data) : data;
        // Remove any large fields that might cause issues
        if (dataObj.response) {
          dataObj.response = dataObj.response.slice(0, 500);
        }
        dataString = JSON.stringify(dataObj);
      } catch (error) {
        console.error('Error processing notification data:', error);
        // If there's an error processing the data, store a simplified version
        dataString = JSON.stringify({
          error: 'Data processing failed',
          type: type
        });
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message: truncatedMessage,
        data: dataString,
        role
      }
    });

    // If it's a fraud alert, also create an admin alert
    if (type === 'FRAUD_ALERT') {
      await prisma.adminAlert.create({
        data: {
          type: data.type,
          message,
          data: data ? JSON.stringify(data) : null,
          severity: determineSeverity(data.type),
          status: 'PENDING'
        }
      });
    }
        
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw the error, just log it and return null
    // This way, notification failures won't break the main functionality
    return null;
  }
};

/**
 * Determine the severity of a fraud alert
 * @param {string} type - The type of fraud alert
 * @returns {string} - The severity level
 */
const determineSeverity = (type) => {
  const severityMap = {
    'SUSPICIOUS_LOGIN': 'HIGH',
    'SUSPICIOUS_ORDERS': 'MEDIUM',
    'SUSPICIOUS_BIDDING': 'MEDIUM',
    'MULTIPLE_ACCOUNTS': 'HIGH',
    'SUSPICIOUS_PRODUCT': 'MEDIUM',
    'FLAGGED_PRODUCT': 'LOW'
  };

  return severityMap[type] || 'MEDIUM';
};

/**
 * Mark a notification as read
 * @param {number} notificationId - The ID of the notification to mark as read
 */
const markNotificationAsRead = async (notificationId) => {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Get unread notifications for a user
 * @param {number} userId - The user ID to get notifications for
 */
const getUnreadNotifications = async (userId) => {
  try {
    return await prisma.notification.findMany({
      where: {
        userId,
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    throw error;
  }
};

async function archiveOldNotifications(userId) {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: 100, // Skip the most recent 100
            select: { id: true }
        });

        if (notifications.length > 0) {
            await prisma.notification.deleteMany({
                where: {
                    id: {
                        in: notifications.map(n => n.id)
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error archiving old notifications:', error);
    }
}

module.exports = { 
    createNotification,
  markNotificationAsRead,
  getUnreadNotifications,
    notificationLimiter,
    VALID_NOTIFICATION_TYPES
};