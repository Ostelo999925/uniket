const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

async function updateOrderTracking() {
  try {
    const order = await prisma.order.findUnique({
      where: { id: 15 },
      include: {
        ordertracking: true
      }
    });

    if (!order) {
      console.log('Order 15 does not exist');
      return;
    }

    if (order.ordertracking) {
      console.log('Order already has tracking information');
      return;
    }

    const now = new Date();
    // Create tracking information
    const tracking = await prisma.ordertracking.create({
      data: {
        id: order.trackingId,
        orderId: order.id,
        status: 'delivered',
        history: [
          {
            status: 'in_transit',
            location: 'Vendor Location',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            description: 'Order has been shipped'
          },
          {
            status: 'delivered',
            location: 'Customer Location',
            timestamp: now.toISOString(),
            description: 'Order has been delivered'
          }
        ],
        currentLocation: 'Customer Location',
        carrier: 'Local Delivery',
        trackingNumber: order.trackingId,
        estimatedDelivery: now,
        lastUpdate: now,
        nextUpdate: now,
        updatedAt: now
      }
    });

    console.log('Created tracking information:', tracking);
  } catch (error) {
    console.error('Error updating order tracking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrderTracking(); 