import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    console.log('Connecting to socket URL:', socketUrl);

    const socketInstance = io(socketUrl, {
      withCredentials: true
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      toast.error('Connection error. Please refresh the page.');
    });

    // Set up event handlers
    socketInstance.on('order_status', (data) => {
      console.log('Order status update received:', data);
    });

    socketInstance.on('support_message', (data) => {
      console.log('Support message received:', data);
    });

    socketInstance.on('support_typing', (data) => {
      console.log('Support typing status:', data);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const sendMessage = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      toast.error('Not connected to server. Please refresh the page.');
    }
  };

  const value = {
    socket,
    isConnected,
    sendMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 