// VendorBids.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

function VendorBids({ productId }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch all bids for a product
    axios
      .get(`/api/bidding/product/${productId}/bids`)
      .then((response) => {
        // Ensure bids is always an array
        const bidsData = Array.isArray(response.data) ? response.data : [];
        // Sort bids by amount in descending order
        const sortedBids = [...bidsData].sort((a, b) => b.amount - a.amount);
        setBids(sortedBids);
      })
      .catch((err) => {
        console.error('Error fetching bids:', err);
        setError("Failed to load bid history");
        setBids([]); // Set empty array on error
      })
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <div className="vendor-bids">
      {loading && <p>Loading bid history...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && bids && bids.length > 0 && (
        <div>
          <h3>Bidding History</h3>
          <ul>
            {bids.map((bid) => (
              <li key={bid.id}>
                <strong>User {bid.user?.name || bid.userId}:</strong> ${bid.amount} (Placed at {new Date(bid.createdAt).toLocaleString()})
                {bid.status && <span className={`badge ${bid.status === 'APPROVED' ? 'bg-success' : bid.status === 'REJECTED' ? 'bg-danger' : 'bg-warning'}`}>{bid.status}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!loading && (!bids || bids.length === 0) && <p>No bids placed yet.</p>}
    </div>
  );
}

export default VendorBids;
