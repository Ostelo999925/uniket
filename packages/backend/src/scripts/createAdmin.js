const bcrypt = require('bcryptjs');
const getPrismaClient = require('../prismaClient');

async function createAdmin() {
  const prisma = getPrismaClient();
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'admin'
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123@secure', 10);
    
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

    console.log('Admin user created successfully:', {
      id: admin.id,
      email: admin.email,
      role: admin.role
    });

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createAdmin(); 