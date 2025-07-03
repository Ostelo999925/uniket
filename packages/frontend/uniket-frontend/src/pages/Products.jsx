import React from "react";
import products from "../data/products";
import { getProductImageUrl } from '../utils/imageUtils';

const cardStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "1rem",
  width: "200px",
  boxShadow: "2px 2px 10px rgba(0,0,0,0.1)",
  backgroundColor: "#fff",
};

function Products() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Available Products</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          marginTop: "1rem",
        }}
      >
        {products.map((product) => (
          <div key={product.id} style={cardStyle}>
            <img
              src={getProductImageUrl(product.image)}
              alt={product.name}
              className="w-32 h-32 object-cover"
            />
            <h4 style={{ marginTop: "0.5rem" }}>{product.name}</h4>
            <p>₦{product.price}</p>
            <p style={{ fontSize: "0.8rem", color: "#555" }}>By: {product.vendor}</p>
            <button style={{ marginTop: "0.5rem", padding: "0.5rem", width: "100%", background: "#003366", color: "white", border: "none", borderRadius: "5px" }}>
              View / Buy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Products;
