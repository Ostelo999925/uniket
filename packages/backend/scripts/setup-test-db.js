const { execSync } = require('child_process');
const path = require('path');

// Set environment to test
process.env.NODE_ENV = 'test';

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

try {
  // Run Prisma migrations with test database URL
  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL
    }
  });

  console.log('Test database setup completed successfully!');
} catch (error) {
  console.error('Error setting up test database:', error);
  process.exit(1);
} 