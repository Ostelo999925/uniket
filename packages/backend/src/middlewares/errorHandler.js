const errorHandler = (err, req, res, next) => {
  // Default error status and message
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Log error for development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: statusCode
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'fail',
      message: err.message,
      errors: err.errors
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Your token has expired. Please log in again.'
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      status: 'fail',
      message: 'Database operation failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle Prisma unique constraint violations
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(400).json({
      status: 'fail',
      message: `A record with this ${field} already exists.`
    });
  }

  // Handle Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'fail',
      message: 'Record not found.'
    });
  }

  // Handle path-to-regexp errors
  if (err.name === 'TypeError' && err.message.includes('Missing parameter name')) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid route parameter format'
    });
  }

  // Default error response
  res.status(statusCode).json({
    status: status,
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler; 