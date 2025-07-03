// prismaClient.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '../.env.test')
  : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const { PrismaClient } = require('@prisma/client');

let prisma;

const getPrismaClient = () => {
  if (!prisma) {
    try {
      console.log('Initializing Prisma client...');
      
      // Always use TEST_DATABASE_URL in test mode
      const dbUrl = process.env.NODE_ENV === 'test' 
        ? process.env.TEST_DATABASE_URL 
        : process.env.DATABASE_URL;

      if (!dbUrl) {
        throw new Error(`Database URL is not defined for ${process.env.NODE_ENV} environment`);
      }

      // Validate database URL format
      if (!dbUrl.startsWith('mysql://') && !dbUrl.startsWith('postgresql://')) {
        throw new Error('Invalid database URL format. Must start with mysql:// or postgresql://');
      }

      console.log('Using database URL:', dbUrl);
      console.log('Environment:', process.env.NODE_ENV);
      
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl
          }
        },
        log: ['warn', 'error'],
      });

      // Test the connection
      prisma.$connect()
        .then(() => {
          console.log('Successfully connected to database');
        })
        .catch((error) => {
          console.error('Failed to connect to database:', error);
          throw error;
        });

    } catch (error) {
      console.error('Error initializing Prisma client:', error);
      throw error;
    }
  }
  return prisma;
};

// Handle cleanup on process termination
process.on('beforeExit', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

module.exports = getPrismaClient;
