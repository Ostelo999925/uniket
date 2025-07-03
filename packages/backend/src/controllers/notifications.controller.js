const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Get notifications for a user (vendor)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching notifications for user:', userId);

    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ error: 'Unauthorized: No user ID found' });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: Number(userId),
        type: {
          in: ['review', 'bid', 'order', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Format notifications and ensure data is properly parsed
    const formattedNotifications = notifications.map(notification => {
      let parsedData = {};
      try {
        parsedData = notification.data ? JSON.parse(notification.data) : {};
      } catch (e) {
        console.error('Error parsing notification data:', e);
        parsedData = {};
      }

      return {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt,
        data: parsedData
      };
    });

    console.log('Found notifications:', formattedNotifications.length);
    res.json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.update({
      where: {
        id: Number(notificationId),
        userId: Number(userId)
      },
      data: {
        read: true
      }
    });

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId: Number(userId),
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
