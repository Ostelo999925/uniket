const { PrismaClient } = require('@prisma/client');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

async function setupTestDatabase() {
  try {
    // Use TEST_DATABASE_URL for test database
    const dbUrl = process.env.TEST_DATABASE_URL;
    if (!dbUrl) {
      throw new Error('TEST_DATABASE_URL is not defined in .env.test');
    }

    const dbName = dbUrl.split('/').pop();
    console.log('Setting up test database:', dbName);
    
    // Create connection without database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'OsTelO05!'
    });

    console.log('Connected to MySQL server');

    // Drop database if exists
    await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Dropped database ${dbName} if it existed`);

    // Create database
    await connection.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database ${dbName}`);

    // Close connection
    await connection.end();
    console.log('Closed MySQL connection');

    // Initialize Prisma with TEST_DATABASE_URL
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      }
    });

    console.log('Running Prisma migrations...');
    await prisma.$executeRawUnsafe(`USE ${dbName}`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMP(3) NULL,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT NULL,
        rolled_back_at TIMESTAMP(3) NULL,
        started_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    await prisma.$disconnect();
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase(); 