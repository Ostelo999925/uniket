const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

async function checkOrder() {
  try {
    const order = await prisma.order.findUnique({
      where: { id: 15 },
      include: {
        ordertracking: true,
        product: {
          select: {
            id: true,
            name: true,
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

    if (!order) {
      console.log('Order 15 does not exist');
      return;
    }

    console.log('Order found:', {
      id: order.id,
      status: order.status,
      customerId: order.customerId,
      hasTracking: !!order.ordertracking,
      product: order.product
    });

    if (order.ordertracking) {
      console.log('Tracking information:', order.ordertracking);
    } else {
      console.log('No tracking information available');
    }
  } catch (error) {
    console.error('Error checking order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder(); 