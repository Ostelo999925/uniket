const NodeCache = require('node-cache');

// Create cache instance with 5 minutes default TTL
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 320,
  useClones: false
});

// Cache middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Use custom cache key if provided, otherwise use the URL
    const key = req.cacheKey || req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    res.originalJson = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      res.originalJson(body);
    };
    next();
  };
};

// Clear cache for a specific key
const clearCache = (key) => {
  if (key) {
    cache.del(key);
  } else {
    cache.flushAll();
  }
};

const getCachedData = async (key, fetchData) => {
  const cachedData = cache.get(key);
  if (cachedData) {
    return cachedData;
  }

  const freshData = await fetchData();
  cache.set(key, freshData);
  return freshData;
};

module.exports = {
  cache,
  clearCache,
  cacheMiddleware,
  getCachedData
}; 