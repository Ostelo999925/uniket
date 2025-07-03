import { useEffect } from 'react';
import { io } from 'socket.io-client';

const OrderDetail = () => {
  // ... existing state ...

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true
    });

    // Listen for order status updates
    socket.on('order_status_update', (data) => {
      if (data.orderId === order.id) {
        setOrder(prev => ({
          ...prev,
          status: data.status,
          estimatedDeliveryTime: data.estimatedDeliveryTime
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [order.id]);

  // ... rest of the component ...
} 