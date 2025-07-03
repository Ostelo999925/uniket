import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from '../api/axios'; // Use our configured axios instance
import { toast } from 'react-hot-toast';

const CartContext = createContext();

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get userId from localStorage with error handling
  useEffect(() => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserId(parsedUser?.id || null);
      }
    } catch (error) {
      console.error("Failed to parse user data:", error);
      localStorage.removeItem("user"); // Clear corrupt data
    }
  }, []);

  // Load cart from backend or localStorage
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        if (userId) {
          // Try backend first with retry logic
          let retries = 3;
          while (retries > 0) {
            try {
              const response = await axios.get('/cart');
              setCartItems(response.data || []);
              break;
            } catch (error) {
              retries--;
              if (retries === 0) {
                throw error;
              }
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          // Fallback to localStorage
          const savedCart = localStorage.getItem('cart');
          setCartItems(savedCart ? JSON.parse(savedCart) : []);
        }
      } catch (error) {
        console.error("Failed to load cart:", error);
        try {
          const savedCart = localStorage.getItem('cart');
          setCartItems(savedCart ? JSON.parse(savedCart) : []);
          toast.error("Failed to load cart from server. Using local data.");
        } catch (parseError) {
          console.error("Failed to parse cart data:", parseError);
          localStorage.removeItem('cart');
          setCartItems([]);
          toast.error("Failed to load cart data.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [userId]);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [cartItems]);

  const addToCart = async (product, qty = 1) => {
    const newCartItems = [...cartItems];
    const existingItemIndex = newCartItems.findIndex(item => item.id === product.id);

    if (existingItemIndex >= 0) {
      newCartItems[existingItemIndex].qty += qty;
    } else {
      newCartItems.push({ ...product, qty });
    }

    setCartItems(newCartItems);

    try {
      if (userId) {
        await axios.post('/cart', {
          productId: product.id,
          quantity: existingItemIndex >= 0 ? newCartItems[existingItemIndex].qty : qty
        });
      }
    } catch (error) {
      console.error("Failed to sync cart to backend:", error);
      toast.error("Failed to add item to cart");
    }
  };

  const removeFromCart = async (productId) => {
    const newCartItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newCartItems);

    try {
      if (userId) {
        await axios.delete(`/cart/${productId}`);
      }
    } catch (error) {
      console.error("Failed to remove item from backend:", error);
      toast.error("Failed to remove item from cart");
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    try {
      localStorage.removeItem('cart'); // Always clear localStorage
      if (userId) {
        await axios.delete('/cart');
      }
    } catch (error) {
      console.error("Failed to clear cart on backend:", error);
      toast.error("Failed to clear cart");
    }
  };

  const updateQuantity = async (productId, qty) => {
    const newQty = Math.max(1, qty);
    const newCartItems = cartItems.map(item =>
      item.id === productId ? { ...item, qty: newQty } : item
    );
    setCartItems(newCartItems);

    try {
      if (userId) {
        await axios.put(`/cart/${productId}`, {
          quantity: newQty
        });
      }
    } catch (error) {
      console.error("Failed to update quantity on backend:", error);
      toast.error("Failed to update quantity");
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      loading,
      addToCart,
      removeFromCart,
      clearCart,
      updateQuantity
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default useCart;