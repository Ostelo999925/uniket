const NodeCache = require('node-cache');

// Create a new cache instance with a default TTL of 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

// Function to clear cache by key
const clearCache = async (key) => {
  try {
    if (key) {
      // Clear specific key
      cache.del(key);
    } else {
      // Clear all cache
      cache.flushAll();
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Function to get cached data
const getCachedData = async (key, fetchData) => {
  try {
    const cachedData = cache.get(key);
    if (cachedData) {
      return cachedData;
    }

    const freshData = await fetchData();
    cache.set(key, freshData);
    return freshData;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

module.exports = {
  cache,
  clearCache,
  getCachedData
}; 