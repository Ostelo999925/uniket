import React from "react";
import { useParams } from "react-router-dom";
import ProductDetail from "../components/ProductDetail"; // Import the ProductDetail component

function ProductPage() {
  const { productId } = useParams();
  const userId = localStorage.getItem('userId');
  const isVendor = localStorage.getItem('role') === 'vendor';

  return (
    <div>
      <h1>Product Details</h1>
      <ProductDetail productId={productId} userId={userId} isVendor={isVendor} />
    </div>
  );
}

export default ProductPage;
