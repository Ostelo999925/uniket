// Simulated API Call for getting order details by ID
export const getOrderDetails = (orderId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          orderId,
          status: "Shipped",
          trackingNumber: "TRK-1234567890",
          shippingDate: "2025-04-11",
          expectedDelivery: "2025-04-15",
        });
      }, 1000);
    });
  };
  