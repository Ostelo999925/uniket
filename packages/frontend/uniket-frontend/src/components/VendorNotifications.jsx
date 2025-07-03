import React, { useEffect, useState, useRef } from 'react';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';

const VendorNotifications = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`/notifications?userId=${user.id}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && isOpen) {
      fetchNotifications();
    }
  }, [user?.id, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`/notifications/${notificationId}/read`);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch(`/notifications/mark-all-read?userId=${user.id}`);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/notifications/${notificationId}`);
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    try {
      await axios.delete(`/notifications/clear-all`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Too many sensitive operations')) {
        toast.error("You've reached the limit for clearing notifications. Please try again later.");
      } else {
        toast.error('Failed to clear notifications');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="position-absolute top-100 end-0 mt-2 bg-white rounded shadow-lg"
      style={{ 
        width: '350px', 
        maxHeight: '500px', 
        overflowY: 'auto',
        zIndex: 1000
      }}
    >
      <div className="p-3 border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Notifications</h6>
          <div>
            <button 
              className="btn btn-sm btn-link text-decoration-none me-2"
              onClick={markAllAsRead}
              disabled={notifications.length === 0}
            >
              Mark all read
            </button>
            <button 
              className="btn btn-sm btn-link text-decoration-none text-danger"
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
            >
              Clear all
            </button>
            <button 
              className="btn btn-sm btn-link text-decoration-none ms-2"
              onClick={onClose}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="notification-list">
        {isLoading ? (
          <div className="text-center p-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-muted p-3">
            No notifications
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item p-3 border-bottom ${!notification.read ? 'bg-light' : ''}`}
              style={{ cursor: !notification.read ? 'pointer' : 'default' }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div onClick={() => !notification.read && markAsRead(notification.id)}>
                  <p className="mb-1 small">{notification.message}</p>
                  <small className="text-muted">
                    {new Date(notification.createdAt).toLocaleString()}
                  </small>
                </div>
                <div className="d-flex align-items-center">
                  {!notification.read && (
                    <span className="badge bg-primary ms-2">New</span>
                  )}
                  <button
                    className="btn btn-sm btn-link text-danger ms-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorNotifications; 