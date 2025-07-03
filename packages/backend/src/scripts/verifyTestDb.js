require('dotenv').config({ path: '.env.test' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTestDb() {
  try {
    console.log('Verifying test database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('JWT_SECRET:', process.env.JWT_SECRET);

    // Test database connection
    await prisma.$connect();
    console.log('Successfully connected to test database');

    // Test user creation
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'customer',
        phone: '0555555555'
      }
    });
    console.log('Successfully created test user:', testUser);

    // Clean up
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('Successfully cleaned up test data');

    await prisma.$disconnect();
    console.log('Successfully disconnected from test database');
  } catch (error) {
    console.error('Error verifying test database:', error);
    process.exit(1);
  }
}

verifyTestDb(); 