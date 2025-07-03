const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Function to check and update orders that have reached their delivery time
const checkAndUpdateDeliveredOrders = async () => {
  try {
    const now = new Date();
    
    // Find all shipped orders where estimated delivery time has passed
    const ordersToUpdate = await prisma.order.findMany({
      where: {
        status: 'shipped',
        estimatedDeliveryTime: {
          lte: now // less than or equal to current time
        }
      },
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

    // Update each order to delivered status
    for (const order of ordersToUpdate) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'delivered' }
      });

      // Create notification for customer
      await prisma.notification.create({
        data: {
          userId: order.user.id,
          type: 'order_status',
          message: `Your order #${order.id} has been delivered`,
          data: JSON.stringify({
            orderId: order.id,
            status: 'delivered'
          })
        }
      });
    }

    console.log(`Updated ${ordersToUpdate.length} orders to delivered status`);
  } catch (error) {
    console.error('Error in checkAndUpdateDeliveredOrders:', error);
  }
};

// Function to start the background job
const startOrderStatusCheck = () => {
  // Check every 5 minutes
  setInterval(checkAndUpdateDeliveredOrders, 5 * 60 * 1000);
  
  // Also run immediately on startup
  checkAndUpdateDeliveredOrders();
};

module.exports = {
  startOrderStatusCheck
}; 