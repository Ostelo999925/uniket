import React, { useState, useEffect } from "react";
import "./DeliveryTracking.css"; // Importing the CSS for styling

function DeliveryTracking({ order }) {
  if (!order) {
    return <p>Loading...</p>;
  }

  return (
    <div className="delivery-tracking">
      <h2>Order Tracking</h2>
      <p><strong>Order ID:</strong> #{order.id}</p>
      <p><strong>Status:</strong> {order.status}</p>
      <p><strong>Tracking ID:</strong> {order.trackingId}</p>
      {order.estimatedDeliveryTime && (
        <p><strong>Expected Delivery:</strong> {new Date(order.estimatedDeliveryTime).toLocaleDateString()}</p>
      )}
      {order.pickupPoint && (
        <p><strong>Pickup Point:</strong> {order.pickupPoint.name}</p>
      )}
    </div>
  );
}

export default DeliveryTracking;
