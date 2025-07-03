import React, { useState } from 'react';
import { FaBell, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import './AdminNotifications.css';

const AdminNotifications = ({ notifications = [], onUpdate }) => {
  const [filter, setFilter] = useState('all');

  const getSeverityIcon = (type) => {
    switch (type) {
      case 'PRODUCT_REJECTED':
      case 'NEW_REPORT':
      case 'FRAUD_ALERT':
        return <FaExclamationTriangle className="text-danger" />;
      case 'PRODUCT_APPROVED':
      case 'NEW_ORDER':
        return <FaInfoCircle className="text-warning" />;
      case 'NEW_VENDOR':
        return <FaInfoCircle className="text-info" />;
      default:
        return <FaBell className="text-secondary" />;
    }
  };

  const getSeverityClass = (type) => {
    switch (type) {
      case 'PRODUCT_REJECTED':
      case 'NEW_REPORT':
      case 'FRAUD_ALERT':
        return 'severity-high';
      case 'PRODUCT_APPROVED':
      case 'NEW_ORDER':
        return 'severity-medium';
      case 'NEW_VENDOR':
        return 'severity-low';
      default:
        return '';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    if (filter === 'fraud') return notification.type === 'NEW_REPORT' || notification.type === 'FRAUD_ALERT';
    return true;
  });

  return (
    <div className="admin-notifications">
      <div className="notifications-filter">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="form-select"
        >
          <option value="all">All Notifications</option>
          <option value="unread">Unread</option>
          <option value="fraud">Fraud Alerts</option>
        </select>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications">
            <FaCheckCircle className="icon" />
            <p>No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'} ${getSeverityClass(notification.type)}`}
            >
              <div className="notification-icon">
                {getSeverityIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <h4>{notification.type}</h4>
                  <span className="notification-time">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="notification-message">{notification.message}</p>
                {notification.data && (
                  <div className="notification-details">
                    <pre>{JSON.stringify(notification.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotifications; 