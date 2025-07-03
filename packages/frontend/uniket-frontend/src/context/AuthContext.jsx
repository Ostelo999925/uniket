import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          console.log('Initializing auth with stored token and user');
          // Verify token with backend
          try {
            const response = await axios.get('/auth/verify');
            console.log('Token verification response:', response.data);
            if (response.data.valid) {
              setUser(JSON.parse(storedUser));
            } else {
              console.log('Token validation failed, clearing storage');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            }
          } catch (error) {
            console.error('Token verification failed:', error);
            // Only clear storage if it's not a network error
            if (error.response) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            }
          }
        } else {
          console.log('No stored token or user found');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    if (authLoading) return false;
    setAuthLoading(true);
    try {
      console.log('Attempting login with:', { email });
      const response = await axios.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      });
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Login timed out. Please try again.');
      } else if (error.response?.status === 401) {
        toast.error('Invalid email or password');
      } else if (error.response?.status === 404) {
        toast.error('Login service not found. Please try again later.');
      } else {
        const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
        toast.error(errorMessage);
      }
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (userData) => {
    if (authLoading) return false;
    setAuthLoading(true);
    try {
      console.log('Attempting signup with:', { email: userData.email });
      const response = await axios.post('/auth/register', userData);
      console.log('Signup response:', response.data);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Signup successful!');
      return true;
    } catch (error) {
      console.error('Signup error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      });
      
      if (error.code === 'ECONNABORTED') {
        toast.error('Signup timed out. Please try again.');
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || 'Invalid signup data';
        toast.error(errorMessage);
      } else {
        const errorMessage = error.response?.data?.error || 'Signup failed. Please try again.';
        toast.error(errorMessage);
      }
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    loading,
    authLoading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default useAuth; 