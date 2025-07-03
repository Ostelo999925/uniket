import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Switch } from '@headlessui/react';

const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const toggleBidding = async (productId) => {
    try {
      await axios.put(`/vendor/products/${productId}/toggle-bidding`);
      fetchProducts(); // Refresh product list after toggling
    } catch (error) {
      console.error('Error toggling bidding status:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600">{product.description}</p>
            <p className="text-lg font-bold">${product.price}</p>
            <div className="flex items-center mt-2">
              <span className="mr-2">Bidding Enabled:</span>
              <Switch
                checked={product.enableBidding}
                onChange={() => toggleBidding(product.id)}
                className={`$ {
                  product.enableBidding ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full`}
              >
                <span
                  className={`$ {
                    product.enableBidding ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform bg-white rounded-full`}
                />
              </Switch>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList; 