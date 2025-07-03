const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function updateOrderTrackingIds() {
  try {
    // Get all orders without tracking IDs
    const orders = await prisma.order.findMany({
      where: {
        trackingId: null
      }
    });

    console.log(`Found ${orders.length} orders to update`);

    // Update each order with a unique tracking ID
    for (const order of orders) {
      const trackingId = `TRK-${uuidv4().slice(0, 8).toUpperCase()}`;
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { trackingId }
        });
        console.log(`Updated order ${order.id} with tracking ID: ${trackingId}`);
      } catch (error) {
        console.error(`Failed to update order ${order.id}:`, error.message);
      }
    }

    console.log('Successfully updated all orders');
  } catch (error) {
    console.error('Error updating orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOrderTrackingIds(); 