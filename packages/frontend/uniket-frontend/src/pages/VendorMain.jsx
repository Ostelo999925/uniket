import React, { useState, useEffect } from "react";
import axios from "axios";
import VendorStats from "../components/VendorStats";
import VendorDashboard from "./VendorDashboard";
import { getProductImageUrl } from '../utils/imageUtils';

const VendorMain = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/products/vendor/products", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products", error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="space-y-6 px-4 py-6">
      <VendorStats />
      <VendorDashboard />
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Your Products</h2>
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.id} className="border p-4 rounded-md shadow-md">
              <img 
                src={getProductImageUrl(product.image)} 
                alt={product.name} 
                className="w-32 h-32 object-cover" 
              />
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p>{product.description}</p>
              <p>Price: ${product.price}</p>
              <p>Category: {product.category}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(product.id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No products found</p>
        )}
      </div>
    </div>
  );
};

export default VendorMain;
