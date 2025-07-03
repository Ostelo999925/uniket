const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

async function updateImagePaths() {
  try {
    // Update products with old default image path
    await prisma.product.updateMany({
      where: {
        OR: [
          { image: '/products/default-product.jpg' },
          { image: '/uploads/products/default-product.jpg' },
          { image: 'default-product.jpg' }
        ]
      },
      data: {
        image: 'uniket-icon.png'
      }
    });

    // Update products with /products/ prefix
    const productsWithPrefix = await prisma.product.findMany({
      where: {
        image: {
          contains: '/products/'
        }
      }
    });

    for (const product of productsWithPrefix) {
      const newPath = product.image.replace('/products/', '');
      await prisma.product.update({
        where: { id: product.id },
        data: { image: newPath }
      });
    }

    console.log('Successfully updated image paths');
  } catch (error) {
    console.error('Error updating image paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateImagePaths(); 