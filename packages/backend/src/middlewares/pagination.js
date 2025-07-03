const paginationMiddleware = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Add pagination info to request object
  req.pagination = {
    page,
    limit,
    skip
  };

  // Add pagination headers to response
  res.paginatedResults = (data, total) => {
    const totalPages = Math.ceil(total / limit);
    
    return res.json({
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  };

  next();
};

module.exports = paginationMiddleware; 