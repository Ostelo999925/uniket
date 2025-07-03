import React, { useState, useEffect } from 'react';
import axios from '../api/axios'; // Use the configured axios instance
import { toast } from 'react-toastify';
import { FaBox, FaUsers, FaShoppingCart, FaStore, FaMapMarkerAlt, FaChartBar, FaTrophy, FaBell, FaUserTie } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, LabelList } from 'recharts';
import './AdminDashboard.css';
import VendorLeaderboard from '../components/VendorLeaderboard';
import CustomerReport from '../components/CustomerReport';
import AdminNotifications from '../components/AdminNotifications';
import { getProductImageUrl } from '../utils/imageUtils';
import PickupManagersSection from '../components/PickupManagersSection';

const AdminDashboard = () => {
  // State for different sections
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [rejectingProductId, setRejectingProductId] = useState(null);
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  
  // Overview stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    totalVendors: 0,
    totalOrders: 0,
    totalPickupPoints: 0
  });

  // Products state - Initialize with empty arrays
  const [products, setProducts] = useState({
    pending: [],
    approved: [],
    rejected: []
  });

  // Initialize other states with empty arrays
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [editingPickupPoint, setEditingPickupPoint] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorStats, setVendorStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Product filter state
  const [productFilter, setProductFilter] = useState('all');

  // Enable products state
  const [enabledProducts, setEnabledProducts] = useState({});

  // Show graph view state
  const [showGraphView, setShowGraphView] = useState(false);

  // Order details state
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Add getStatusBadgeColor function
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/admin/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Calculate notification counts
  const notificationCounts = {
    products: notifications.filter(n => n.type === 'PRODUCT_APPROVED' || n.type === 'PRODUCT_REJECTED').length,
    vendors: notifications.filter(n => n.type === 'NEW_VENDOR').length,
    orders: notifications.filter(n => n.type === 'NEW_ORDER').length,
    reports: notifications.filter(n => n.type === 'NEW_REPORT' || n.type === 'FRAUD_ALERT').length,
    total: notifications.length
  };

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token || !user) {
          toast.error('Please log in to access the admin dashboard');
          window.location.href = '/login';
          return;
        }

        if (user.role !== 'admin') {
          toast.error('You do not have permission to access the admin dashboard');
          window.location.href = '/';
          return;
        }

        // Fetch notifications only if not on page refresh
        if (!sessionStorage.getItem('pageRefreshed')) {
          await fetchNotifications();
          sessionStorage.setItem('pageRefreshed', 'true');
        }

        // Fetch rejection reasons
        const reasonsRes = await axios.get('/admin/rejection-reasons');
        setRejectionReasons(reasonsRes.data);

        // Fetch stats
        const statsRes = await axios.get('/admin/dashboard');
        setStats(statsRes.data);

        // Fetch products from admin endpoint
        const productsRes = await axios.get('/admin/products');
        const productsData = {
          pending: Array.isArray(productsRes.data.pending) ? productsRes.data.pending : [],
          approved: Array.isArray(productsRes.data.approved) ? productsRes.data.approved : [],
          rejected: Array.isArray(productsRes.data.rejected) ? productsRes.data.rejected : []
        };
        setProducts(productsData);

        // Fetch vendors
        const vendorsRes = await axios.get('/admin/vendors');
        setVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);

        // Fetch orders
        const ordersRes = await axios.get('/admin/orders');
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);

        // Fetch pickup points
        const pickupPointsRes = await axios.get('/pickup');
        setPickupPoints(Array.isArray(pickupPointsRes.data) ? pickupPointsRes.data : []);

      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        } else {
        toast.error(err.response?.data?.error || 'Failed to fetch dashboard data');
        }
        // Initialize all states with empty arrays in case of error
        setProducts({ pending: [], approved: [], rejected: [] });
        setVendors([]);
        setOrders([]);
        setPickupPoints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Product management handlers
  const handleApproveProduct = async (productId) => {
    try {
      const response = await axios.put(`/admin/products/${productId}/approve`);
      
      // Update the products state by moving the approved product from pending to approved
      setProducts(prevProducts => {
        const product = prevProducts.pending.find(p => p.id === productId);
        if (!product) return prevProducts;

        return {
          ...prevProducts,
          pending: prevProducts.pending.filter(p => p.id !== productId),
          approved: [...prevProducts.approved, { ...product, status: 'APPROVED' }]
        };
      });
      
      toast.success('Product approved successfully');
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error(error.response?.data?.error || 'Failed to approve product');
    }
  };

  const handleRejectProduct = async (productId) => {
    if (!selectedReason) {
      toast.error('Please select a rejection reason');
      return;
    }

    try {
      await axios.put(`/admin/products/${productId}/reject`, { reason: selectedReason });
      
      // Update products state
      setProducts(prevProducts => {
        const product = prevProducts.pending.find(p => p.id === productId);
        return {
          ...prevProducts,
          pending: prevProducts.pending.filter(p => p.id !== productId),
          rejected: [...prevProducts.rejected, { ...product, status: 'REJECTED' }]
        };
      });
      
      setRejectingProductId(null);
      setSelectedReason('');
      toast.success('Product rejected successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject product');
    }
  };

  // Pickup point handlers
  const handleAddPickupPoint = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      region: formData.get('region'),
      school: formData.get('school'),
      location: formData.get('location'),
      phone: formData.get('phone')
    };

    try {
      const response = await axios.post('/pickup', data);
      setPickupPoints([...pickupPoints, response.data]);
      toast.success('Pickup point added successfully');
      e.target.reset();
    } catch (err) {
      console.error('Error adding pickup point:', err);
      toast.error(err.response?.data?.error || 'Failed to add pickup point');
    }
  };

  const handleEditPickupPoint = (point) => {
    setEditingPickupPoint(point);
  };

  const handleUpdatePickupPoint = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      region: formData.get('region'),
      school: formData.get('school'),
      location: formData.get('location'),
      phone: formData.get('phone'),
      isActive: editingPickupPoint.isActive
    };

    try {
      const response = await axios.put(`/pickup/${editingPickupPoint.id}`, data);
      setPickupPoints(pickupPoints.map(p => 
        p.id === editingPickupPoint.id ? response.data : p
      ));
      toast.success('Pickup point updated successfully');
      setEditingPickupPoint(null);
    } catch (err) {
      console.error('Error updating pickup point:', err);
      toast.error(err.response?.data?.error || 'Failed to update pickup point');
    }
  };

  const handleCancelEdit = () => {
    setEditingPickupPoint(null);
  };

  const handleDeletePickupPoint = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pickup point?')) {
      return;
    }

    try {
      await axios.delete(`/pickup/${id}`);
      setPickupPoints(pickupPoints.filter(p => p.id !== id));
      toast.success('Pickup point deleted successfully');
    } catch (err) {
      console.error('Error deleting pickup point:', err);
      toast.error(err.response?.data?.error || 'Failed to delete pickup point');
    }
  };

  // Add this new function to filter products
  const getFilteredProducts = () => {
    let filtered = [];
    
    switch (productFilter) {
      case 'pending':
        filtered = products.pending || [];
        break;
      case 'approved':
        filtered = products.approved || [];
        break;
      case 'rejected':
        filtered = products.rejected || [];
        break;
      default:
        filtered = [
          ...(products.pending || []),
          ...(products.approved || []),
          ...(products.rejected || [])
        ];
    }

    return filtered;
  };

  // Add this new function to handle enable checkbox
  const handleEnableToggle = (productId) => {
    setEnabledProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Products Section - Updated with Grid Layout
  const renderProductsSection = () => {
    const filteredProducts = getFilteredProducts();

      return (
      <div className="products-section">
        <div className="section-header">
          <h2>
            <FaBox className="icon" /> Products
          </h2>
          <div className="filter-buttons" style={{ 
            display: 'flex', 
            gap: '10px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <button
              className={`filter-btn ${productFilter === 'all' ? 'active' : ''}`}
              onClick={() => setProductFilter('all')}
              style={{
                backgroundColor: productFilter === 'all' ? '#001f3f' : 'white',
                color: productFilter === 'all' ? 'white' : '#001f3f',
                border: '1px solid #001f3f',
                transition: 'all 0.3s ease',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (productFilter !== 'all') {
                  e.target.style.backgroundColor = '#001f3f';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (productFilter !== 'all') {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#001f3f';
                }
              }}
            >
              All
            </button>
            <button
              className={`filter-btn ${productFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setProductFilter('pending')}
              style={{
                backgroundColor: productFilter === 'pending' ? '#001f3f' : 'white',
                color: productFilter === 'pending' ? 'white' : '#001f3f',
                border: '1px solid #001f3f',
                transition: 'all 0.3s ease',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (productFilter !== 'pending') {
                  e.target.style.backgroundColor = '#001f3f';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (productFilter !== 'pending') {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#001f3f';
                }
              }}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${productFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setProductFilter('approved')}
              style={{
                backgroundColor: productFilter === 'approved' ? '#001f3f' : 'white',
                color: productFilter === 'approved' ? 'white' : '#001f3f',
                border: '1px solid #001f3f',
                transition: 'all 0.3s ease',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (productFilter !== 'approved') {
                  e.target.style.backgroundColor = '#001f3f';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (productFilter !== 'approved') {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#001f3f';
                }
              }}
            >
              Approved
            </button>
            <button
              className={`filter-btn ${productFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setProductFilter('rejected')}
              style={{
                backgroundColor: productFilter === 'rejected' ? '#001f3f' : 'white',
                color: productFilter === 'rejected' ? 'white' : '#001f3f',
                border: '1px solid #001f3f',
                transition: 'all 0.3s ease',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (productFilter !== 'rejected') {
                  e.target.style.backgroundColor = '#001f3f';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (productFilter !== 'rejected') {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#001f3f';
                }
              }}
            >
              Rejected
            </button>
        </div>
        </div>

        <div className="container-fluid">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">
                {productFilter === 'all' ? 'No products found' :
                 productFilter === 'pending' ? 'No pending products' :
                 productFilter === 'approved' ? 'No approved products' :
                 'No rejected products'}
              </p>
            </div>
          ) : (
            <div className="row">
              {filteredProducts.map(product => (
                <div key={product.id} className="col-md-4 mb-4">
                  <div className="card h-100" style={{ 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease',
                    border: 'none'
                  }}>
                    <div style={{ 
                      height: '200px', 
                      overflow: 'hidden',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {product.image ? (
                    <img 
                      src={getProductImageUrl(product.image)} 
                      className="card-img-top" 
                      alt={product.name}
                          style={{ 
                            height: '100%',
                            width: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <FaBox style={{ fontSize: '3rem', color: '#dee2e6' }} />
                        </div>
                      )}
                    </div>
                  <div className="card-body">
                    <h5 className="card-title">{product.name}</h5>
                    <p className="card-text">{product.description}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="h5 mb-0">GH₵{product.price}</span>
                      <span className={`badge ${
                        product.status === 'PENDING' ? 'bg-warning text-dark' :
                        product.status === 'APPROVED' ? 'bg-success' :
                        'bg-danger'
                      }`}>
                        {product.status}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="mb-1"><small>ID: {product.id}</small></p>
                      <p className="mb-1"><small>Vendor: {product.vendor?.name || 'N/A'}</small></p>
                      <p className="mb-1"><small>Category: {product.category || 'N/A'}</small></p>
                      <p className="mb-1"><small>Quantity: {product.quantity || 0}</small></p>
                      {product.status === 'REJECTED' && product.rejectedReason && (
                        <p className="mb-1 text-danger"><small>Reason: {product.rejectedReason}</small></p>
                      )}
                    </div>
                      {product.status === 'PENDING' && (
                    <div className="mt-3">
                        <div className="d-flex gap-2">
                          <button
                              className="btn"
                            onClick={() => handleApproveProduct(product.id)}
                              style={{
                                backgroundColor: '#001f3f',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#003366';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#001f3f';
                              }}
                          >
                            Approve
                          </button>
                              <button
                              className="btn btn-danger"
                                onClick={() => handleRejectProduct(product.id)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              Reject
                              </button>
                            </div>
                          <div className="form-check mt-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`enable-${product.id}`}
                              checked={enabledProducts[product.id] || false}
                              onChange={() => handleEnableToggle(product.id)}
                              style={{
                                cursor: 'pointer'
                              }}
                            />
                            <label 
                              className="form-check-label" 
                              htmlFor={`enable-${product.id}`}
                              style={{
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              Re-enable actions
                            </label>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    );
  };

  // Navigation handler
  const handleTabChange = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
    
    if (tab === 'products') {
      // Clear product notifications when Products tab is clicked
      setNotifications([]);
    }
  };

  // Fetch vendor stats
  const fetchVendorStats = async (vendorId) => {
    try {
      setLoadingStats(true);
      const response = await axios.get(`/admin/vendors/${vendorId}/stats`);
      const stats = response.data;

      // Ensure all values are properly formatted and have fallbacks
      setVendorStats({
        totalProducts: parseInt(stats.totalProducts) || 0,
        totalSales: parseInt(stats.totalSales) || 0,
        totalRevenue: parseFloat(stats.totalRevenue) || 0,
        conversionRate: parseFloat(stats.conversionRate) || 0,
        averageRating: parseFloat(stats.averageRating) || 0,
        viewsPercentage: parseFloat(stats.totalProductViews) || 0,
        satisfactionRate: parseFloat(stats.satisfactionRate) || 0,
        topProducts: Array.isArray(stats.topProducts) ? stats.topProducts.map(product => ({
          ...product,
          views: parseInt(product.views) || 0,
          sales: parseInt(product.sales) || 0,
          revenue: parseFloat(product.revenue) || 0,
          rating: parseFloat(product.rating) || 0,
          price: parseFloat(product.price) || 0
        })) : [],
        recentOrders: Array.isArray(stats.recentOrders) ? stats.recentOrders.map(order => ({
          ...order,
          amount: parseFloat(order.amount) || 0,
          date: order.date || new Date().toISOString()
        })) : [],
        salesOverTime: Array.isArray(stats.salesOverTime) ? stats.salesOverTime.map(sale => ({
          ...sale,
          sales: parseInt(sale.sales) || 0,
          revenue: parseFloat(sale.revenue) || 0
        })) : []
      });

      console.log('Vendor stats loaded:', stats); // Debug log
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      toast.error('Failed to fetch vendor stats');
      setVendorStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  // Handle vendor click
  const handleVendorClick = async (vendor) => {
    setSelectedVendor(vendor);
    await fetchVendorStats(vendor.id);
  };

  const handleSectionClick = async (sectionId) => {
    setActiveTab(sectionId);
    
    // Mark notifications as read based on the section
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let endpoint = '';
      switch (sectionId) {
        case 'products':
          endpoint = '/admin/notifications/products/read';
          break;
        case 'vendors':
          endpoint = '/admin/notifications/vendors/read';
          break;
        case 'orders':
          endpoint = '/admin/notifications/orders/read';
          break;
        case 'reports':
          endpoint = '/admin/notifications/reports/read';
          break;
        default:
          return;
      }

      if (endpoint) {
        await axios.put(endpoint, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Update local state to clear the notification count
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  if (loading) return (
    <div className="loading-spinner"></div>
  );

  return (
    <div className="admin-dashboard">
      <style>{`
        .notification-badge {
          background-color: #ff4444;
          color: white;
          border-radius: 50%;
          padding: 2px 6px;
          font-size: 12px;
          margin-left: 8px;
          position: relative;
          top: -8px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          margin: 0;
        }

        .section-header .icon {
          margin-right: 10px;
        }
      `}</style>
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'overview')}
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <FaChartBar />
            Overview
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'products')}
            className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
          >
            <FaBox />
            Products
            {notificationCounts.products > 0 && (
              <span className="notification-badge">{notificationCounts.products}</span>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'vendors')}
            className={`admin-nav-item ${activeTab === 'vendors' ? 'active' : ''}`}
          >
            <FaStore />
            Vendors
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'orders')}
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <FaShoppingCart />
            Orders
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'pickup-points')}
            className={`admin-nav-item ${activeTab === 'pickup-points' ? 'active' : ''}`}
          >
            <FaMapMarkerAlt />
            Pickup Points
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'pickup-managers')}
            className={`admin-nav-item ${activeTab === 'pickup-managers' ? 'active' : ''}`}
          >
            <FaUserTie />
            Pickup Manager
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'leaderboard')}
            className={`admin-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
          >
            <FaTrophy />
            Vendor Leaderboard
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'customerReport')}
            className={`admin-nav-item ${activeTab === 'customerReport' ? 'active' : ''}`}
          >
            <div className="flex items-center gap-3">
              <i className="bi bi-flag text-xl"></i>
              <span>Customer Reports</span>
            </div>
          </button>
          <button
            type="button"
            onClick={(e) => handleTabChange(e, 'notifications')}
            className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
          >
            <FaBell />
            Notifications
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        {activeTab === 'overview' && (
          <div>
            <div className="admin-header">
              <h1>Dashboard Overview</h1>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Products</h3>
                <div className="stat-value">{stats.totalProducts}</div>
                <div className="stat-subtitle">{stats.pendingProducts} pending approval</div>
              </div>
              <div className="stat-card">
                <h3>Total Vendors</h3>
                <div className="stat-value">{stats.totalVendors}</div>
              </div>
              <div className="stat-card">
                <h3>Total Orders</h3>
                <div className="stat-value">{stats.totalOrders}</div>
                <div className="stat-subtitle">{stats.totalSales} items sold</div>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <div className="stat-value">GH₵{stats.totalRevenue?.toLocaleString()}</div>
                <div className="stat-subtitle">From {stats.totalSales} sales</div>
              </div>
              <div className="stat-card">
                <h3>Customer Satisfaction</h3>
                <div className="stat-value">{stats.customerSatisfaction?.toFixed(1)}/5</div>
                <div className="stat-subtitle">Average Rating</div>
              </div>
            </div>

            {/* Top Products Section */}
            <div className="row mt-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Top Performing Products</h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Views</th>
                            <th>Sales</th>
                            <th>Revenue</th>
                            <th>Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topProducts?.map(product => (
                            <tr key={product.id}>
                              <td>
                                <div>
                                  <div>{product.name}</div>
                                  <small className="text-muted">by {product.vendor?.name || 'Unknown Vendor'}</small>
                                </div>
                              </td>
                              <td>{product.views || 0}</td>
                              <td>{product.sales || 0}</td>
                              <td>GH₵{product.revenue?.toLocaleString() || '0'}</td>
                              <td>
                                <div className="text-warning">
                                  {[...Array(5)].map((_, i) => (
                                    <i key={i} className={`bi ${i < Math.round(product.rating || 0) ? 'bi-star-fill' : 'bi-star'}`}></i>
                                  ))}
                                  <small className="text-muted ms-1">({(product.rating || 0).toFixed(1)})</small>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && renderProductsSection()}

        {activeTab === 'vendors' && (
          <div className="vendors-section">
            <div className="section-header">
              <h2>
                <FaStore className="icon" /> Vendors
                {notificationCounts.vendors > 0 && (
                  <span className="notification-badge">{notificationCounts.vendors}</span>
                )}
              </h2>
            </div>
            <div className="container-fluid">
              {selectedVendor ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button 
                      className="btn btn-outline-secondary"
                    onClick={() => {
                      setSelectedVendor(null);
                      setVendorStats(null);
                    }}
                      style={{ 
                        transition: 'background-color 0.3s ease',
                        borderColor: "#001f3f",
                        color: "#001f3f"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#001f3f";
                        e.target.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "#001f3f";
                      }}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Vendors
                  </button>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '0' }}>
                      <input
                        type="checkbox"
                        checked={showGraphView}
                        onChange={() => setShowGraphView(!showGraphView)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <FaChartBar style={{ marginRight: '0.3rem' }} />
                      Detailed Graph View
                    </label>
                  </div>

                  {loadingStats ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading vendor statistics...</p>
                    </div>
                  ) : vendorStats ? (
                    <>
                  {showGraphView ? (
                    <div className="row mb-4">
                      <div className="col-12 mb-4">
                            <div className="card">
                              <div className="card-header">
                                <h5 className="mb-0">Sales & Revenue Over Time (Last 12 Months)</h5>
                              </div>
                              <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                                  <LineChart data={vendorStats?.salesOverTime || []}>
                            <XAxis dataKey="date" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#800080" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#2ecc40" />
                            <Tooltip />
                            <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#800080" name="Sales" strokeWidth={2} />
                                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#2ecc40" name="Revenue" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                            </div>
                          </div>

                      <div className="col-12 mb-4">
                            <div className="card">
                              <div className="card-header">
                                <h5 className="mb-0">Top Products by Revenue</h5>
                              </div>
                              <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={vendorStats?.topProducts || []}>
                            <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#2ecc40" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#800080" />
                            <Tooltip />
                            <Legend />
                                    <Bar yAxisId="left" dataKey="revenue" fill="#2ecc40" name="Revenue" />
                                    <Bar yAxisId="right" dataKey="sales" fill="#800080" name="Sales" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                            </div>
                          </div>

                      <div className="col-md-6 mb-4">
                            <div className="card">
                              <div className="card-header">
                                <h5 className="mb-0">Customer Satisfaction</h5>
                              </div>
                              <div className="card-body">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                        { name: 'Satisfied (4★+)', value: Number(vendorStats?.satisfactionRate || 0) },
                                        { name: 'Other', value: 100 - Number(vendorStats?.satisfactionRate || 0) }
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              <Cell key="satisfied" fill="#2ecc40" />
                              <Cell key="other" fill="#ff4136" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                            </div>
                          </div>

                      <div className="col-md-6 mb-4">
                            <div className="card">
                              <div className="card-header">
                                <h5 className="mb-0">Conversion Rate</h5>
                              </div>
                              <div className="card-body">
                        <ResponsiveContainer width="100%" height={250}>
                                  <BarChart data={[{ name: 'Conversion', value: Number(vendorStats?.conversionRate || 0) }]}> 
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                                    <Bar dataKey="value" fill="#0074D9">
                                      <LabelList dataKey="value" position="top" formatter={(value) => `${value}%`} />
                                    </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                              </div>
                            </div>
                      </div>
                    </div>
                  ) : (
                        <>
                  <div className="card mb-4">
                    <div className="card-body">
                              <div className="row">
                                <div className="col-md-3">
                                  <div className="text-center mb-4">
                        {selectedVendor.image ? (
                          <img
                            src={selectedVendor.image}
                            alt="Profile"
                                        className="rounded-circle mb-3"
                                        style={{ width: "150px", height: "150px", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3"
                                        style={{ width: "150px", height: "150px" }}
                          >
                                        <span className="text-white" style={{ fontSize: "3rem" }}>
                              {selectedVendor.name.charAt(0)}
                            </span>
                          </div>
                        )}
                          <h4>{selectedVendor.name}</h4>
                                    <p className="text-muted mb-2">{selectedVendor.email}</p>
                                    <span className={`badge ${selectedVendor.isActive ? 'bg-success' : 'bg-danger'}`}>
                                      {selectedVendor.isActive ? 'Active' : 'Inactive'}
                                    </span>
                        </div>
                      </div>
                                <div className="col-md-9">
                                  <div className="row">
                                    <div className="col-md-6">
                                      <h5 className="mb-3">Vendor Information</h5>
                                      <div className="mb-3">
                                        <label className="text-muted d-block">Phone</label>
                                        <p className="mb-2">{selectedVendor.phone || 'N/A'}</p>
                                      </div>
                                      <div className="mb-3">
                                        <label className="text-muted d-block">Location</label>
                                        <p className="mb-2">{selectedVendor.location || 'N/A'}</p>
                                      </div>
                                      <div className="mb-3">
                                        <label className="text-muted d-block">Joined Date</label>
                                        <p className="mb-2">{new Date(selectedVendor.createdAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                    <div className="col-md-6">
                                      <h5 className="mb-3">Account Status</h5>
                                      <div className="mb-3">
                                        <label className="text-muted d-block">Verification Status</label>
                                        <p className="mb-2">
                                          <span className={`badge ${selectedVendor.isVerified ? 'bg-success' : 'bg-warning'}`}>
                                            {selectedVendor.isVerified ? 'Verified' : 'Pending Verification'}
                                          </span>
                                        </p>
                                      </div>
                                      <div className="mb-3">
                                        <label className="text-muted d-block">Last Login</label>
                                        <p className="mb-2">{selectedVendor.lastLogin ? new Date(selectedVendor.lastLogin).toLocaleString() : 'N/A'}</p>
                                      </div>
                                      <div className="mb-3">
                                        <label className="text-muted d-block">Account Type</label>
                                        <p className="mb-2">
                                          <span className="badge bg-info">
                                            {selectedVendor.role === 'vendor' ? 'Business (Vendor/Seller)' : selectedVendor.role}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row mb-4">
                            <div className="col-md-3">
                              <div className="card bg-light h-100">
                                <div className="card-body text-center">
                                  <h6 className="card-title text-muted">Total Products</h6>
                                  <h3 className="mb-0">{vendorStats.totalProducts || 0}</h3>
                                  <small className="text-muted">Active Products</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-light h-100">
                                <div className="card-body text-center">
                                  <h6 className="card-title text-muted">Total Sales</h6>
                                  <h3 className="mb-0">{(vendorStats.totalSales || 0).toLocaleString()}</h3>
                                  <small className="text-muted">Units Sold</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-light h-100">
                                <div className="card-body text-center">
                                  <h6 className="card-title text-muted">Total Revenue</h6>
                                  <h3 className="mb-0">GH₵{(vendorStats.totalRevenue || 0).toLocaleString()}</h3>
                                  <small className="text-muted">Gross Earnings</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-light h-100">
                                <div className="card-body text-center">
                                  <h6 className="card-title text-muted">Conversion Rate</h6>
                                  <h3 className="mb-0">{vendorStats.conversionRate || 0}%</h3>
                                  <small className="text-muted">View to Sale Ratio</small>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row mb-4">
                            <div className="col-12">
                          <div className="card mb-4">
                            <div className="card-header">
                              <h5 className="mb-0">Top Performing Products</h5>
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Product</th>
                                      <th>Views</th>
                                      <th>Sales</th>
                                      <th>Revenue</th>
                                      <th>Rating</th>
                                          <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {vendorStats.topProducts?.map(product => (
                                      <tr key={product.id}>
                                        <td>
                                          <div>
                                            <div>{product.name}</div>
                                            <small className="text-muted">GH₵{product.price}</small>
                                          </div>
                                        </td>
                                        <td>{product.views || 0}</td>
                                        <td>{product.sales || 0}</td>
                                        <td>GH₵{(product.revenue || 0).toLocaleString()}</td>
                                        <td>
                                          <div className="d-flex align-items-center">
                                            <span className="text-warning me-1">
                                              {Array(5).fill('★').map((star, i) => (
                                                <span key={i} style={{ opacity: i < (product.rating || 0) ? 1 : 0.3 }}>
                                                  {star}
                                                </span>
                                              ))}
                                            </span>
                                                <span>({product.rating?.toFixed(1) || 0})</span>
                                          </div>
                                        </td>
                                            <td>
                                              <span className={`badge ${product.status === 'APPROVED' ? 'bg-success' : 'bg-warning'}`}>
                                                {product.status}
                                              </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                                </div>
                                        </div>
                          <div className="row mb-4">
                            <div className="col-md-6">
                              <div className="card mb-4">
                                <div className="card-header">
                                  <h5 className="mb-0">Performance Metrics</h5>
                                </div>
                                <div className="card-body">
                                  <div className="mb-4">
                                    <label className="form-label d-flex justify-content-between">
                                      <span>Product Views (Last 30 days)</span>
                                      <span className="text-muted">{vendorStats.viewsPercentage || 0}%</span>
                                    </label>
                                    <div className="progress">
                                      <div 
                                        className="progress-bar" 
                                        role="progressbar" 
                                        style={{ width: `${vendorStats.viewsPercentage || 0}%` }}
                                        aria-valuenow={vendorStats.viewsPercentage || 0} 
                                        aria-valuemin="0" 
                                        aria-valuemax="100"
                                      />
                                      </div>
                                    </div>
                                  <div className="mb-4">
                                    <label className="form-label d-flex justify-content-between">
                                      <span>Sales Conversion</span>
                                      <span className="text-muted">{vendorStats.conversionRate || 0}%</span>
                                    </label>
                                    <div className="progress">
                                      <div 
                                        className="progress-bar bg-success" 
                                        role="progressbar" 
                                        style={{ width: `${vendorStats.conversionRate || 0}%` }}
                                        aria-valuenow={vendorStats.conversionRate || 0} 
                                        aria-valuemin="0" 
                                        aria-valuemax="100"
                                      />
                                      </div>
                                    </div>
                                  <div className="mb-4">
                                    <label className="form-label d-flex justify-content-between">
                                      <span>Customer Satisfaction</span>
                                      <span className="text-muted">{vendorStats.satisfactionRate || 0}%</span>
                                    </label>
                                    <div className="progress">
                                      <div 
                                        className="progress-bar bg-warning" 
                                        role="progressbar" 
                                        style={{ width: `${vendorStats.satisfactionRate || 0}%` }}
                                        aria-valuenow={vendorStats.satisfactionRate || 0} 
                                        aria-valuemin="0" 
                                        aria-valuemax="100"
                                      />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            <div className="col-md-6">
                              <div className="card mb-4">
                                <div className="card-header">
                                  <h5 className="mb-0">Recent Orders</h5>
                                </div>
                                <div className="card-body">
                                  {vendorStats.recentOrders?.map(order => (
                                    <div key={order.id} className="border-bottom py-2">
                                      <div className="d-flex justify-content-between">
                                        <div>
                                          <strong>Order #{order.id}</strong>
                                          <div className="text-muted small">{order.productName}</div>
                                        </div>
                                        <div className="text-end">
                                          <div>GH₵{(order.amount || 0).toLocaleString()}</div>
                                          <div className="small text-muted">
                                            {new Date(order.date).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                        </>
                      ) : (
                        <div className="text-center py-5">
                          <p className="text-muted">No statistics available for this vendor.</p>
                  </div>
                  )}
                </div>
              ) : (
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                  {vendors.map(vendor => (
                    <div key={vendor.id} className="col">
                      <div className="card h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            {vendor.image ? (
                              <img
                                src={vendor.image}
                                alt="Profile"
                                className="rounded-circle me-3"
                                style={{ width: "50px", height: "50px", objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3"
                                style={{ width: "50px", height: "50px" }}
                              >
                                <span className="text-white">
                                  {vendor.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <h5 className="card-title mb-0">{vendor.name}</h5>
                              <p className="card-text text-muted small mb-0">{vendor.email}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="mb-1"><small>Products: {vendor._count?.products || 0}</small></p>
                            <p className="mb-1"><small>Status: Active</small></p>
                            <button
                              className="btn btn-sm mt-2"
                              onClick={() => handleVendorClick(vendor)}
                              style={{
                                backgroundColor: "#001f3f",
                                color: "white",
                                border: "none"
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#003366";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#001f3f";
                              }}
                            >
                              View Analytics
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header">
              <h2>
                <FaShoppingCart className="icon" /> Orders
                {notificationCounts.orders > 0 && (
                  <span className="notification-badge">{notificationCounts.orders}</span>
                )}
              </h2>
            </div>
            <div className="container-fluid">
              {selectedOrder ? (
                <div className="order-details-section">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Order Details #{selectedOrder.id}</h5>
                      <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => setSelectedOrder(null)}
                        style={{ 
                          transition: 'background-color 0.3s ease',
                          borderColor: "#001f3f",
                          color: "#001f3f"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#001f3f";
                          e.target.style.color = "white";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#001f3f";
                        }}
                      >
                        <i className="bi bi-arrow-left me-2"></i>
                        Back to Orders
                      </button>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <h6>Customer Information</h6>
                          <p><strong>Name:</strong> {selectedOrder.customer?.name || 'N/A'}</p>
                          <p><strong>Email:</strong> {selectedOrder.customer?.email || 'N/A'}</p>
                          <p><strong>Phone:</strong> {selectedOrder.customer?.phone || 'N/A'}</p>
                        </div>
                        <div className="col-md-6">
                          <h6>Order Information</h6>
                          <p><strong>Status:</strong> {selectedOrder.status}</p>
                          <p><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                          <p><strong>Total Amount:</strong> GH₵{selectedOrder.total?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="row mt-4">
                        <div className="col-md-6">
                          <h6>Payment Details</h6>
                          <p><strong>Method:</strong> {
                            selectedOrder.paymentMethod === 'card' ? 'Card' :
                            selectedOrder.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                            selectedOrder.paymentMethod || 'N/A'
                          }</p>
                          <p><strong>Reference:</strong> {selectedOrder.paymentRef || 'N/A'}</p>
                          <p><strong>Status:</strong> {selectedOrder.paymentStatus || 'N/A'}</p>
                        </div>
                        <div className="col-md-6">
                          <h6>Shipping Information</h6>
                          <p><strong>Pickup Point:</strong> {selectedOrder.pickupPoint?.name || 'N/A'}</p>
                          <p><strong>Location:</strong> {selectedOrder.pickupPoint?.location || 'N/A'}</p>
                          <p><strong>Phone:</strong> {selectedOrder.pickupPoint?.phone || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="row mt-4">
                        <div className="col-12">
                          <h6>Order Items</h6>
                          <div className="table-responsive">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th>Price</th>
                                  <th>Quantity</th>
                                  <th>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>{selectedOrder.product.name}</td>
                                  <td>GH₵{selectedOrder.product.price.toFixed(2)}</td>
                                  <td>{selectedOrder.quantity}</td>
                                  <td>GH₵{(selectedOrder.product.price * selectedOrder.quantity).toFixed(2)}</td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan="3" className="text-end"><strong>Total:</strong></td>
                                  <td><strong>GH₵{selectedOrder.total.toFixed(2)}</strong></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                {orders.map(order => (
                  <div key={order.id} className="col">
                      <div 
                        className="card h-100" 
                        onClick={() => setSelectedOrder(order)} 
                        style={{ cursor: 'pointer' }}
                      >
                      <div className="card-body">
                        <h5 className="card-title">Order #{order.id}</h5>
                        <p className="card-text">
                          <small>Customer: {order.customer?.name || 'N/A'}</small>
                        </p>
                        <div className="mt-3">
                          <p className="mb-1"><small>Product: {order.product?.name || 'N/A'}</small></p>
                          <p className="mb-1"><small>Status: {order.status}</small></p>
                          <p className="mb-1"><small>Date: {new Date(order.createdAt).toLocaleDateString()}</small></p>
                            <p className="mb-1"><small>Amount: GH₵{order.total?.toLocaleString() || 'N/A'}</small></p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pickup-points' && (
          <div>
            <div className="admin-header">
              <h1>Pickup Point Management</h1>
            </div>
            <div className="container-fluid">
              {/* Add/Edit Form */}
              <div className="card mb-4">
                <div className="card-body">
                  <h5 className="card-title">
                    {editingPickupPoint ? 'Edit Pickup Point' : 'Add New Pickup Point'}
                  </h5>
                  <form onSubmit={editingPickupPoint ? handleUpdatePickupPoint : handleAddPickupPoint}>
                    <div className="row">
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Name</label>
                          <input 
                            type="text" 
                            name="name" 
                            className="form-control" 
                            required 
                            placeholder="e.g., Getfund Office"
                            defaultValue={editingPickupPoint?.name}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Region</label>
                          <input 
                            type="text" 
                            name="region" 
                            className="form-control" 
                            required 
                            placeholder="e.g., Greater Accra Region"
                            defaultValue={editingPickupPoint?.region}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">School</label>
                          <input 
                            type="text" 
                            name="school" 
                            className="form-control" 
                            required 
                            placeholder="e.g., ATU"
                            defaultValue={editingPickupPoint?.school}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Location</label>
                          <input 
                            type="text" 
                            name="location" 
                            className="form-control" 
                            required 
                            placeholder="e.g., Getfund Hostel"
                            defaultValue={editingPickupPoint?.location}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Phone</label>
                          <input 
                            type="tel" 
                            name="phone" 
                            className="form-control" 
                            required 
                            placeholder="Contact number"
                            defaultValue={editingPickupPoint?.phone}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-dark-blue">
                        {editingPickupPoint ? 'Update' : 'Add'} Pickup Point
                      </button>
                      {editingPickupPoint && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Pickup Points Grid */}
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4" style={{ minHeight: '200px' }}>
                {pickupPoints.map(point => (
                  <div key={point.id} className="col" style={{ height: '100%' }}>
                    <div className="card h-100" style={{ minHeight: '200px' }}>
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h5 className="card-title mb-0">{point.region}</h5>
                          <span className={`badge ${point.isActive ? 'bg-success' : 'bg-danger'}`}>
                            {point.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="mb-1">
                            <strong>School:</strong> {point.school}
                          </p>
                          <p className="mb-1">
                            <strong>Location:</strong> {point.location}
                          </p>
                          <p className="mb-1">
                            <strong>Phone:</strong> {point.phone}
                          </p>
                        </div>
                        <div className="mt-auto">
                          <div className="btn-group w-100">
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => handleEditPickupPoint(point)}
                              style={{ 
                                borderColor: "#001f3f", 
                                color: "#001f3f",
                                transition: "all 0.3s ease"
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#001f3f";
                                e.target.style.color = "white";
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = "transparent";
                                e.target.style.color = "#001f3f";
                              }}
                            >
                              <i className="bi bi-pencil me-2"></i>Edit
                            </button>
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => handleDeletePickupPoint(point.id)}
                            >
                              <i className="bi bi-trash me-2"></i>Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pickup-managers' && (
          <PickupManagersSection />
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <div className="admin-header">
              <h1>Vendor Leaderboard</h1>
            </div>
            <div className="container-fluid">
              <VendorLeaderboard />
            </div>
          </div>
        )}

        {activeTab === 'customerReport' && (
          <div className="customer-reports-section">
            <div className="section-header">
              <h2>
                <FaUsers className="icon" /> Customer Reports
                {notificationCounts.reports > 0 && (
                  <span className="notification-badge">{notificationCounts.reports}</span>
                )}
              </h2>
            </div>
              <CustomerReport />
            </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-section">
            <div className="section-header">
              <h2>
                <FaBell className="icon" /> Notifications
                {notificationCounts.total > 0 && (
                  <span className="notification-badge">{notificationCounts.total}</span>
                )}
              </h2>
            </div>
            <AdminNotifications notifications={notifications} onUpdate={fetchNotifications} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;