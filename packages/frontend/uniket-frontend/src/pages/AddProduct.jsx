import React, { useState } from "react";
import axios from '../api/axios';
import { toast } from 'react-toastify';

function AddProduct() {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    image: null,
  });

  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === "file") {
      const file = e.target.files[0];
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('price', formData.price);
      form.append('category', formData.category);
      form.append('description', formData.description);
      if (formData.image) {
        form.append('image', formData.image);
      }

      const response = await axios.post('/vendor/products', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmitted(true);
      toast.success('Product added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>List a New Product</h2>
      {submitted ? (
        <div style={{ padding: "1rem", background: "#e6ffee", border: "1px solid #b3ffcc", borderRadius: "8px" }}>
          <h4>Product Submitted Successfully!</h4>
          <p><strong>{formData.name}</strong> for ₦{formData.price} was added.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "400px" }}>
          <input name="name" type="text" placeholder="Product Name" onChange={handleChange} required />
          <input name="price" type="number" placeholder="Price" onChange={handleChange} required />
          <select name="category" onChange={handleChange} required>
            <option value="">Select Category</option>
            <option value="electronics">Electronics</option>
            <option value="books">Books</option>
            <option value="fashion">Fashion</option>
            <option value="others">Others</option>
          </select>
          <textarea name="description" placeholder="Description" onChange={handleChange} required rows={3} />
          <input name="image" type="file" accept="image/*" onChange={handleChange} />
          {preview && <img src={preview} alt="Preview" style={{ marginTop: "1rem", width: "100%", borderRadius: "8px" }} />}
          <button 
            type="submit" 
            style={{ 
              marginTop: "1rem", 
              background: "#003366", 
              color: "white", 
              padding: "0.5rem", 
              border: "none", 
              borderRadius: "5px",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Adding Product...' : 'Submit'}
          </button>
        </form>
      )}
    </div>
  );
}

export default AddProduct;
