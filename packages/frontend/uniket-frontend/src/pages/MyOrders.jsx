// src/pages/MyOrders.jsx
import React, { useContext } from "react";
import { OrderContext } from "../context/OrderContext";
import OrderItem from "../components/OrderItem";
import "../styles/MyOrders.css"; // optional styling


const MyOrders = () => {
  const { orders } = useContext(OrderContext);

  return (
    <div className="my-orders">
      <h2 className="text-xl font-semibold mb-4">My Orders</h2>
      {orders.length === 0 ? (
        <p>You have no orders yet.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <OrderItem key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
