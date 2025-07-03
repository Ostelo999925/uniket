// src/components/OrderItem.jsx
import React from "react";

const OrderItem = ({ order }) => {
  return (
    <div className="order-card border p-4 rounded-xl shadow-sm mb-3 bg-white">
      <h3 className="font-bold">Order #{order.id}</h3>
      <p>Status: <span className="text-blue-600">{order.status}</span></p>
      <p>Tracking ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{order.trackingId || "Not assigned"}</span></p>
      <p>Items: {order.items?.map(item => item.name).join(", ") || order.product?.name}</p>
      <p>Total: GH₵{order.total?.toFixed(2) || '0.00'}</p>
      <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
    </div>
  );
};

export default OrderItem;
