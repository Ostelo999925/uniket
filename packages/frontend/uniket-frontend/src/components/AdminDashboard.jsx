import React, { useState, useEffect } from 'react';
import axios from '../api/axios';

const REJECTION_REASONS = [
  "Inappropriate content",
  "Incomplete information",
  "Prohibited item",
  "Duplicate listing",
  "Other"
];

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [selectedReason, setSelectedReason] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products?isAdmin=true');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleStatusUpdate = async (productId, status) => {
    let flaggedReason = null;
    if (status === 'rejected') {
      flaggedReason = selectedReason[productId] || REJECTION_REASONS[0];
    }
    try {
      await axios.patch(`/api/products/${productId}/status`, { status, flaggedReason });
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600">{product.description}</p>
            <p className="text-lg font-bold">${product.price}</p>
            <p className="text-sm text-gray-500">Status: {product.status}</p>
            
            {product.status === 'pending' && (
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => handleStatusUpdate(product.id, 'approved')}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Approve
                </button>
                <select
                  value={selectedReason[product.id] || REJECTION_REASONS[0]}
                  onChange={e =>
                    setSelectedReason(prev => ({
                      ...prev,
                      [product.id]: e.target.value
                    }))
                  }
                  className="px-2 py-1 border rounded"
                >
                  {REJECTION_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleStatusUpdate(product.id, 'rejected')}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard; 