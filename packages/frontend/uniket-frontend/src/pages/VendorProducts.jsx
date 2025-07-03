import React, { useEffect, useState } from 'react';
import axios from '../api/axios';

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const token = localStorage.getItem('token'); // Assuming you store the token in localStorage

  useEffect(() => {
    axios.get('/vendor/products', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setProducts(res.data.products))
    .catch(err => console.error(err));
  }, []);

  const deleteProduct = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      axios.delete(`/vendor/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        setProducts(products.filter(p => p.id !== id));
      })
      .catch(err => console.error(err));
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">My Products</h2>
      {products.map(product => (
        <div key={product.id} className="p-3 mb-3 rounded shadow bg-white flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{product.name}</h3>
            <p>{product.category}</p>
            <p>${product.price}</p>
          </div>
          <div className="space-x-2">
            <button
              className="bg-yellow-500 text-white px-3 py-1 rounded"
              onClick={() => window.location.href = `/vendor/edit-product/${product.id}`}
            >
              Edit
            </button>
            <button
              className="bg-red-500 text-white px-3 py-1 rounded"
              onClick={() => deleteProduct(product.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VendorProducts;
