import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaCheckCircle, FaBox } from 'react-icons/fa';
import './PickupManagerDashboard.css';

const PickupManagerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  // Fetch orders for the pickup manager's location
  const fetchOrders = async () => {
    try {
      const response = await axios.get('/pickup-manager/orders');
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Handle order verification and pickup
  const handleVerifyPickup = async (orderId) => {
    try {
      const response = await axios.post(`/pickup-manager/verify-pickup/${orderId}`, {
        verificationCode
      });
      
      toast.success('Order pickup verified successfully');
      setVerificationCode('');
      setSelectedOrder(null);
      fetchOrders(); // Refresh orders list
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify pickup');
    }
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter(order => 
    order.trackingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toString().includes(searchTerm) ||
    order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get pickup status text
  const getPickupStatus = (order) => {
    if (order.pickedUpAt) {
      return 'Picked up';
    }
    return 'Pending Pickup';
  };

  // Get pickup status class
  const getPickupStatusClass = (order) => {
    if (order.pickedUpAt) {
      return 'picked-up';
    }
    return 'pending-pickup';
  };

  return (
    <div className="pickup-manager-dashboard">
      {/* Search Section */}
      <div className="search-container">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by Tracking ID, Order ID or Customer Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Tracking ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Order Status</th>
              <th>Pickup Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center">Loading...</td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">No orders found</td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.trackingId || 'N/A'}</td>
                  <td>{order.user?.name}</td>
                  <td>{order.product?.name}</td>
                  <td>
                    <span className={`status-badge ${order.status.toLowerCase().replace(' ', '-')}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getPickupStatusClass(order)}`}>
                      {getPickupStatus(order)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view-btn"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Details
                      </button>
                      {!order.pickedUpAt && (
                        <button
                          className="action-btn pickup-btn"
                          onClick={() => setSelectedOrder({ ...order, showVerification: true })}
                        >
                          Verify Pickup
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              <FaBox className="me-2" />
              Order Details
            </h2>
            
            <div className="order-details">
              <div className="detail-row">
                <span>Order ID</span>
                <span>#{selectedOrder.id}</span>
              </div>
              <div className="detail-row">
                <span>Tracking ID</span>
                <span>{selectedOrder.trackingId || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Order Status</span>
                <span>
                  <span className={`status-badge ${selectedOrder.status.toLowerCase().replace(' ', '-')}`}>
                    {selectedOrder.status}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span>Pickup Status</span>
                <span>
                  <span className={`status-badge ${getPickupStatusClass(selectedOrder)}`}>
                    {getPickupStatus(selectedOrder)}
                  </span>
                </span>
              </div>
              {selectedOrder.pickedUpAt && (
                <div className="detail-row">
                  <span>Picked Up At</span>
                  <span>{new Date(selectedOrder.pickedUpAt).toLocaleString()}</span>
                </div>
              )}
              <div className="detail-row">
                <span>Order Date</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <h3 className="h5 mb-3">Customer Information</h3>
            <div className="order-details">
              <div className="detail-row">
                <span>Name</span>
                <span>{selectedOrder.user?.name}</span>
              </div>
              <div className="detail-row">
                <span>Email</span>
                <span>{selectedOrder.user?.email}</span>
              </div>
              <div className="detail-row">
                <span>Phone</span>
                <span>{selectedOrder.user?.phone}</span>
              </div>
            </div>

            <h3 className="h5 mb-3">Product Information</h3>
            <div className="order-details">
              <div className="detail-row">
                <span>Product</span>
                <span>{selectedOrder.product?.name}</span>
              </div>
              <div className="detail-row">
                <span>Quantity</span>
                <span>{selectedOrder.quantity}</span>
              </div>
              <div className="detail-row">
                <span>Price</span>
                <span>₵{selectedOrder.product?.price.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span>Total</span>
                <span>₵{(selectedOrder.product?.price * selectedOrder.quantity).toFixed(2)}</span>
              </div>
            </div>

            {/* Verification Section */}
            {selectedOrder.showVerification && !selectedOrder.pickedUpAt && (
              <div className="verification-section">
                <h3 className="h5 mb-3">Verify Product Pickup</h3>
                <div className="verification-info">
                  <p className="verification-note">
                    <FaCheckCircle className="me-2" />
                    Please verify the customer's identity and order verification code before confirming pickup
                  </p>
                </div>
                <div className="verification-controls">
                  <input
                    type="text"
                    placeholder="Enter verification code provided by customer"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="verification-input"
                  />
                  <div className="verification-buttons">
                    <button
                      className="verify-btn"
                      onClick={() => handleVerifyPickup(selectedOrder.id)}
                      disabled={!verificationCode}
                    >
                      <FaCheckCircle className="me-2" />
                      Verify Code & Complete Pickup
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                className="close-btn"
                onClick={() => {
                  setSelectedOrder(null);
                  setVerificationCode('');
                }}
              >
                <span className="close-icon">×</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupManagerOrders; 