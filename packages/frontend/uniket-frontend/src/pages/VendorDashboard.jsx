import React, { useEffect, useState } from "react";
import axios from "../api/axios";
import { FaEdit, FaTrash, FaCamera, FaCog, FaSignOutAlt, FaBell } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import WithdrawalForm from '../components/WithdrawalForm';
import VendorSupportChat from '../components/VendorSupportChat';
import { getProductImageUrl } from '../utils/imageUtils';

const editButtonStyle = {
  borderColor: "#001f3f",
  color: "#001f3f"
};

// Helper function to determine badge color based on order status
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'warning';
    case 'processing':
      return 'info';
    case 'shipped':
      return 'primary';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'refunded':
      return 'secondary';
    default:
      return 'light';
  }
};

const VendorDashboard = () => {
  // State management
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    quantity: "",
    image: null,
    enableBidding: false,
    startingBid: "",
    bidEndDate: ""
  });

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [originalProduct, setOriginalProduct] = useState(null);
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    topProduct: { name: '', views: 0 },
    recentOrders: 0,
    lowStockProducts: 0,
    totalProductViews: 0
  });

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    minQuantity: "",
    maxQuantity: "",
  });

  const [vendor, setVendor] = useState({
    id: "",
    name: "",
    email: "",
    image: "",
    phone: ""
  });

  const [notifications, setNotifications] = useState({
    products: 0,
    orders: 0,
    reviews: 0,
    bids: 0,
    items: []
  });

  const [allNotifications, setAllNotifications] = useState([]);
  const [reviewNotifications, setReviewNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [pendingBids, setPendingBids] = useState([]);
  const [productReviews, setProductReviews] = useState([]);

  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bidDetails, setBidDetails] = useState({
    startingBid: "",
    bidEndDate: ""
  });

  // Add state to track which order is being edited for status and estimated delivery time
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempEstimatedDelivery, setTempEstimatedDelivery] = useState('');

  // Fetch data on component mount
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData?.role === "vendor") {
      setVendor({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image || "",
        phone: userData.phone || ""
      });
    }

    fetchVendorProducts();
    fetchVendorStats();
    fetchVendorOrders();
    fetchNotifications();
    fetchPendingBids();
  }, []);

  useEffect(() => {
    // Fetch vendor orders only once when component mounts
    fetchVendorOrders();
  }, [vendor.id]); // Make sure to refetch if vendor.id changes

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) return;

    const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5001", {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    socket.emit("register", userData.id);

    socket.on("new_order", (data) => {
      console.log("New order received:", data);
      toast.info(`New order #${data.order.id} received for ${data.order.product.name}`);
      fetchVendorOrders();
      fetchNotifications();
    });

    socket.on("order_status_update", (data) => {
      console.log("Order status update received:", data);
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === data.orderId 
            ? { ...order, status: data.status, estimatedDeliveryTime: data.estimatedDeliveryTime }
            : order
        )
      );
    });

    socket.on("notification", (notification) => {
      console.log("New notification received:", notification);
      
      setNotifications(prev => ({
        ...prev,
        items: [notification, ...prev.items],
        [getNotificationCategory(notification.type)]: prev[getNotificationCategory(notification.type)] + 1
      }));
      
      switch (notification.type) {
        case 'REVIEW':
          setReviewNotifications(prev => [notification, ...prev]);
          toast.info(notification.message, { icon: '⭐', duration: 5000 });
          fetchProductReviews();
          break;
        case 'PRODUCT_APPROVED':
          toast.success(notification.message, { icon: '✅', duration: 5000 });
          fetchVendorProducts();
          break;
        case 'PRODUCT_REJECTED':
          toast.error(notification.message, { icon: '❌', duration: 5000 });
          fetchVendorProducts();
          break;
        case 'NEW_BID':
        case 'bid_status':
          toast.info(notification.message, { icon: '💰', duration: 5000 });
          fetchPendingBids();
          break;
        case 'NEW_ORDER':
          toast.info(notification.message, { icon: '🛍️', duration: 5000 });
          fetchVendorOrders();
          break;
        default:
          toast.info(notification.message);
      }
    });

    socket.on("notifications_updated", ({ userId }) => {
      if (userId === userData.id) {
        fetchNotifications();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getNotificationCategory = (type) => {
    switch (type) {
      case 'PRODUCT_APPROVED':
      case 'PRODUCT_REJECTED':
        return 'products';
      case 'NEW_ORDER':
        return 'orders';
      case 'REVIEW':
        return 'reviews';
      case 'NEW_BID':
      case 'bid_status':
        return 'bids';
      default:
        return 'products';
    }
  };

  // API calls
  const fetchVendorProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please login to view your products');
        return;
      }

      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData || !userData.id) {
        console.error('No user data found');
        toast.error('Please login again');
        return;
      }

      console.log('Fetching products for vendor:', userData.id);
      
      const response = await axios.get('/vendor/products');
      
      const products = Array.isArray(response.data) ? response.data : [];
      console.log('Received products:', products.length);
      setProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 401) {
        toast.error('Please login again');
      } else {
        toast.error('Failed to fetch products');
      }
      setProducts([]);
    }
  };

  const fetchVendorStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to view your stats');
      }

      const statsResponse = await axios.get('/vendor/dashboard');
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      toast.error('Failed to fetch vendor stats');
    }
  };

  const fetchVendorOrders = async () => {
    try {
      setLoading(true);
      const ordersResponse = await axios.get('/vendor/orders');
      setOrders(ordersResponse.data);
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please login to view notifications');
        return;
      }

      const response = await axios.get('/vendor/notifications');
      
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    }
  };

  const fetchProductReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("Authentication token is missing");
        toast.error("Please log in to view reviews");
        return;
      }
      const res = await axios.get("/vendor/reviews");
      setProductReviews(res.data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchProductReviews();
    // Optionally, poll for new notifications every 30s:
    const interval = setInterval(() => {
      fetchNotifications();
      fetchProductReviews();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [hasChanges, setHasChanges] = useState(false);
const [initialProfile, setInitialProfile] = useState({});

// Set initial profile data when component mounts
useEffect(() => {
  const userData = JSON.parse(localStorage.getItem("user"));
  if (userData?.role === "vendor") {
    const profile = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone || ""
    };
    setVendor(profile);
    setInitialProfile(profile);
  }
}, []);

// Track changes in profile data
useEffect(() => {
  setHasChanges(
    vendor.name !== initialProfile.name ||
    vendor.email !== initialProfile.email ||
    vendor.phone !== initialProfile.phone
  );
}, [vendor, initialProfile]);

const updateVendorProfile = async (profileData) => {
  // Check if there are actually changes
  if (!hasChanges) {
    toast("No changes were made", {
      icon: "ℹ️",
      position: "top-center"
    });
    return;
  }

  const loadingToast = toast.loading("Saving changes...", {
    position: "top-center"
  });

  try {
    const res = await axios.put(
      "/vendor/profile",
      profileData
    );

    // Update local state
    setVendor(res.data);
    setInitialProfile(res.data);
    setHasChanges(false);

    // Update localStorage
    const userData = JSON.parse(localStorage.getItem("user"));
    localStorage.setItem("user", JSON.stringify({
      ...userData,
      ...res.data
    }));

    toast.success("Profile updated successfully!", {
      position: "top-center",
      duration: 3000
    });
  } catch (error) {
    console.error("Update error:", error);
    toast.error(error.response?.data?.message || "Failed to update profile", {
      position: "top-center"
    });
  } finally {
    toast.dismiss(loadingToast);
  }
};

  const updateProfileImage = async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const res = await axios.put(
        "/vendor/profile/image", 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setVendor(prev => ({...prev, image: res.data.imageUrl}));
      toast.success("Profile image updated");
      return res.data;
    } catch {
      toast.error("Failed to update image");
    }
  };

  // Product handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
      setFormData(prev => ({ 
        ...prev, 
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setEditId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      quantity: product.quantity,
      image: null,
      enableBidding: product.enableBidding || false,
      startingBid: product.startingBid || "",
      bidEndDate: product.bidEndDate ? new Date(product.bidEndDate).toISOString().slice(0, 16) : ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Starting form submission...');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('quantity', formData.quantity);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('condition', formData.condition || '');
      formDataToSend.append('brand', formData.brand || '');
      formDataToSend.append('model', formData.model || '');
      formDataToSend.append('year', formData.year || '');
      formDataToSend.append('color', formData.color || '');
      formDataToSend.append('warranty', formData.warranty || '');
      formDataToSend.append('shipping', formData.shipping || '');
      formDataToSend.append('returnPolicy', formData.returnPolicy || '');
      
    if (formData.image) {
        console.log('Appending image to form data:', formData.image);
        formDataToSend.append('image', formData.image);
    }

    if (formData.enableBidding) {
        formDataToSend.append('enableBidding', 'true');
        if (formData.startingBid) {
          formDataToSend.append('startingBid', formData.startingBid);
        }
        if (formData.bidEndDate) {
          formDataToSend.append('bidEndDate', formData.bidEndDate);
        }
      }

      console.log('Form data contents:');
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      if (editId) {
        console.log('Updating existing product:', editId);
        const response = await axios.put(`/vendor/products/${editId}`, formDataToSend);
        console.log('Update response:', response.data);
        toast.success('Product updated successfully');
      } else {
        console.log('Creating new product');
        const response = await axios.post('/vendor/products', formDataToSend);
        console.log('Create response:', response.data);
        toast.success('Product added successfully');
      }

      // Reset form
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      quantity: "",
      image: null,
      enableBidding: false,
      startingBid: "",
        bidEndDate: ""
    });
    setEditMode(false);
    setEditId(null);
      fetchVendorProducts();
    } catch (error) {
      console.error('Error submitting product:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      toast.error(error.response?.data?.error || 'Failed to submit product');
    }
  };

  const handleDelete = (id) => {
    setProductToDelete(id);
    const modal = new window.bootstrap.Modal(document.getElementById("deleteModal"));
    modal.show();
  };

  const handleClearAll = async () => {
    const userData = JSON.parse(localStorage.getItem("user"));
    const userId = userData?.id;
    if (!userId) return;

    try {
      // Mark all unread notifications as read
      await axios.put(
        `/notifications/read-all`,
        { userId }
      );
      
      // Update all notification states
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      
      setAllNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      
      setReviewNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      
      toast.success("All notifications marked as read!");
    } catch (err) {
      console.error("Error clearing notifications:", err);
      toast.error("Failed to clear notifications");
    }
  };
  

  const confirmDelete = async () => {
    try {
      await axios.delete(
        `/vendor/products/${productToDelete}`
      );
      toast.success("Product deleted");
      fetchVendorProducts();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      const modal = window.bootstrap.Modal.getInstance(document.getElementById("deleteModal"));
      modal.hide();
      setProductToDelete(null);
    }
  };

  // Filter products
  const filterProducts = () => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category ? product.category === filters.category : true;
      const matchesPrice =
        (!filters.minPrice || product.price >= filters.minPrice) &&
        (!filters.maxPrice || product.price <= filters.maxPrice);
      const matchesQuantity =
        (!filters.minQuantity || product.quantity >= filters.minQuantity) &&
        (!filters.maxQuantity || product.quantity <= filters.maxQuantity);

      return matchesSearch && matchesCategory && matchesPrice && matchesQuantity;
    });
  };

  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Calculate total revenue from orders
  const totalRevenue = orders.reduce((sum, order) => {
    // Case 1: Order has orderItems array
    if (order.orderItems && Array.isArray(order.orderItems)) {
      return sum + order.orderItems.reduce((itemSum, item) => {
        const price = Number(item.product?.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return itemSum + (price * quantity);
      }, 0);
    }

    // Case 2: Order has total field
    if (order.total) {
      return sum + Number(order.total);
    }

    return sum;
  }, 0);

  // Add final debugging
  console.log("Final total revenue:", totalRevenue);

  // Calculate top product
  const topProduct = products.length
    ? products.reduce((max, p) => (p.views > max.views ? p : max), products[0])
    : null;

  // Calculate recent orders (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const recentOrdersCount = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= thirtyDaysAgo && orderDate <= now;
  }).length;

  // Render sections
  const renderDashboardSection = () => (
    <>
      <div className="row mb-4">
        {/* Total Products */}
        <div className="col-md-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">{stats?.totalProducts || 0}</h5>
              <p className="card-text text-muted">Total Products</p>
            </div>
          </div>
        </div>
  
        {/* Total Orders */}
        <div className="col-md-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">{stats?.totalOrders || 0}</h5>
              <p className="card-text text-muted">Total Orders</p>
            </div>
          </div>
        </div>
  
        {/* Total Revenue */}
        <div className="col-md-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">GH₵{stats?.totalRevenue?.toLocaleString() || 0}</h5>
              <p className="card-text text-muted">Total Revenue</p>
            </div>
          </div>
        </div>
  
        {/* Total Views */}
        <div className="col-md-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">{stats?.totalProductViews || 0}</h5>
              <p className="card-text text-muted">Total Product Views</p>
            </div>
          </div>
        </div>
  
        {/* Top Product */}
        <div className="col-md-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">{stats?.topProduct?.name || 'N/A'}</h5>
              <p className="card-text text-muted">Top Product</p>
              <small className="text-muted">{stats?.topProduct?.views || 0} views</small>
            </div>
          </div>
        </div>
  
        {/* Recent Orders */}
        <div className="col-md-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body">
              <h5 className="card-title">{stats?.recentOrders || 0}</h5>
              <p className="card-text text-muted">Recent Orders</p>
              <small className="text-muted">Last 30 days</small>
            </div>
            </div>
          </div>
        </div>
  
      {/* Withdrawal Section - Moved up and styled */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
              <h5 className="mb-0">
                <i className="bi bi-wallet2 me-2"></i>
                Withdraw Your Earnings
              </h5>
            </div>
            <div className="card-body">
              <WithdrawalForm />
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Orders Section */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <i className="bi bi-clock-history me-2"></i>
            Recent Orders
          </h5>
        </div>
        <div className="card-body">
          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="border-bottom py-2">
              <p className="mb-1">
                <strong>Order #{order.id}</strong> - {order.product?.name}
              </p>
              <small className="text-muted">
                {new Date(order.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const getStockStatusBadge = (stockStatus) => {
    switch (stockStatus) {
      case 'OUT_OF_STOCK':
        return <span className="badge bg-danger">Out of Stock</span>;
      case 'LOW_STOCK':
        return <span className="badge bg-warning text-dark">Low Stock</span>;
      case 'IN_STOCK':
        return <span className="badge bg-success">In Stock</span>;
      default:
        return <span className="badge bg-secondary">Unknown</span>;
    }
  };

  const renderProductsSection = () => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>
          Products
          {notifications.products > 0 && (
            <span className="badge bg-danger ms-2">{notifications.products}</span>
          )}
        </h4>
      </div>
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">{editMode ? "Edit Product" : "Add New Product"}</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Product Name"
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Category"
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Price"
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Quantity"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                onChange={handleInputChange}
                  className="form-control"
                  placeholder="Description"
                  rows="3"
                  required
                />
              </div>

            <div className="mb-3">
              <label className="form-label">Product Image</label>
                <input
                  type="file"
                  name="image"
                onChange={handleInputChange}
                  className="form-control"
                  accept="image/*"
                  required={!editMode}
                />
              </div>

            <div className="mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="enableBidding"
                    name="enableBidding"
                    checked={formData.enableBidding}
                  onChange={handleInputChange}
                  />
                  <label className="form-check-label" htmlFor="enableBidding">
                    Enable Bidding
                  </label>
                </div>
              </div>

              {formData.enableBidding && (
              <div className="row">
                  <div className="col-md-6 mb-3">
                  <label className="form-label">Starting Bid</label>
                    <input
                      type="number"
                      name="startingBid"
                      value={formData.startingBid}
                    onChange={handleInputChange}
                      className="form-control"
                      placeholder="Starting Bid Amount"
                    required={formData.enableBidding}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                  <label className="form-label">Bid End Date</label>
                    <input
                      type="datetime-local"
                      name="bidEndDate"
                      value={formData.bidEndDate}
                    onChange={handleInputChange}
                      className="form-control"
                    required={formData.enableBidding}
                    />
                  </div>
            </div>
            )}

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn"
                style={{ backgroundColor: "#001f3f", color: "white" }}
              >
                {editMode ? "Update Product" : "Add Product"}
              </button>
              {editMode && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFormData({
                      name: "",
                      description: "",
                      price: "",
                      category: "",
                      quantity: "",
                      image: null,
                      enableBidding: false,
                      startingBid: "",
                      bidEndDate: ""
                    });
                    setEditMode(false);
                    setEditId(null);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-3 mb-2">
          <input
            type="text"
            placeholder="Search"
            className="form-control"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="col-md-3 mb-2">
          <select
            className="form-control"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="number"
            placeholder="Min Price"
            className="form-control"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          />
        </div>
        <div className="col-md-3 mb-2">
          <input
            type="number"
            placeholder="Max Price"
            className="form-control"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
        </div>
      </div>

      <div className="row">
        {products.map((product) => (
          <div key={product.id} className="col-md-6 col-lg-4 mb-4">
            <div className="card h-100">
              <div className="product-image-container" style={{ 
                height: "250px", 
                overflow: "hidden",
                position: "relative",
                backgroundColor: "#f8f9fa"
              }}>
                <img
                  src={getProductImageUrl(product.image)}
                  className="card-img-top"
                  alt={product.name}
                  style={{ 
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/uniket-icon.png";
                  }}
                />
              </div>
              <div className="card-body">
                <h5 className="card-title">{product.name}</h5>
                <p className="card-text">{product.description}</p>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-primary" style={{ color: '#001f3f' }}>GH₵{product.price}</span>
                  <span className="text-muted">Qty: {product.quantity}</span>
                </div>
                
                {/* Bidding Section */}
                {product.enableBidding && new Date() <= new Date(product.bidEndDate) ? (
                  <div className="card mb-3">
                    <div className="card-body">
                      <h6 className="card-title">Bidding Status</h6>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <small className="text-muted">Starting Bid:</small>
                          <h6 className="mb-0">GH₵{product.startingBid?.toLocaleString()}</h6>
                </div>
                        <div>
                          <small className="text-muted">Ends in:</small>
                          <h6 className="mb-0">{new Date(product.bidEndDate).toLocaleString()}</h6>
                      </div>
                      </div>
                      
                      {product.bids && product.bids.length > 0 && (
                        <div className="alert alert-info">
                          <small>
                            <i className="bi bi-gavel me-1"></i>
                            {product.bids.length} {product.bids.length === 1 ? 'bid' : 'bids'} received
                      </small>
                      </div>
                  )}

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleToggleBidding(product.id, false)}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Disable Bidding
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewBids(product.id)}
                        >
                          <i className="bi bi-list-ul me-1"></i>
                          View Bids
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card mb-3">
                    <div className="card-body">
                      <div className="form-check mb-3">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`enableBidding-${product.id}`}
                          checked={product.enableBidding}
                          onChange={(e) => handleToggleBidding(product.id, e.target.checked)}
                          style={{ accentColor: "#001f3f" }}
                        />
                        <label className="form-check-label" htmlFor={`enableBidding-${product.id}`}>
                          Enable Bidding
                        </label>
                      </div>
                      {product.enableBidding && (
                        <>
                      <div className="row">
                            <div className="col-md-6 mb-2">
                              <label className="form-label">Starting Bid</label>
                          <input
                            type="number"
                            className="form-control"
                                value={product.startingBid || ''}
                                onChange={(e) => {
                                  const updatedProduct = {
                                    ...product,
                                    startingBid: e.target.value
                                  };
                                  setProducts(prevProducts =>
                                    prevProducts.map(p =>
                                      p.id === product.id ? updatedProduct : p
                                    )
                                  );
                                }}
                                placeholder="Starting Bid Amount"
                            required
                          />
                    </div>
                            <div className="col-md-6 mb-2">
                              <label className="form-label">Bid End Date</label>
                          <input
                            type="datetime-local"
                            className="form-control"
                                value={product.bidEndDate ? new Date(product.bidEndDate).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const updatedProduct = {
                                    ...product,
                                    bidEndDate: e.target.value
                                  };
                                  setProducts(prevProducts =>
                                    prevProducts.map(p =>
                                      p.id === product.id ? updatedProduct : p
                                    )
                                  );
                                }}
                            required
                          />
                        </div>
                      </div>
                          <div className="d-flex gap-2 mt-3">
                        <button
                          className="btn btn-sm"
                              onClick={() => handleEnableBiddingConfirmed(product)}
                              disabled={!product.startingBid || !product.bidEndDate}
                          style={{ backgroundColor: "#001f3f", color: "white" }}
                        >
                          Enable Bidding
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleToggleBidding(product.id, false)}
                        >
                          Cancel
                        </button>
                    </div>
                        </>
                )}
              </div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary edit-button"
                    onClick={() => handleEdit(product)}
                    style={editButtonStyle}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderProfileSection = () => (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center mb-4">
          {vendor.image ? (
            <img
              src={getProductImageUrl(vendor.image)}
              alt="Profile"
              className="rounded-circle me-4"
              style={{ width: "100px", height: "100px", objectFit: "cover" }}
            />
          ) : (
            <div
              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-4"
              style={{ width: "100px", height: "100px" }}
            >
              <span className="text-white" style={{ fontSize: "2rem" }}>
                {vendor.name.charAt(0) || 'V'}
              </span>
            </div>
          )}
          <div>
            <h4>{vendor.name}</h4>
            <p className="text-muted mb-2">{vendor.email}</p>
            <input
              type="file"
              id="profileImage"
              accept="image/*"
              className="d-none"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) await updateProfileImage(file);
              }}
            />
            <label
              htmlFor="profileImage"
              className="btn btn-sm btn-outline-primary me-2"
            >
              <FaCamera className="me-1" /> Change Photo
            </label>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={vendor.name}
                onChange={(e) =>
                  setVendor({ ...vendor, name: e.target.value })
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={vendor.email}
                onChange={(e) =>
                  setVendor({ ...vendor, email: e.target.value })
                }
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-control"
                value={vendor.phone}
                onChange={(e) =>
                  setVendor({ ...vendor, phone: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <button
          className={`btn ${hasChanges ? "btn-primary" : "btn-secondary"}`}
          onClick={() => updateVendorProfile({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone
          })}
          disabled={!hasChanges}
        >
          {hasChanges ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success("You have been logged out successfully!");
      window.location.href = '/login';
    } else {
      toast.info("Logout cancelled.");
    }
  };

  const fetchPendingBids = async () => {
    try {
      const bidsResponse = await axios.get('/vendor/pending-bids');
      console.log("Fetched pending bids:", bidsResponse.data);
      setPendingBids(bidsResponse.data);
    } catch (err) {
      console.error("Error fetching pending bids:", err);
      toast.error("Failed to fetch pending bids");
    }
  };

  const handleBidStatus = async (bidId, status) => {
    try {
      await axios.patch(
        `/bids/${bidId}/status`,
        { status },
        { 
          headers: { 
            'Content-Type': 'application/json'
          } 
        }
      );
      toast.success(`Bid ${status.toLowerCase()}`);
      fetchPendingBids();
    } catch (err) {
      toast.error("Failed to update bid status");
    }
  };

  const renderPendingBids = () => (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Pending Bids</h5>
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={fetchPendingBids}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingBids.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    No pending bids
                  </td>
                </tr>
              ) : (
                pendingBids.map(bid => (
                  <tr key={bid.id}>
                    <td>{bid.product?.name || 'N/A'}</td>
                    <td>{bid.user?.name || 'N/A'}</td>
                    <td>GH₵{bid.amount?.toLocaleString()}</td>
                    <td>{new Date(bid.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-success btn-sm me-2"
                        onClick={() => handleBidStatus(bid.id, "APPROVED")}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleBidStatus(bid.id, "REJECTED")}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const markAllNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to update notifications');
      }

      await axios.put('/vendor/notifications/read', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Reset all notification counters
      setNotifications(prev => ({
        ...prev,
        products: 0,
        orders: 0,
        reviews: 0,
        bids: 0,
        items: prev.items.map(item => ({ ...item, read: true }))
      }));
      
      // Update review notifications
      setReviewNotifications([]);
      
      // Update all notifications
      setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.patch(`/notifications/${notificationId}/read`, {});
      
      // Update notification in items array
      setNotifications(prev => {
        const notification = prev.items.find(n => n.id === notificationId);
        if (notification) {
          // Decrement the counter for this notification type
          const category = getNotificationCategory(notification.type);
          return {
            ...prev,
            [category]: Math.max(0, prev[category] - 1),
            items: prev.items.map(n => 
              n.id === notificationId ? { ...n, read: true } : n
            )
          };
        }
        return prev;
      });
      
      // Update review notifications
      setReviewNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      
      // Update all notifications
      setAllNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleSectionClick = async (sectionId) => {
    try {
      setActiveSection(sectionId);
      
      // Mark notifications as read based on section
      let notificationType;
      switch (sectionId) {
        case 'products':
          notificationType = ['PRODUCT_APPROVED', 'PRODUCT_REJECTED'];
          break;
        case 'orders':
          notificationType = 'NEW_ORDER';
          break;
        case 'reviews':
          notificationType = 'REVIEW';
          break;
        case 'pending-bids':
          notificationType = ['NEW_BID', 'bid_status'];
          break;
        default:
          notificationType = null;
      }

      if (notificationType) {
        // Get notifications of the specific type
        const response = await axios.get('/notifications');
        const notificationsToMark = response.data.filter(notification => 
          Array.isArray(notificationType) 
            ? notificationType.includes(notification.type)
            : notification.type === notificationType
        );

        // Mark each notification as read
        await Promise.all(
          notificationsToMark.map(notification =>
            axios.put(`/notifications/${notification.id}/read`)
          )
        );
        
        // Update notifications state
        setNotifications(prev => {
          const category = sectionId === 'pending-bids' ? 'bids' : 
                         sectionId === 'support' ? 'support' : sectionId;
          
          return {
            ...prev,
            [category]: 0,
            items: prev.items ? prev.items.map(item => 
              Array.isArray(notificationType) 
                ? notificationType.includes(item.type) 
                  ? { ...item, read: true }
                  : item
                : item.type === notificationType
                  ? { ...item, read: true }
                  : item
            ) : []
          };
        });
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      // Don't show error toast to user as this is a background operation
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      let estimatedDeliveryTime = null;
      
      if (newStatus === 'shipped') {
        setEditingOrderId(orderId);
        setTempStatus(newStatus);
        return;
      }

      const response = await axios.put(`/orders/${orderId}/status`, {
        status: newStatus
      });
      
      if (response.data) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchVendorOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.error || 'Failed to update order status');
    }
  };

  const handleDeliveryDateSubmit = async (orderId) => {
    try {
      if (!tempEstimatedDelivery) {
        toast.error('Please select an estimated delivery date');
        return;
      }

      const response = await axios.put(`/orders/${orderId}/status`, {
        status: tempStatus,
        estimatedDeliveryTime: tempEstimatedDelivery
      });
      
      if (response.data) {
        toast.success(`Order status updated to ${tempStatus}`);
        setEditingOrderId(null);
        setTempStatus('');
        setTempEstimatedDelivery('');
        fetchVendorOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.error || 'Failed to update order status');
    }
  };

  const handleBidModalSubmit = async (product) => {
    // If product is passed, use its values, otherwise use bidDetails state
    const startingBid = product ? product.startingBid : bidDetails.startingBid;
    const bidEndDate = product ? product.bidEndDate : bidDetails.bidEndDate;
    const productId = product ? product.id : selectedProduct.id;

    if (!startingBid || !bidEndDate) {
      toast.error('Please fill in all bid details');
      return;
    }

    try {
      // Ensure the date is properly formatted for the backend
      const parsedDate = new Date(bidEndDate);
      if (isNaN(parsedDate.getTime())) {
        toast.error('Invalid date format');
        return;
      }

      if (parsedDate <= new Date()) {
        toast.error('Bid end date must be in the future');
        return;
      }

      // Format the data for the backend
      const data = {
        enableBidding: true,
        startingBid: Number(startingBid),
        bidEndDate: parsedDate.toISOString()
      };

      await axios.put(`/vendor/products/${productId}/toggle-bidding`, data);
      
      toast.success('Bidding enabled successfully');
      
      // Reset states
      if (!product) {
        setSelectedProduct(null);
        setBidDetails({
          startingBid: "",
          bidEndDate: ""
        });
      }
      
      // Refresh the products list
      await fetchVendorProducts();
    } catch (error) {
      console.error('Error enabling bidding:', error);
      toast.error(error.response?.data?.error || 'Failed to enable bidding');
    }
  };

  const handleToggleBidding = async (productId, enableBidding, updatedProduct = null) => {
    try {
      if (!enableBidding) {
        const confirmDisable = window.confirm('Are you sure you want to disable bidding for this product?');
        if (!confirmDisable) return;
        const data = {
          enableBidding: false,
          startingBid: null,
          bidEndDate: null
        };
        await axios.put(`/vendor/products/${productId}/toggle-bidding`, data);
        toast.success('Bidding disabled');
        await fetchVendorProducts();
        return;
      }
      // Do not enable bidding automatically. Only show the form for input.
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, enableBidding: true }
            : product
        )
      );
    } catch (error) {
      console.error('Error toggling bidding:', error);
      toast.error(error.response?.data?.error || 'Failed to toggle bidding');
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, enableBidding: false }
            : product
        )
      );
      await fetchVendorProducts();
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <button
            className="btn btn-dark d-md-none mt-3"
            onClick={() =>
              document.getElementById("sidebar").classList.toggle("d-none")
            }
          >
            ☰ Menu
          </button>
        </div>

        <div className="d-flex">
          {/* Sidebar */}
          <div
            id="sidebar"
            className="text-white p-4 d-flex flex-column"
            style={{ backgroundColor: "#001f3f", width: "250px", minHeight: "100vh" }}
          >
            {/* Vendor Profile Section */}
            <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
              <div className="me-3">
                {vendor.image ? (
                  <img
                    src={getProductImageUrl(vendor.image)}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ width: "50px", height: "50px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                    style={{ width: "50px", height: "50px" }}
                  >
                    <span className="text-white">
                      {vendor.name?.charAt(0) || 'V'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h6 className="mb-0">{vendor.name || 'Vendor'}</h6>
                <small className="text-muted">{vendor.email}</small>
                <div className="mt-1">
                  <button
                    className="btn btn-sm btn-outline-light me-1"
                    onClick={() => setActiveSection('profile')}
                  >
                    <FaCog />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <h3 className="mb-4">Vendor Dashboard</h3>
            <ul className="nav flex-column flex-grow-1">
              {[
                { id: "dashboard", label: "Dashboard" },
                { id: "products", label: "Products", count: notifications.products },
                { id: "orders", label: "Orders", count: notifications.orders },
                { id: "reviews", label: "Reviews", count: notifications.reviews },
                { id: "pending-bids", label: "Pending Bids", count: notifications.bids },
                { id: "support", label: "Support Chat" },
                { id: "profile", label: "My Profile" },
                { id: "all-notifications", label: "All Notifications" },
              ].map((item) => (
                <li className="nav-item" key={item.id}>
                  <button
                    className={`nav-link text-white text-start w-100 ${
                      activeSection === item.id ? "fw-bold" : ""
                    }`}
                    onClick={() => handleSectionClick(item.id)}
                  >
                    {item.label}
                    {item.count > 0 && (
                      <span className="badge bg-danger ms-1">{item.count}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Main Content */}
          <div className="flex-grow-1 p-4">
            <div className="d-flex justify-content-end align-items-center mb-3" style={{ position: "relative" }}>
              <div className="position-relative">
              <button
                className="btn notification-btn rounded-circle"
                style={{ fontSize: "1.5rem" }}
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <FaBell />
                {notifications.products > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {notifications.products}
                  </span>
                )}
                </button>
                {showNotifications && (
                  <div 
                    className="position-absolute end-0 mt-2 bg-white rounded shadow-lg"
                    style={{ 
                      width: '350px', 
                      maxHeight: '500px', 
                      overflowY: 'auto',
                      zIndex: 1000
                    }}
                  >
                    <div className="p-3 border-bottom" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Notifications</h6>
                        <div>
                          <button 
                            className="btn btn-sm btn-link text-decoration-none me-2"
                            style={{ color: 'white' }}
                            onClick={markAllNotificationsAsRead}
                          >
                            Mark All as Read
                          </button>
                          <button 
                            className="btn btn-sm btn-link text-decoration-none"
                            style={{ color: 'white' }}
                            onClick={() => setShowNotifications(false)}
                          >
                            <i className="bi bi-x-lg"></i>
              </button>
                        </div>
                      </div>
                    </div>
                    <div className="notification-list">
                      {notifications.items.length === 0 ? (
                        <div className="text-center text-muted p-3">
                          No new notifications
                        </div>
                      ) : (
                        notifications.items.map(notification => (
                          <div 
                            key={notification.id} 
                            className="notification-item p-3 border-bottom bg-light"
                            onClick={() => markNotificationAsRead(notification.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <p className="mb-1 small">{notification.message}</p>
                                <small className="text-muted">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </small>
                              </div>
                                <span className="badge" style={{ backgroundColor: '#001f3f' }}>New</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {activeSection === "dashboard" && renderDashboardSection()}
            {activeSection === "products" && renderProductsSection()}
            {activeSection === "orders" && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4>
                    Orders
                    {notifications.orders > 0 && (
                      <span className="badge bg-danger ms-2">{notifications.orders}</span>
                    )}
                  </h4>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Product</th>
                        <th>Date</th>
                        <th>Payment Method</th>
                        <th>Payment Reference</th>
                        <th>Pickup Point</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="text-center">Loading orders...</td>
                        </tr>
                      ) : orders.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center">No orders found</td>
                        </tr>
                      ) : (
                        orders.map(order => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td>
                              {order.products && order.products.length > 0 ? (
                                order.products.map((product, index) => (
                                  <div key={product.id} className={index > 0 ? 'mt-2' : ''}>
                                    <div className="fw-bold">{product.name}</div>
                                    <small className="text-muted">
                                      Quantity: {product.quantity} × GH₵{product.price}
                                    </small>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted">No products found</span>
                              )}
                            </td>
                            <td>{new Date(order.createdAt).toLocaleString()}</td>
                            <td>{order.paymentMethod}</td>
                            <td>{order.paymentRef || 'N/A'}</td>
                            <td>
                              {order.pickupPoint ? (
                                <div>
                                  <div className="fw-bold">{order.pickupPoint.school}</div>
                                  <div>{order.pickupPoint.department}</div>
                                  <small className="text-muted">
                                    {order.pickupPoint.location}, {order.pickupPoint.region}
                                  </small>
                                </div>
                              ) : (
                                <span className="text-muted">No pickup point selected</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge bg-${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                              {order.estimatedDeliveryTime && (
                                <small className="d-block text-muted mt-1">
                                  Est. Delivery: {new Date(order.estimatedDeliveryTime).toLocaleDateString()}
                                </small>
                              )}
                            </td>
                            <td>
                              {editingOrderId === order.id ? (
                                <div>
                                  <input
                                    type="datetime-local"
                                    className="form-control form-control-sm mb-2"
                                    value={tempEstimatedDelivery}
                                    onChange={(e) => setTempEstimatedDelivery(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                  />
                                  <div className="d-flex gap-2">
                                    <button 
                                      className="btn btn-sm btn-success" 
                                      onClick={() => handleDeliveryDateSubmit(order.id)}
                                    >
                                      Save
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-secondary" 
                                      onClick={() => {
                                        setEditingOrderId(null);
                                        setTempStatus('');
                                        setTempEstimatedDelivery('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <select
                                  className="form-select form-select-sm"
                                  value={order.status || ""}
                                  onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                >
                                  <option value="">Pending</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeSection === "profile" && renderProfileSection()}
            {activeSection === "pending-bids" && renderPendingBids()}
            {activeSection === "support" && (
              <div className="card">
                <div className="card-body">
                  <h4 className="mb-4">Support Chat</h4>
                  <VendorSupportChat />
                </div>
              </div>
            )}
            {activeSection === "all-notifications" && (
              <div className="card">
                <div className="card-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                  <h5 className="mb-0">All Notifications</h5>
                </div>
                <div className="card-body p-0">
                  {allNotifications.length === 0 ? (
                    <div className="text-center text-muted p-4">
                      No notifications
                    </div>
                  ) : (
                    allNotifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`p-3 border-bottom ${!notification.read ? 'bg-light' : ''}`}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <p className="mb-1">{notification.message}</p>
                            <small className="text-muted">
                              {new Date(notification.createdAt).toLocaleString()}
                            </small>
                          </div>
                          {!notification.read && (
                            <span className="badge" style={{ backgroundColor: '#001f3f' }}>New</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeSection === "reviews" && (
              <div className="card">
                <div className="card-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                  <h5 className="mb-0">Product Reviews</h5>
                </div>
                <div className="card-body">
                  {productReviews.length === 0 ? (
                    <div className="text-center text-muted p-4">
                      No reviews yet
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Customer</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productReviews.map(review => (
                            <tr key={review.id} className={review.isNew ? 'table-warning' : ''}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {review.product?.image && (
                                    <img 
                                      src={getProductImageUrl(review.product.image)} 
                                      alt={review.product.name}
                                      className="img-fluid rounded me-2"
                                      style={{ maxWidth: '100px' }}
                                    />
                                  )}
                                  <span>{review.product?.name}</span>
                                </div>
                              </td>
                              <td>{review.user?.name}</td>
                              <td>
                                <div className="text-warning">
                                  {[...Array(review.rating)].map((_, i) => (
                                    <i key={i} className="bi bi-star-fill"></i>
                                  ))}
                                </div>
                              </td>
                              <td>{review.comment}</td>
                              <td>{new Date(review.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="deleteModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Delete</h5>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this product?</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Settings Modal */}
      <div className="modal fade" id="bidSettingsModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Set Bidding Details</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Starting Bid Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={bidDetails.startingBid}
                  onChange={(e) => setBidDetails(prev => ({ ...prev, startingBid: e.target.value }))}
                  placeholder="Enter starting bid amount"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Bid End Date and Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={bidDetails.bidEndDate}
                  onChange={(e) => setBidDetails(prev => ({ ...prev, bidEndDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBidModalSubmit}
              >
                Enable Bidding
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;