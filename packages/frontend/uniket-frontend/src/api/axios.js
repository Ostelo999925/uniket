import axios from "axios";
import { toast } from 'react-hot-toast';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry mechanism and better error handling
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Network error or server not running
    if (!error.response) {
      toast.error('Network error. Please check if the server is running.');
      // Implement automatic retry for network errors
      const config = error.config;
      if (!config || !config._retry) {
        config._retry = true;
        // Add a small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return instance(config);
      }
    }
    // Timeout error
    else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please try again.');
    }
    // Authentication error
    else if (error.response.status === 401) {
      // Don't redirect to login for verify endpoint failures
      if (!error.config.url.includes('/api/auth/verify')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
      }
    }
    // Other errors
    else {
      const message = error.response?.data?.error || error.message;
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

export default instance;
