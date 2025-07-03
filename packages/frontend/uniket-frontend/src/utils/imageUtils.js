const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Gets the full URL for a product image
 * @param {string} imagePath - The image path from the API
 * @returns {string} The full URL for the image
 */
export const getProductImageUrl = (imagePath) => {
  if (!imagePath) {
    // Use the application's custom logo as default
    return `${API_BASE_URL}/uploads/uniket-icon.png`;
  }

  // If the path already starts with http/https, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Remove any leading slash
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  // If path doesn't start with uploads, add it
  const path = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;

  return `${API_BASE_URL}/${path}`;
}; 