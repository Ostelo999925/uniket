import React, { useEffect, useState, useCallback } from 'react';
import axios from '../api/axios';
import useCart from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuth from '../context/AuthContext';
import { FaBell, FaCog, FaSignOutAlt } from 'react-icons/fa';
import AIProductAdvisor from '../components/AIProductAdvisor';
import { getProductImageUrl } from '../utils/imageUtils';

const CustomerBrowse = () => {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [quantities, setQuantities] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [productReviews, setProductReviews] = useState({});
  const [bidAmounts, setBidAmounts] = useState({});
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [isLoggedIn, setIsLoggedIn] = useState(!!user?.id);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewReactions, setReviewReactions] = useState({});
  const { user: authUser } = useAuth();
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isReport, setIsReport] = useState(false);

  // Initialize Bootstrap JS
  useEffect(() => {
    const loadBootstrap = async () => {
      await import('bootstrap/dist/js/bootstrap.bundle.min.js');
    };
    loadBootstrap();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        await fetchProducts();
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setToken(storedToken);
    setUser(storedUser);
    setIsLoggedIn(!!storedUser?.id);
  }, []);

  // Add new useEffect for notifications
  useEffect(() => {
    if (isLoggedIn) {
      const fetchNotifications = async () => {
        try {
          const response = await axios.get('/notifications');
          setNotifications(response.data);
        } catch (error) {
          // Only show error if it's not a rate limit error
          if (error.response?.status !== 429) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
          }
        }
      };

      fetchNotifications();
    }
  }, [isLoggedIn]);

  const fetchProducts = async (page = 1, append = false) => {
    try {
      const response = await axios.get('/products', {
        params: {
          page,
          limit: 20,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: query || undefined
        }
      });
      
      const { products: newProducts, pagination } = response.data;
      
      if (!newProducts) {
        console.error('No products in response:', response.data);
        toast.error('Failed to fetch products. Please try again later.');
        return;
      }
      
      // Process products to ensure bidding information is properly formatted
      const processedProducts = newProducts.map(product => {
        // Ensure all bidding-related fields are properly typed
        const enableBidding = Boolean(product.enableBidding);
        const bidEndDate = product.bidEndDate ? new Date(product.bidEndDate) : null;
        const startingBid = product.startingBid ? Number(product.startingBid) : null;
        const highestBid = product.highestBid ? {
          amount: Number(product.highestBid.amount),
          status: product.highestBid.status
        } : null;

        // Check if bidding is active
        const isBiddingActive = enableBidding && bidEndDate && new Date() <= bidEndDate;

        return {
          ...product,
          enableBidding,
          bidEndDate,
          startingBid,
          highestBid,
          isBiddingActive
        };
      });
      
      setProducts(prev => append ? [...prev, ...processedProducts] : processedProducts);
      setTotalPages(pagination?.totalPages || 1);
      setCurrentPage(pagination?.page || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('Server is taking too long to respond. Please try again.');
      } else {
        toast.error('Failed to fetch products. Please try again later.');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load initial products
  useEffect(() => {
    setIsLoading(true);
    fetchProducts(1);
  }, [query, selectedCategory]);

  // Load more products when scrolling
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      === document.documentElement.offsetHeight
    ) {
      if (!isLoadingMore && currentPage < totalPages) {
        setIsLoadingMore(true);
        fetchProducts(currentPage + 1, true);
      }
    }
  }, [currentPage, totalPages, isLoadingMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Calculate categories after products are loaded
  const categories = ['All', ...new Set(products.map(p => p.category))];

  const handleRatingChange = async (productId, newRating) => {
    setUserRatings(prev => ({
      ...prev,
      [productId]: newRating
    }));
    
    try {
      await axios.post(`/products/${productId}/rate`, { 
        rating: newRating 
      });
    } catch (err) {
      console.error('Error submitting rating:', err);
      setUserRatings(prev => {
        const newState = {...prev};
        delete newState[productId];
        return newState;
      });
    }
  };

  const handleQuantityChange = (productId, value) => {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setQuantities(prev => ({
        ...prev,
        [productId]: Math.max(1, Math.min(100, numValue))
      }));
    }
  };

  const handleAddToCart = (product) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      // Option 1: Redirect to login
      navigate("/login");
      // Option 2: Show a toast/message
      // toast.error("Please log in to add items to your cart.");
      return;
    }
    const qty = quantities[product.id] || 1;
    addToCart(product, qty);
  };

  const handleBuyNow = (product) => {
    handleAddToCart(product);
    // Only navigate if user is logged in
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.id) {
      navigate("/cart");
    }
  };

  const handleStarClick = (product, star) => {
    if (!isLoggedIn) {
      toast.error("Please log in to leave a review");
      navigate("/login");
      return;
    }
    
    // Set the state for the modal
    setReviewProduct(product);
    setReviewRating(star);
    setIsReport(false);
    
    // Fetch reviews before showing the modal
    fetchReviews(product.id);
    
    // Check if user has already reviewed this product
    const checkExistingReview = async () => {
      try {
        const response = await axios.get(`/reviews/product/${product.id}`);
        const data = response.data;
        
        if (data.reviews) {
          // Find if current user has a review
          const userReview = data.reviews.find(review => review.userId === user.id);
          
          if (userReview) {
            console.log("Found existing user review:", userReview);
            // Pre-populate the form with existing review
            setReviewRating(userReview.rating);
            setReviewComment(userReview.comment);
            toast.info("You've already reviewed this product. You can update your review.");
          }
        }
      } catch (err) {
        console.error("Error checking for existing review:", err);
      } finally {
        // Show the modal after trying to find existing review
        setShowReviewModal(true);
      }
    };
    
    checkExistingReview();
  };

  const handleSubmitReview = async () => {
    if (!isLoggedIn) {
      toast.error("Please log in to submit a review");
      navigate("/login");
      return;
    }

    if (!token) {
      toast.error("Authentication token missing. Please log in again.");
      navigate("/login");
      return;
    }

    setIsSubmittingReview(true);
    try {
      // Check if user already has a review for this product
      const reviewsResponse = await axios.get(`/reviews/product/${reviewProduct.id}`);
      const existingReview = reviewsResponse.data.reviews?.find(r => r.userId === user.id);
      
      // Determine if we should create a new review or update existing one
      const method = existingReview ? 'put' : 'post';
      const endpoint = existingReview 
        ? `/reviews/${existingReview.id}`
        : `/reviews`;
      
      const response = await axios[method](endpoint, {
          productId: reviewProduct.id,
          rating: Number(reviewRating),
          comment: reviewComment,
          isReport: isReport
      });

      // Fetch all reviews again to ensure we have the latest data
      const updatedReviewsResponse = await axios.get(`/reviews/product/${reviewProduct.id}`);
      setProductReviews(prevReviews => ({
        ...prevReviews,
        [reviewProduct.id]: updatedReviewsResponse.data.reviews
      }));

      // Refresh the products list to get updated ratings
      await fetchProducts(currentPage);

      toast.success(existingReview ? "Review updated successfully!" : "Review submitted successfully!");
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment("");
      setIsReport(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchReviews = async (productId) => {
    setIsLoadingReviews(true);
    try {
      const res = await axios.get(`/reviews/product/${productId}`);
      if (res.data && res.data.reviews) {
        setProductReviews(prev => ({
          ...prev,
          [productId]: res.data.reviews
        }));
        
        // Fetch and initialize reactions for each review
        await Promise.all(res.data.reviews.map(async (review) => {
          const reactionResponse = await axios.get(`/reviews/${review.id}/reactions`);
          setReviewReactions(prev => ({
            ...prev,
            [review.id]: {
              likeCount: reactionResponse.data.likeCount,
              dislikeCount: reactionResponse.data.dislikeCount,
              userReaction: reactionResponse.data.userReaction
            }
          }));
        }));
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      toast.error("Failed to load reviews");
      setProductReviews(prev => ({
        ...prev,
        [productId]: []
      }));
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handlePlaceBid = async (product) => {
    if (!isLoggedIn) {
      toast.error("Please log in to place a bid");
      navigate("/login");
      return;
    }

    setSelectedProduct(product);
    setBidAmount('');
    setShowBidModal(true);
  };

  const handleBidSubmit = async () => {
    if (!bidAmount || Number(bidAmount) < selectedProduct.startingBid) {
      toast.error(`Bid must be at least GH₵${selectedProduct.startingBid}`);
      return;
    }

    try {
      await axios.post(
        `/api/bidding/product/${selectedProduct.id}/place`,
        { 
          amount: Number(bidAmount),
          userId: user.id,
          productId: selectedProduct.id
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      toast.success("Bid placed successfully! Waiting for vendor approval.");
      setShowBidModal(false);
      fetchProducts(); // Refresh products to update bid status
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error(error.response?.data?.message || "Failed to place bid");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    navigate('/login');
  };

  const handleProductClick = (product) => {
    navigate(`/products/${product.id}`);
  };

  const handleAIProductSelect = (product) => {
    navigate(`/products/${product.id}`);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) &&
    (selectedCategory === 'All' || p.category === selectedCategory)
  );

  const getStockStatusBadge = (stockStatus, quantity) => {
    // Determine stock status based on quantity if stockStatus is not provided
    let status = stockStatus;
    if (!status) {
      if (quantity <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (quantity <= 5) {
        status = 'LOW_STOCK';
      } else {
        status = 'IN_STOCK';
      }
    }

    switch (status) {
      case 'OUT_OF_STOCK':
        return (
          <div className="d-flex align-items-center">
            <span className="badge bg-danger px-3 py-2">
              <i className="bi bi-x-circle me-1"></i>
              Out of Stock
            </span>
          </div>
        );
      case 'LOW_STOCK':
        return (
          <div className="d-flex align-items-center">
            <span className="badge bg-warning text-dark px-3 py-2">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Low Stock
            </span>
          </div>
        );
      case 'IN_STOCK':
        return (
          <div className="d-flex align-items-center">
            <span className="badge bg-success px-3 py-2">
              <i className="bi bi-check-circle me-1"></i>
              In Stock
            </span>
          </div>
        );
      default:
        return (
          <div className="d-flex align-items-center">
            <span className="badge bg-secondary px-3 py-2">
              <i className="bi bi-question-circle me-1"></i>
              Unknown
            </span>
          </div>
        );
    }
  };

  // Update the handleReviewReaction function
  const handleReviewReaction = async (reviewId, reaction) => {
    if (!isLoggedIn) {
      toast.error("Please log in to react to reviews");
      navigate("/login");
      return;
    }

    try {
      const response = await axios.post(`/reviews/${reviewId}/reactions`, { 
        type: reaction 
      });
      
      const { likeCount, dislikeCount, message } = response.data;

      // Update the reactions state
      setReviewReactions(prev => ({
        ...prev,
        [reviewId]: {
          ...prev[reviewId],
          userReaction: response.data.reaction?.type || null,
          likeCount,
          dislikeCount
        }
      }));
      
      toast.success(message);
    } catch (error) {
      console.error('Error handling review reaction:', error);
      toast.error(error.response?.data?.error || "Failed to process reaction");
    }
  };

  // Update the fetchReviewReactions function
  const fetchReviewReactions = async (reviewId) => {
    try {
      const response = await axios.get(`/reviews/reactions/${reviewId}`);
      setReviewReactions(prev => ({
        ...prev,
        [reviewId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching review reactions:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.put(`/notifications/read-all`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      toast.success("All notifications marked as read!");
    } catch (err) {
      console.error("Error marking notifications as read:", err);
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await axios.delete(`/notifications/clear-all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications([]);
      toast.success("All notifications cleared!");
    } catch (err) {
      console.error("Error clearing notifications:", err);
      if (err.response?.status === 429) {
        toast.error("You've reached the limit for clearing notifications. Please try again after an hour.");
      } else {
        toast.error("Failed to clear notifications");
      }
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Update the rating display logic
  const getProductRating = (product) => {
    if (!product) return { rating: 0, count: 0 };
    return {
      rating: product.averageRating || 0,
      count: product.reviewCount || 0
    };
  };

  return (
    <div className="container-fluid">
      {isLoggedIn && (
        <div className="d-flex justify-content-end align-items-center p-3" style={{ position: "relative" }}>
          <div className="position-relative me-3">
            <button
              className="btn notification-btn rounded-circle"
              style={{ fontSize: "1.5rem" }}
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
            >
              <FaBell />
              {notifications && Array.isArray(notifications) && notifications.filter(n => !n.read).length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {notifications.filter(n => !n.read).length}
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
                    <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                      <button 
                        className="btn btn-sm btn-link text-decoration-none"
                        style={{ color: 'white', padding: '0.25rem 0.5rem' }}
                        onClick={handleClearAll}
                      >
                        Mark as Read
                      </button>
                      <button 
                        className="btn btn-sm btn-link text-decoration-none"
                        style={{ color: 'white', padding: '0.25rem 0.5rem' }}
                        onClick={handleDeleteAllNotifications}
                      >
                        Clear All
                      </button>
                      <button 
                        className="btn btn-sm btn-link text-decoration-none"
                        style={{ color: 'white', padding: '0.25rem' }}
                        onClick={() => setShowNotifications(false)}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted p-3">
                      No notifications
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item p-3 border-bottom ${!notification.read ? 'bg-light' : ''}`}
                        onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                        style={{ cursor: !notification.read ? 'pointer' : 'default' }}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <p className="mb-1 small">{notification.message}</p>
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
          </div>
          <div className="dropdown">
            <button
              className="btn rounded-circle"
              style={{ fontSize: "1.5rem" }}
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
            >
              <FaCog />
            </button>
            {showSettings && (
              <div 
                className="position-absolute end-0 mt-2 bg-white rounded shadow-lg"
                style={{ 
                  width: '200px',
                  zIndex: 1000
                }}
              >
                <div className="p-2">
                  <button
                    className="btn btn-link text-decoration-none text-dark w-100 text-start"
                    onClick={() => navigate('/profile')}
                  >
                    Profile
                  </button>
    
                  <button
                    className="btn btn-link text-decoration-none text-danger w-100 text-start"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="me-2" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Browse Products</h2>

      {/* Search Section */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
        <div className="flex flex-1 gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="p-2 border rounded flex-1"
            onClick={(e) => e.stopPropagation()}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded w-48"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add AI Product Advisor */}
      <div className="container mt-4">
        <AIProductAdvisor onProductSelect={handleAIProductSelect} />
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-5">
          <p>No products found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="row g-4">
            {products.map((product) => {
              const { rating, count } = getProductRating(product);
              return (
                <div className="col-md-4" key={product.id} onClick={(e) => {
                  if (!e.target.closest('button') && 
                      !e.target.closest('input') && 
                      !e.target.closest('.text-warning')) {
                    handleProductClick(product);
                  }
                }} style={{ cursor: 'pointer' }}>
                  <div className="card h-100 product-card">
                    <img 
                      src={getProductImageUrl(product.image)} 
                      className="card-img-top product-image" 
                      alt={product.name}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{product.name}</h5>
                      <p className="card-text text-muted mb-2">{product.description}</p>
                      <div className="d-flex justify-content-between align-items-center mt-auto">
                        <div className="price-tag">GH₵{product.price.toFixed(2)}</div>
                        <div className="rating-container">
                          <div className="stars d-flex align-items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className="cursor-pointer text-warning fs-5 me-1"
                                style={{ 
                                  color: star <= rating ? '#ffc107' : '#e4e5e9',
                                  transition: 'color 0.2s ease'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStarClick(product, star);
                                }}
                              >
                                ★
                              </span>
                            ))}
                            <small className="text-muted ms-2">
                              {rating.toFixed(1)} ({count} reviews)
                            </small>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center mb-2">
                        <div className="me-2">
                          {getStockStatusBadge(product.stockStatus, product.quantity)}
                        </div>
                        <div className="flex-grow-1" style={{ maxWidth: '100px' }}>
                          <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                            <div 
                              className={`progress-bar ${
                                product.quantity > 10 ? 'bg-success' : 
                                product.quantity > 3 ? 'bg-warning' : 'bg-danger'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (product.quantity / 15) * 100)}%`,
                                transition: 'width 0.3s ease, background-color 0.3s ease'
                              }}
                              role="progressbar"
                              aria-valuenow={product.quantity}
                              aria-valuemin="0"
                              aria-valuemax="15"
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center mb-3">
                        <label htmlFor={`qty-${product.id}`} className="me-2 mb-0 text-muted">
                          Quantity:
                        </label>
                        <input
                          id={`qty-${product.id}`}
                          type="number"
                          min="1"
                          max={product.quantity}
                          value={quantities[product.id] || 1}
                          onChange={(e) => {
                            const value = Math.max(1, Math.min(product.quantity, parseInt(e.target.value) || 1));
                            handleQuantityChange(product.id, value);
                          }}
                          className={`form-control form-control-sm w-50 ${
                            product.quantity <= 0 ? 'bg-light' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                          disabled={product.isFlagged || product.quantity <= 0}
                        />
                      </div>

                      <div className="d-grid gap-2">
                        {product.isBiddingActive ? (
                          <>
                            <button
                              onClick={() => handlePlaceBid(product)}
                              className="btn btn-primary btn-sm"
                              style={{backgroundColor: "#001f3f"}}
                              disabled={product.isFlagged || product.quantity <= 0}
                            >
                              <i className="bi bi-gavel me-1"></i>
                              Place Bid
                            </button>
                            <button
                              onClick={() => handleProductClick(product)}
                              className="btn btn-outline-dark btn-sm"
                            >
                              <i className="bi bi-info-circle me-1"></i>
                              View Details
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleBuyNow(product)}
                              className="btn btn-primary btn-sm"
                              style={{backgroundColor: "#001f3f"}}
                              disabled={product.isFlagged || product.quantity <= 0}
                            >
                              <i className="bi bi-lightning-charge-fill me-1"></i>
                              {product.quantity <= 0 ? 'Out of Stock' : 'Buy Now'}
                            </button>
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={!isLoggedIn || product.isFlagged || product.quantity <= 0}
                              className="btn btn-outline-dark btn-sm"
                            >
                              <i className="bi bi-cart-plus me-1"></i>
                              {product.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {isLoadingMore && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading more...</span>
              </div>
              <p className="mt-2">Loading more products...</p>
            </div>
          )}
        </>
      )}

      {showReviewModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Leave a Review for {reviewProduct?.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowReviewModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Rating: </strong>
                  <div className="d-inline-block">
                    {[1, 2, 3, 4, 5].map(star => (
                      <i
                        key={star}
                        className={`bi ${
                          star <= (hoveredRating || reviewRating) 
                            ? "bi-star-fill text-warning" 
                            : "bi-star text-muted"
                        }`}
                        style={{ 
                          cursor: "pointer", 
                          fontSize: "1.5rem",
                          transition: "transform 0.1s ease",
                          marginRight: "0.25rem"
                        }}
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                      />
                    ))}
                  </div>
                  {reviewRating > 0 && (
                    <span className="ms-2 text-muted">
                      {reviewRating === 1 ? "Poor" :
                       reviewRating === 2 ? "Fair" :
                       reviewRating === 3 ? "Good" :
                       reviewRating === 4 ? "Very Good" :
                       "Excellent"}
                    </span>
                  )}
                </div>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Write your review..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isReportCheckbox"
                    checked={isReport}
                    onChange={e => setIsReport(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isReportCheckbox">
                    Mark this review as a report
                  </label>
                </div>
                {productReviews[reviewProduct?.id] && (
                  <div className="mt-3">
                    <h6>Recent Reviews</h6>
                    {isLoadingReviews ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <span className="ms-2">Loading reviews...</span>
                      </div>
                    ) : productReviews[reviewProduct.id].length > 0 ? (
                      <ul className="list-group">
                        {productReviews[reviewProduct.id].map((rev) => (
                          <li key={rev.id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{rev.user?.name || "User"}</strong>
                                <span className="ms-2 text-warning">
                                  {[...Array(rev.rating)].map((_, i) => (
                                    <i key={i} className="bi bi-star-fill"></i>
                                  ))}
                                </span>
                              </div>
                              <small className="text-muted">{new Date(rev.createdAt).toLocaleString()}</small>
                            </div>
                            <div className="mt-2">{rev.comment}</div>
                            
                            {/* Add reaction buttons */}
                            <div className="d-flex align-items-center mt-2">
                              <button
                                className={`btn btn-sm me-2 ${
                                  reviewReactions[rev.id]?.userReaction === 'like'
                                    ? 'btn-primary'
                                    : 'btn-outline-primary'
                                }`}
                                onClick={() => handleReviewReaction(rev.id, 'like')}
                                disabled={!isLoggedIn}
                              >
                                <i className="bi bi-hand-thumbs-up"></i>
                                <span className="ms-1">{reviewReactions[rev.id]?.likeCount || 0}</span>
                              </button>
                              <button
                                className={`btn btn-sm ${
                                  reviewReactions[rev.id]?.userReaction === 'dislike'
                                    ? 'btn-danger'
                                    : 'btn-outline-danger'
                                }`}
                                onClick={() => handleReviewReaction(rev.id, 'dislike')}
                                disabled={!isLoggedIn}
                              >
                                <i className="bi bi-hand-thumbs-down"></i>
                                <span className="ms-1">{reviewReactions[rev.id]?.dislikeCount || 0}</span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted text-center">No reviews yet. Be the first to review!</p>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitReview}
                  disabled={!reviewRating || !reviewComment || isSubmittingReview}
                >
                  {isSubmittingReview ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {showBidModal && selectedProduct && (
          <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Place Bid for {selectedProduct.name}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowBidModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Starting Bid: GH₵{selectedProduct.startingBid}</label>
                    <input
                      type="number"
                      className="form-control"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Enter your bid amount"
                      min={selectedProduct.startingBid}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bid End Date:</label>
                    <p className="text-muted">
                      {new Date(selectedProduct.bidEndDate).toLocaleString()}
                    </p>
                  </div>
                  {selectedProduct.highestBid && (
                    <div className="alert alert-info">
                      Current Highest Bid: GH₵{selectedProduct.highestBid.amount}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowBidModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleBidSubmit}
                    disabled={!bidAmount || Number(bidAmount) < selectedProduct.startingBid}
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerBrowse;