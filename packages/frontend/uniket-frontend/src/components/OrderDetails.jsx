import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import uniketLogo from '../assets/uniket-bag.png';
import { 
  FaArrowLeft, FaBox, FaMapMarkerAlt, FaTruck, FaCreditCard, 
  FaCalendarAlt, FaUser, FaHistory, FaQrcode, FaDownload, 
  FaShare, FaPrint, FaBell, FaStar, FaChartLine, FaShieldAlt,
  FaMoneyBillWave, FaUsers, FaRoute, FaWarehouse, FaTachometerAlt, FaRegClock,
  FaSmile, FaMeh, FaFrown, FaThumbsUp, FaThumbsDown, FaCheckCircle
} from 'react-icons/fa';
import { getProductImageUrl } from '../utils/imageUtils';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryRatings, setCategoryRatings] = useState({
    delivery_speed: 0,
    product_quality: 0,
    customer_service: 0,
    value_for_money: 0,
    order_security: 0,
    logistics: 0
  });

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await axios.get(`/orders/${id}`);
        setOrder(response.data);
        // Get user role from localStorage or context
        const userRole = localStorage.getItem('userRole') || 'user';
        setUserRole(userRole);
        // Simulate tracking history (replace with actual API call)
        setTrackingHistory([
          { status: 'Order Placed', timestamp: new Date(response.data.createdAt), location: 'Online Store' },
          { status: 'Payment Confirmed', timestamp: new Date(response.data.createdAt), location: 'Payment Gateway' },
          { status: 'Processing', timestamp: new Date(), location: 'Warehouse' }
        ]);
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleDownloadInvoice = () => {
    // Implement invoice download logic
    toast.success('Invoice downloaded successfully');
  };

  const handleShareOrder = () => {
    setShowShareModal(true);
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleTrackOrder = () => {
    navigate(`/track-order/${id}`);
  };

  const handleRateOrder = () => {
    setShowRatingModal(true);
  };

  const handleCategoryRating = (category, rating) => {
    setCategoryRatings(prev => ({
      ...prev,
      [category]: rating
    }));
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select an overall rating');
      return;
    }

    // Check if at least one category is rated
    const hasCategoryRatings = Object.values(categoryRatings).some(r => r > 0);
    if (!hasCategoryRatings) {
      toast.error('Please rate at least one aspect of your experience');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`/orders/${id}/rate`, {
        rating,
        feedback,
        categories: categoryRatings
      });
      
      toast.success('Thank you for your feedback!');
      setShowRatingModal(false);
      // Reset form
      setRating(0);
      setFeedback('');
      setCategoryRatings({
        delivery_speed: 0,
        product_quality: 0,
        customer_service: 0,
        value_for_money: 0,
        order_security: 0,
        logistics: 0
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  if (isLoading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          Order not found
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container py-5">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate(-1)}
          style={{ color: '#001f3f', borderColor: '#001f3f' }}
        >
          <FaArrowLeft className="me-2" />
          Back to Orders
        </button>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary" 
            onClick={handleDownloadInvoice}
            style={{ color: '#001f3f', borderColor: '#001f3f' }}
          >
            <FaDownload className="me-2" />
            Download Invoice
          </button>
          <button 
            className="btn btn-outline-primary" 
            onClick={handleShareOrder}
            style={{ color: '#001f3f', borderColor: '#001f3f' }}
          >
            <FaShare className="me-2" />
            Share
          </button>
          <button 
            className="btn btn-outline-primary" 
            onClick={handlePrintOrder}
            style={{ color: '#001f3f', borderColor: '#001f3f' }}
          >
            <FaPrint className="me-2" />
            Print
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          {/* Order Status Card with Timeline */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Order Status</h5>
                <span className={`badge bg-${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-3 mb-3 p-3 bg-light rounded">
                <h6 className="mb-2">Tracking Information</h6>
                <p className="mb-1"><strong>Order ID:</strong> #{order.id}</p>
                <p className="mb-1"><strong>Tracking ID:</strong> {order.trackingId}</p>
                {order.estimatedDeliveryTime && (
                  <p className="mb-0"><strong>Estimated Delivery:</strong> {new Date(order.estimatedDeliveryTime).toLocaleDateString()}</p>
                )}
              </div>
              <hr />
              <div className="timeline">
                {trackingHistory.map((event, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <h6>{event.status}</h6>
                      <p className="text-muted mb-0">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      <small className="text-muted">{event.location}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Details Card */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Product Details</h5>
              <div className="d-flex align-items-center">
                {order.product?.image && (
                  <img
                    src={getProductImageUrl(order.product.image)}
                    alt={order.product.name}
                    className="rounded"
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  />
                )}
                <div className="ms-3">
                  <h6 className="mb-1">{order.product?.name}</h6>
                  <p className="text-muted mb-1">Quantity: {order.quantity}</p>
                  <p className="mb-0">GH₵{order.total?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information Card */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-4">Delivery Information</h5>
              <div>
                <p className="mb-1">
                  <FaTruck className="me-2" />
                  Delivery Method
                </p>
                <p className="text-muted mb-3">
                  {order.deliveryMethod || 'Standard Delivery'}
                </p>
                {order.pickupPoint && (
                  <>
                    <p className="mb-1">
                      <FaMapMarkerAlt className="me-2" />
                      Pickup Point
                    </p>
                    <p className="text-muted">
                      {order.pickupPoint.name}
                      <br />
                      {order.pickupPoint.location}
                      <br />
                      {order.pickupPoint.region}
                      <br />
                      {order.pickupPoint.school}
                      <br />
                      {order.pickupPoint.department}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Order Summary Card */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Order Summary</h5>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>GH₵{(order.total / order.quantity).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Quantity</span>
                <span>{order.quantity}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-2">
                <strong>Total</strong>
                <strong>GH₵{order.total?.toFixed(2)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Payment Status</span>
                <span className="badge bg-success">
                  Paid
                </span>
              </div>
              {order.paymentRef && (
                <div className="mt-2">
                  <small className="text-muted">Payment Reference: {order.paymentRef}</small>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Quick Actions</h5>
              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <button 
                    className="btn btn-outline-primary w-100"
                    onClick={() => setShowQR(true)}
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaQrcode className="me-2" />
                    Show QR Code
                  </button>
                </div>
                <div className="col-6 col-md-4">
                  <button 
                    className="btn btn-outline-primary w-100"
                    onClick={handleTrackOrder}
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaTruck className="me-2" />
                    Track Order
                  </button>
                </div>
                <div className="col-6 col-md-4">
                  <button 
                    className="btn btn-outline-primary w-100"
                    onClick={handleRateOrder}
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaStar className="me-2" />
                    Rate Order
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Analytics Card */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-4">Security & Analytics</h5>
              <div className="d-flex align-items-center mb-3">
                <FaShieldAlt className="me-2 text-success" />
                <div>
                  <h6 className="mb-0">Order Protected</h6>
                  <small className="text-muted">Secure transaction verified</small>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <FaChartLine className="me-2 text-primary" />
                <div>
                  <h6 className="mb-0">Order Analytics</h6>
                  <small className="text-muted">View detailed insights</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Order QR Code</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowQR(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="qr-code-container text-center p-4" style={{ 
                      backgroundColor: '#fff',
                      borderRadius: '10px',
                      boxShadow: '0 0 20px rgba(0,0,0,0.1)'
                    }}>
                      <QRCodeSVG 
                        value={`${window.location.origin}/track-order/${order.id}`}
                        size={250}
                        level="H"
                        includeMargin={true}
                        imageSettings={{
                          src: uniketLogo,
                          height: 50,
                          width: 50,
                          excavate: true,
                        }}
                      />
                      <div className="mt-3">
                        <h6 className="mb-2">Order #{order.id}</h6>
                        <p className="text-muted mb-0">Scan to track your order</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="qr-details">
                      <h6 className="mb-3">QR Code Details</h6>
                      <div className="mb-3">
                        <label className="text-muted d-block">Order Status</label>
                        <span className={`badge bg-${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="mb-3">
                        <label className="text-muted d-block">Order Date</label>
                        <p className="mb-0">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="text-muted d-block">Total Amount</label>
                        <p className="mb-0">GH₵{order.total?.toFixed(2)}</p>
                      </div>
                      <div className="d-grid gap-2 mt-4">
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/track-order/${order.id}`);
                            toast.success('Tracking link copied to clipboard');
                          }}
                        >
                          <FaShare className="me-2" />
                          Copy Tracking Link
                        </button>
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => {
                            const canvas = document.createElement("canvas");
                            const svg = document.querySelector(".qr-code-container svg");
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              const ctx = canvas.getContext("2d");
                              ctx.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.download = `order-${order.id}-qr.png`;
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = "data:image/svg+xml;base64," + btoa(svgData);
                          }}
                        >
                          <FaDownload className="me-2" />
                          Download QR Code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Section - Only visible to admin/enterprise users */}
                {userRole === 'admin' || userRole === 'enterprise' ? (
                  <div className="mt-4 pt-4 border-top">
                    <h6 className="mb-3">QR Code Analytics</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-muted mb-2">Total Scans</h6>
                            <h3 className="mb-0">1,234</h3>
                            <small className="text-success">↑ 12% from last week</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-muted mb-2">Unique Visitors</h6>
                            <h3 className="mb-0">856</h3>
                            <small className="text-success">↑ 8% from last week</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-muted mb-2">Engagement Rate</h6>
                            <h3 className="mb-0">69.4%</h3>
                            <small className="text-success">↑ 5% from last week</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Share Order</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowShareModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaShare className="me-2" />
                    Share via Email
                  </button>
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaShare className="me-2" />
                    Share via WhatsApp
                  </button>
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaShare className="me-2" />
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Rate Your Order Experience</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRatingModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-4">
                  <h6 className="mb-3">How would you rate your overall experience?</h6>
                  <div className="d-flex justify-content-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className="star-rating"
                        style={{
                          fontSize: '2rem',
                          cursor: 'pointer',
                          color: star <= (hoverRating || rating) ? '#ffc107' : '#e4e5e9',
                          transition: 'color 0.2s ease-in-out'
                        }}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    {rating === 1 && <span className="text-danger">Poor</span>}
                    {rating === 2 && <span className="text-warning">Fair</span>}
                    {rating === 3 && <span className="text-info">Good</span>}
                    {rating === 4 && <span className="text-primary">Very Good</span>}
                    {rating === 5 && <span className="text-success">Excellent</span>}
                  </div>
                </div>

                <div className="mb-4">
                  <h6 className="mb-3">Rate specific aspects of your experience</h6>
                  <div className="row g-4">
                    {[
                      { icon: <FaTruck />, label: 'Delivery Speed', value: 'delivery_speed' },
                      { icon: <FaBox />, label: 'Product Quality', value: 'product_quality' },
                      { icon: <FaUser />, label: 'Customer Service', value: 'customer_service' },
                      { icon: <FaMoneyBillWave />, label: 'Value for Money', value: 'value_for_money' },
                      { icon: <FaShieldAlt />, label: 'Order Security', value: 'order_security' },
                      { icon: <FaRoute />, label: 'Logistics', value: 'logistics' }
                    ].map((category) => (
                      <div key={category.value} className="col-md-6">
                        <div className="card h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                              {category.icon}
                              <h6 className="mb-0 ms-2">{category.label}</h6>
                            </div>
                            <div className="d-flex justify-content-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className="star-rating"
                                  style={{
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: star <= categoryRatings[category.value] ? '#ffc107' : '#e4e5e9',
                                    transition: 'color 0.2s ease-in-out'
                                  }}
                                  onClick={() => handleCategoryRating(category.value, star)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h6 className="mb-3">Additional Feedback</h6>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Share your experience with us..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  ></textarea>
                </div>

                <div className="d-grid gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={handleRatingSubmit}
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="me-2" />
                        Submit Rating
                      </>
                    )}
                  </button>
                </div>

                {/* Business Impact Section - Only visible to admin/enterprise users */}
                {userRole === 'admin' || userRole === 'enterprise' ? (
                  <div className="mt-4 pt-4 border-top">
                    <h6 className="mb-3">Business Impact Analysis</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-muted mb-2">Customer Satisfaction</h6>
                            <h3 className="mb-0">4.8/5</h3>
                            <small className="text-success">↑ 0.2 from last month</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-muted mb-2">Response Rate</h6>
                            <h3 className="mb-0">92%</h3>
                            <small className="text-success">↑ 5% from last month</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title text-muted mb-2">NPS Score</h6>
                            <h3 className="mb-0">78</h3>
                            <small className="text-success">↑ 3 from last month</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .timeline {
          position: relative;
          padding: 20px 0;
        }

        .timeline-item {
          position: relative;
          padding-left: 30px;
          margin-bottom: 20px;
        }

        .timeline-marker {
          position: absolute;
          left: 0;
          top: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #001f3f;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px #001f3f;
        }

        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: 5px;
          top: 12px;
          height: calc(100% + 8px);
          width: 2px;
          background: #001f3f;
        }

        .btn-outline-primary:hover {
          background-color: #001f3f !important;
          color: white !important;
        }

        .btn-outline-primary:focus {
          box-shadow: 0 0 0 0.25rem rgba(0, 31, 63, 0.25) !important;
        }

        .star-rating:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default OrderDetails; 