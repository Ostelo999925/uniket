import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: ''
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get('/vendor/products', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const prod = res.data.products.find(p => p.id === id);
        if (prod) {
          setFormData({
            name: prod.name,
            category: prod.category,
            price: prod.price,
            description: prod.description
          });
        } else {
          toast.error('Product not found');
          navigate('/vendor/products');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch product');
        navigate('/vendor/products');
      }
    };
    fetchProduct();
  }, [id, navigate, token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`/vendor/products/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Product updated successfully!');
      navigate('/vendor/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Edit Product</h2>
      <form onSubmit={handleUpdate} className="space-y-3">
        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Product Name" className="w-full border p-2" required />
        <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Category" className="w-full border p-2" required />
        <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Price" className="w-full border p-2" required />
        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" className="w-full border p-2" required />
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update'}
        </button>
      </form>
    </div>
  );
};

export default EditProduct;
