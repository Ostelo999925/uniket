import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';

const TrackOrder = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const fetchOrderTracking = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/orders/${id}/tracking`, {
          withCredentials: true
        });
        setOrder(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching tracking info:', err);
        setError(err.response?.data?.error || 'Failed to fetch tracking information');
        toast.error(err.response?.data?.error || 'Failed to fetch tracking information');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderTracking();
  }, [id]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for order status updates
    socket.on('order_status_update', (data) => {
      if (data.orderId === parseInt(id)) {
        setOrder(prev => ({
          ...prev,
          status: data.status,
          estimatedDeliveryTime: data.estimatedDeliveryTime
        }));
        toast.success('Order status updated');
      }
    });

    return () => {
      socket.off('order_status_update');
    };
  }, [socket, isConnected, id]);

  if (loading) {
    return <div>Loading tracking information...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!order) {
    return <div>No tracking information available</div>;
  }

  return (
    <div className="tracking-container">
      <h2>Order Tracking</h2>
      <div className="tracking-info">
        <p><strong>Order ID:</strong> {order.orderId}</p>
        <p><strong>Tracking ID:</strong> {order.trackingId}</p>
        <p><strong>Status:</strong> {order.status}</p>
        {order.tracking && (
          <>
            <p><strong>Current Location:</strong> {order.tracking.currentLocation || 'N/A'}</p>
            <p><strong>Carrier:</strong> {order.tracking.carrier || 'N/A'}</p>
            <p><strong>Last Update:</strong> {new Date(order.tracking.lastUpdate).toLocaleString()}</p>
            <p><strong>Next Update:</strong> {new Date(order.tracking.nextUpdate).toLocaleString()}</p>
          </>
        )}
      </div>
      {order.product && (
        <div className="product-info">
          <h3>Product Information</h3>
          <p><strong>Name:</strong> {order.product.name}</p>
          <p><strong>Vendor:</strong> {order.product.user.name}</p>
        </div>
      )}
    </div>
  );
};

export default TrackOrder; 