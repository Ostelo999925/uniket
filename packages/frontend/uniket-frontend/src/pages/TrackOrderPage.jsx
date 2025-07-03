import React, { useState } from "react";
import DeliveryTracking from "../components/DeliveryTracking";
import { useOrders } from "../context/OrderContext";
import { toast } from "react-hot-toast";
import axios from "../api/axios";

function TrackOrderPage() {
  const [searchType, setSearchType] = useState("orderId"); // or "trackingId"
  const [searchValue, setSearchValue] = useState("");
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchValue) {
      toast.error("Please enter a search value");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`/orders/track?identifier=${encodeURIComponent(searchValue)}&type=${searchType}`);
      setOrder(response.data);
    } catch (error) {
      console.error("Error searching order:", error);
      toast.error(error.response?.data?.message || "Failed to find order");
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <h1 className="mb-4">Track Your Order</h1>
      
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <select 
                className="form-select"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="orderId">Order ID</option>
                <option value="trackingId">Tracking ID</option>
              </select>
            </div>
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder={`Enter ${searchType === "orderId" ? "Order" : "Tracking"} ID`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-primary w-100"
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {order && <DeliveryTracking order={order} />}
    </div>
  );
}

export default TrackOrderPage;
