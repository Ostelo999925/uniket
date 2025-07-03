const dotenv = require('dotenv');
const fs = require('fs');
const { app, setupSocketIO } = require('./app');
const { startOrderStatusCheck } = require('./services/orderService');
const EventEmitter = require('events');

// Set max listeners
EventEmitter.defaultMaxListeners = 20;

// Load environment variables
dotenv.config();

// Ensure required environment variables are set
const requiredEnvVars = ['JWT_SECRET', 'NODE_ENV'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set in environment variables`);
    process.exit(1);
  }
}

// Create HTTP or HTTPS server
let server;
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH) {
    console.error('Error: SSL certificate paths not set for production environment');
    process.exit(1);
  }
  server = https.createServer({
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  }, app);
} else {
  server = require('http').createServer(app);
}

// Setup Socket.IO using the function from app.js
setupSocketIO(server);

// Start the order status check background job
startOrderStatusCheck();

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.get('host')}${req.url}`);
    }
    next();
  });
}

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Protocol: ${process.env.NODE_ENV === 'production' ? 'HTTPS' : 'HTTP'}`);
});

module.exports = { app, server };