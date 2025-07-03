// ProductDetail.jsx
import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import useCart from "../context/CartContext";
import { toast } from "react-hot-toast";
import VendorBids from "./VendorBids";
import { getProductImageUrl } from '../utils/imageUtils';

function ProductDetail({ productId, userId, isVendor }) {
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState("");
  const [highestBid, setHighestBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [reviewReactions, setReviewReactions] = useState({});
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Add function to handle review reactions
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

      // Update the review reactions in state
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
      toast.error(error.response?.data?.error || 'Failed to process reaction');
    }
  };

  // Add function to fetch review reactions
  const fetchReviewReactions = async (reviewId) => {
    try {
      const response = await axios.get(`/reviews/${reviewId}/reactions`);
      setReviewReactions(prev => ({
        ...prev,
        [reviewId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching review reactions:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`/reviews/product/${productId}`);
      if (response.data && response.data.reviews) {
        // Fetch reactions for each review
        const reviewsWithReactions = await Promise.all(
          response.data.reviews.map(async (review) => {
            const reactionsResponse = await axios.get(`/reviews/${review.id}/reactions`);
            // Initialize the reactions state for this review
            setReviewReactions(prev => ({
              ...prev,
              [review.id]: {
                likeCount: reactionsResponse.data.likeCount,
                dislikeCount: reactionsResponse.data.dislikeCount,
                userReaction: reactionsResponse.data.userReaction
              }
            }));
            return {
              ...review,
              reactions: reactionsResponse.data.reactions || []
            };
          })
        );
        
        setReviews(reviewsWithReactions);
        
        // Calculate average rating
        const totalRating = reviewsWithReactions.reduce((sum, review) => sum + review.rating, 0);
        const avgRating = reviewsWithReactions.length > 0 ? totalRating / reviewsWithReactions.length : 0;
        setAvgRating(avgRating);
        setReviewCount(reviewsWithReactions.length);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to fetch reviews');
    }
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await axios.get(`/products/${productId}`);
        setProduct(response.data);
        
        // Track product view
        const viewedProducts = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
        if (!viewedProducts.includes(productId)) {
          const viewResponse = await axios.post(`/products/${productId}/view`);
          if (viewResponse.data.isNewView) {
            viewedProducts.push(productId);
            localStorage.setItem('viewedProducts', JSON.stringify(viewedProducts));
          }
        }
        
        await fetchReviews();
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error('Failed to fetch product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId]);

  const handleQuantityChange = (value) => {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setQuantity(Math.max(1, Math.min(100, numValue)));
    }
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      toast.error("Please log in to add items to your cart");
      navigate("/login");
      return;
    }
    addToCart(product, quantity);
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= (highestBid ? highestBid.amount : 0)) {
      setError("Bid amount must be higher than the current highest bid!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `/products/${productId}/place-bid`,
        { amount: parseFloat(bidAmount) },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setHighestBid({ amount: parseFloat(bidAmount) });
      setBidAmount(""); // Clear the input after successful bid
      toast.success("Bid placed successfully!");
    } catch (error) {
      console.error('Error placing bid:', error);
      setError(error.response?.data?.error || "Failed to place bid");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating || !comment) {
      toast.error('Please provide both rating and comment');
      return;
    }

    try {
      const method = existingReview ? 'put' : 'post';
      const endpoint = existingReview 
        ? `/reviews/${existingReview.id}`
        : `/reviews`;
      
      await axios[method](endpoint, {
        productId,
        rating: Number(rating),
        comment,
        isReport: false
      });

      // Clear form and fetch updated reviews
      setRating(0);
      setComment('');
      setExistingReview(null);
      await fetchReviews(); // Fetch updated reviews immediately
      toast.success(existingReview ? 'Review updated successfully!' : 'Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error || "Product not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        {/* Product Image */}
        <div className="col-md-6 mb-4">
          <div className="card border-0">
            <img
              src={getProductImageUrl(product.image)}
              className="img-fluid rounded"
              alt={product.name}
              style={{ maxHeight: "500px", objectFit: "contain" }}
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="col-md-6">
          <h1 className="mb-3">{product.name}</h1>
          
          {/* Rating */}
          <div className="mb-3">
            <div className="d-flex align-items-center">
              <div className="text-warning me-2">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`bi ${i < Math.round(avgRating) ? 'bi-star-fill' : 'bi-star'}`}
                  />
                ))}
              </div>
              <span className="text-muted">
                {avgRating} ({reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="mb-4">
            <h2 className="text-primary mb-0">GH₵{product.price.toLocaleString()}</h2>
            {product.quantity > 0 && (
              <small className="text-success">
                {product.quantity > 10 ? 'In Stock' : 
                 product.quantity > 3 ? 'Low Stock' : 'Almost Out'}
              </small>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <h5>Description</h5>
            <p className="text-muted">{product.description}</p>
          </div>

          {/* Quantity and Actions */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-3">
              <label className="me-2 mb-0">Quantity:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="form-control"
                style={{ width: "100px" }}
                disabled={product.isFlagged}
              />
            </div>

            <div className="d-grid gap-2">
              <button
                onClick={handleBuyNow}
                className="btn btn-primary"
                style={{ backgroundColor: "#001f3f" }}
                disabled={product.isFlagged || !product.quantity}
              >
                <i className="bi bi-lightning-charge-fill me-1"></i>Buy Now
              </button>
              <button
                onClick={handleAddToCart}
                className="btn btn-outline-dark"
                disabled={!isLoggedIn || product.isFlagged || !product.quantity}
              >
                <i className="bi bi-cart-plus me-1"></i>Add to Cart
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="mb-4">
            <h5>Product Information</h5>
            <ul className="list-unstyled">
              <li><strong>Category:</strong> {product.category}</li>
              <li><strong>Vendor:</strong> {product.vendor?.name}</li>
              <li><strong>Available Quantity:</strong> {product.quantity}</li>
            </ul>
          </div>

          {/* Bidding Section */}
          {product.enableBidding && new Date() <= new Date(product.bidEndDate) && (
            <div className="mb-4">
              <h5>Bidding</h5>
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-3">
                    <div>
                      <small className="text-muted">Starting Bid:</small>
                      <h6 className="mb-0">GH₵{product.startingBid?.toLocaleString()}</h6>
                    </div>
                    <div>
                      <small className="text-muted">Ends in:</small>
                      <h6 className="mb-0">{new Date(product.bidEndDate).toLocaleString()}</h6>
                    </div>
                  </div>
                  
                  {product.userBid && (
                    <div className={`alert alert-${product.userBid.status === 'APPROVED' ? 'success' : 
                      product.userBid.status === 'REJECTED' ? 'danger' : 'warning'} mb-3`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          Your bid: GH₵{product.userBid.amount}
                          <br />
                          Status: {product.userBid.status}
                        </div>
                        {product.userBid.status === 'APPROVED' && (
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: "#001f3f" }}
                            onClick={handleBuyNow}
                          >
                            Purchase Now
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(!product.userBid || product.userBid.status !== 'APPROVED') && (
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        placeholder={`Minimum bid: GH₵${product.startingBid}`}
                        min={product.startingBid}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                      />
                      <button
                        className="btn text-white"
                        style={{ backgroundColor: "#001f3f" }}
                        onClick={handlePlaceBid}
                        disabled={!isLoggedIn}
                      >
                        {!isLoggedIn ? "Login to Bid" : "Place Bid"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {product.enableBidding && new Date() > new Date(product.bidEndDate) && (
            <div className="mb-4">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Bidding period has ended for this product.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="row mt-5">
        <div className="col-12">
          <h3>Customer Reviews</h3>
          {reviews.length > 0 ? (
            <div className="list-group">
              {reviews.map((review) => (
                <div key={review.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">{review.user?.name || "Anonymous"}</h6>
                      <div className="text-warning mb-2">
                        {[...Array(5)].map((_, i) => (
                          <i
                            key={i}
                            className={`bi ${i < review.rating ? 'bi-star-fill' : 'bi-star'}`}
                          />
                        ))}
                      </div>
                      <p className="mb-1">{review.comment}</p>
                      
                      {/* Add reaction buttons */}
                      <div className="d-flex align-items-center mt-2">
                        <button
                          className={`btn btn-sm me-2 ${
                            reviewReactions[review.id]?.userReaction === 'like'
                              ? 'btn-primary'
                              : 'btn-outline-primary'
                          }`}
                          onClick={() => handleReviewReaction(review.id, 'like')}
                          disabled={!isLoggedIn}
                        >
                          <i className="bi bi-hand-thumbs-up"></i>
                          <span className="ms-1">{reviewReactions[review.id]?.likeCount || 0}</span>
                        </button>
                        <button
                          className={`btn btn-sm ${
                            reviewReactions[review.id]?.userReaction === 'dislike'
                              ? 'btn-danger'
                              : 'btn-outline-danger'
                          }`}
                          onClick={() => handleReviewReaction(review.id, 'dislike')}
                          disabled={!isLoggedIn}
                        >
                          <i className="bi bi-hand-thumbs-down"></i>
                          <span className="ms-1">{reviewReactions[review.id]?.dislikeCount || 0}</span>
                        </button>
                      </div>
                    </div>
                    <small className="text-muted">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No reviews yet. Be the first to review this product!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
