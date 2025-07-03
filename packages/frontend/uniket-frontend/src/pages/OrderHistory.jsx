import { useEffect } from 'react';
import { io } from 'socket.io-client';

const OrderHistory = () => {
  // ... existing state ...

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true
    });

    // Listen for order status updates
    socket.on('order_status_update', (data) => {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === data.orderId
            ? { ...order, status: data.status, estimatedDeliveryTime: data.estimatedDeliveryTime }
            : order
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ... rest of the component ...
} 