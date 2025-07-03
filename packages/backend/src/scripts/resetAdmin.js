const bcrypt = require('bcryptjs');
const getPrismaClient = require('../prismaClient');

async function resetAdmin() {
  const prisma = getPrismaClient();
  
  try {
    console.log('Starting admin reset process...');

    // Delete existing admin users
    const deleteResult = await prisma.user.deleteMany({
      where: {
        role: 'admin'
      }
    });
    console.log(`Deleted ${deleteResult.count} existing admin users`);

    // Create new admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@uniket.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+233000000000',
        profileComplete: 100,
        emailNotifications: true,
        smsNotifications: true,
        updatedAt: new Date()
      }
    });

    // Create wallet for admin
    await prisma.wallet.create({
      data: {
        userId: admin.id,
        balance: 0
      }
    });

    console.log('New admin user created successfully:');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('ID:', admin.id);

  } catch (error) {
    console.error('Error resetting admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
resetAdmin(); 