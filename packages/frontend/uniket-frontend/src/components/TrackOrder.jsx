import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import uniketLogo from '../assets/uniket-bag.png';
import { 
  FaArrowLeft, FaTruck, FaMapMarkerAlt, FaClock, 
  FaCheckCircle, FaExclamationCircle, FaInfoCircle,
  FaDownload, FaShare, FaBell, FaChartLine, FaShieldAlt,
  FaPhone, FaEnvelope, FaWhatsapp, FaQrcode, FaChartBar,
  FaChartPie, FaChartArea, FaUserShield, FaLock, FaMoneyBillWave,
  FaUsers, FaRoute, FaWarehouse, FaTachometerAlt, FaRegClock
} from 'react-icons/fa';
import { getProductImageUrl } from '../utils/imageUtils';

const TrackOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedDelivery, setEstimatedDelivery] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('performance');
  const [notifications, setNotifications] = useState({
    email: false,
    sms: false,
    whatsapp: false
  });
  const [userRole, setUserRole] = useState('customer');

  useEffect(() => {
    const fetchOrderTracking = async () => {
      try {
        const response = await axios.get(`/orders/${id}/tracking`);
        setOrder(response.data.order);
        setTrackingInfo(response.data.tracking);
        
        if (response.data.tracking?.estimatedDelivery) {
          setEstimatedDelivery(new Date(response.data.tracking.estimatedDelivery));
        }

        // Fetch user role (this should be implemented in your auth system)
        const userResponse = await axios.get('/auth/me');
        setUserRole(userResponse.data.role);
      } catch (error) {
        console.error('Error fetching tracking info:', error);
        toast.error('Failed to load tracking information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderTracking();
    const interval = setInterval(fetchOrderTracking, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDownloadInvoice = () => {
    // Implement invoice download
    toast.success('Invoice downloaded successfully');
  };

  const handleShareOrder = () => {
    setShowShareModal(true);
  };

  const handleContactSupport = () => {
    setShowContactModal(true);
  };

  const handleNotificationToggle = (type) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    toast.success(`${type.toUpperCase()} notifications ${!notifications[type] ? 'enabled' : 'disabled'}`);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'info';
      case 'in_transit':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <FaClock className="text-warning" />;
      case 'processing':
        return <FaInfoCircle className="text-info" />;
      case 'in_transit':
        return <FaTruck className="text-primary" />;
      case 'delivered':
        return <FaCheckCircle className="text-success" />;
      case 'cancelled':
        return <FaExclamationCircle className="text-danger" />;
      default:
        return <FaInfoCircle className="text-secondary" />;
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await axios.post(`/orders/${id}/report`, {
        reason: reportReason,
        description: reportDescription
      });
      
      toast.success('Report submitted successfully');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(error.response?.data?.error || 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (!order || !trackingInfo) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          Tracking information not found
        </div>
      </div>
    );
  }

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
          Back to Order Details
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
            onClick={() => setShowQR(!showQR)}
            style={{ color: '#001f3f', borderColor: '#001f3f' }}
          >
            <FaQrcode className="me-2" />
            QR Code
          </button>
          <button 
            className="btn btn-outline-danger ms-2"
            onClick={() => setShowReportModal(true)}
          >
            <FaExclamationCircle className="me-2" />
            Report Order
          </button>
        </div>
      </div>

      {/* Order Status Banner */}
      <div className="card mb-4 bg-light">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h5 className="mb-0">Order #{order.id}</h5>
              <p className="text-muted mb-0">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="col-md-6 text-md-end">
              <span className={`badge bg-${getStatusColor(order.status)} fs-6`}>
                {order.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          {/* Tracking Timeline */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="card-title mb-0">Order Tracking</h5>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleContactSupport}
                  style={{ color: '#001f3f', borderColor: '#001f3f' }}
                >
                  <FaPhone className="me-2" />
                  Contact Support
                </button>
              </div>
              <div className="timeline">
                {trackingInfo.history.map((event, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="d-flex align-items-center mb-2">
                        {getStatusIcon(event.status)}
                        <h6 className="mb-0 ms-2">{event.status}</h6>
                      </div>
                      <p className="text-muted mb-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="text-muted mb-0">
                          <FaMapMarkerAlt className="me-2" />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-muted mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Details */}
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
                  <p className="mb-0">GH₵{order.total?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Delivery Information */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Delivery Information</h5>
              <div className="mb-3">
                <h6>Estimated Delivery</h6>
                <p className="text-muted">
                  {estimatedDelivery ? estimatedDelivery.toLocaleString() : 'Not available'}
                </p>
              </div>
              {trackingInfo.currentLocation && (
                <div className="mb-3">
                  <h6>Current Location</h6>
                  <p className="text-muted">
                    <FaMapMarkerAlt className="me-2" />
                    {trackingInfo.currentLocation}
                  </p>
                </div>
              )}
              {trackingInfo.carrier && (
                <div className="mb-3">
                  <h6>Carrier</h6>
                  <p className="text-muted">{trackingInfo.carrier}</p>
                </div>
              )}
              <div className="mb-3">
                <h6>Tracking ID</h6>
                <p className="text-muted">{order.trackingId || 'Not assigned'}</p>
              </div>
            </div>
          </div>

          {/* Notifications Settings */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Delivery Updates</h5>
              <div className="alert alert-info">
                <FaInfoCircle className="me-2" />
                This page automatically updates every 30 seconds
              </div>
              <div className="d-grid gap-2">
                <button 
                  className={`btn ${notifications.email ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleNotificationToggle('email')}
                  style={{ color: notifications.email ? 'white' : '#001f3f', borderColor: '#001f3f' }}
                >
                  <FaEnvelope className="me-2" />
                  {notifications.email ? 'Email Notifications Enabled' : 'Enable Email Notifications'}
                </button>
                <button 
                  className={`btn ${notifications.sms ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleNotificationToggle('sms')}
                  style={{ color: notifications.sms ? 'white' : '#001f3f', borderColor: '#001f3f' }}
                >
                  <FaPhone className="me-2" />
                  {notifications.sms ? 'SMS Notifications Enabled' : 'Enable SMS Notifications'}
                </button>
                <button 
                  className={`btn ${notifications.whatsapp ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleNotificationToggle('whatsapp')}
                  style={{ color: notifications.whatsapp ? 'white' : '#001f3f', borderColor: '#001f3f' }}
                >
                  <FaWhatsapp className="me-2" />
                  {notifications.whatsapp ? 'WhatsApp Notifications Enabled' : 'Enable WhatsApp Notifications'}
                </button>
              </div>
            </div>
          </div>

          {/* Security & Analytics */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-4">Security & Tracking</h5>
              
              {/* Security Section */}
              <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                  <FaUserShield className="me-2 text-success" style={{ fontSize: '1.5rem' }} />
                  <div>
                    <h6 className="mb-0">Order Protection</h6>
                    <small className="text-muted">Secure delivery tracking</small>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-3">
                  <FaLock className="me-2 text-primary" style={{ fontSize: '1.5rem' }} />
                  <div>
                    <h6 className="mb-0">Transaction Verified</h6>
                    <small className="text-muted">Secure payment processing</small>
                  </div>
                </div>
                <button 
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setShowSecurityDetails(!showSecurityDetails)}
                  style={{ color: '#001f3f' }}
                >
                  View Security Details
                </button>
              </div>

              {/* Analytics Section - Only visible to admin/enterprise users */}
              {userRole === 'admin' || userRole === 'enterprise' ? (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <FaChartBar className="me-2 text-primary" style={{ fontSize: '1.5rem' }} />
                    <div>
                      <h6 className="mb-0">Performance Metrics</h6>
                      <small className="text-muted">Enterprise analytics</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <FaChartPie className="me-2 text-success" style={{ fontSize: '1.5rem' }} />
                    <div>
                      <h6 className="mb-0">Business Intelligence</h6>
                      <small className="text-muted">Advanced insights</small>
                    </div>
                  </div>
                  <button 
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    style={{ color: '#001f3f' }}
                  >
                    View Analytics Dashboard
                  </button>
                </div>
              ) : (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <FaChartLine className="me-2 text-primary" style={{ fontSize: '1.5rem' }} />
                    <div>
                      <h6 className="mb-0">Tracking Updates</h6>
                      <small className="text-muted">Real-time status updates</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-3">
                    <FaBell className="me-2 text-success" style={{ fontSize: '1.5rem' }} />
                    <div>
                      <h6 className="mb-0">Delivery Notifications</h6>
                      <small className="text-muted">Stay informed about your order</small>
                    </div>
                  </div>
                </div>
              )}
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
                        value={`${window.location.origin}/track/${order.id}`}
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
                        <label className="text-muted d-block">Estimated Delivery</label>
                        <p className="mb-0">
                          {estimatedDelivery ? estimatedDelivery.toLocaleString() : 'Not available'}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="text-muted d-block">Tracking ID</label>
                        <p className="mb-0">{order.trackingId || 'Not assigned'}</p>
                      </div>
                      <div className="d-grid gap-2 mt-4">
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/track/${order.id}`);
                            toast.success('Tracking link copied to clipboard');
                          }}
                        >
                          <FaShare className="me-2" />
                          Copy Tracking Link
                        </button>
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => {
                            // Implement download QR code as image
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
                    <FaEnvelope className="me-2" />
                    Share via Email
                  </button>
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaWhatsapp className="me-2" />
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

      {/* Contact Support Modal */}
      {showContactModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Contact Support</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowContactModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaPhone className="me-2" />
                    Call Support
                  </button>
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaWhatsapp className="me-2" />
                    WhatsApp Support
                  </button>
                  <button 
                    className="btn btn-outline-primary"
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaEnvelope className="me-2" />
                    Email Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Enterprise Analytics Dashboard</h5>
                <div className="d-flex align-items-center">
                  <select 
                    className="form-select form-select-sm me-2" 
                    style={{ width: 'auto' }}
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowAnalytics(false)}></button>
                </div>
              </div>
              <div className="modal-body">
                {/* Key Performance Indicators */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="card-title text-muted mb-1">Delivery Success Rate</h6>
                            <h3 className="mb-0">98.5%</h3>
                            <small className="text-success">↑ 2.3% from last period</small>
                          </div>
                          <FaTachometerAlt className="text-primary" style={{ fontSize: '2rem' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="card-title text-muted mb-1">Average Delivery Time</h6>
                            <h3 className="mb-0">2.4h</h3>
                            <small className="text-success">↓ 0.3h from last period</small>
                          </div>
                          <FaRegClock className="text-success" style={{ fontSize: '2rem' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="card-title text-muted mb-1">Customer Satisfaction</h6>
                            <h3 className="mb-0">4.8/5</h3>
                            <small className="text-success">↑ 0.2 from last period</small>
                          </div>
                          <FaUsers className="text-info" style={{ fontSize: '2rem' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="card-title text-muted mb-1">Revenue Impact</h6>
                            <h3 className="mb-0">+15.3%</h3>
                            <small className="text-success">↑ 3.2% from last period</small>
                          </div>
                          <FaMoneyBillWave className="text-success" style={{ fontSize: '2rem' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Analytics */}
                <div className="row mb-4">
                  <div className="col-md-8">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="card-title mb-0">Operational Efficiency</h6>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className={`btn ${selectedMetric === 'performance' ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => setSelectedMetric('performance')}
                            >
                              Performance
                            </button>
                            <button 
                              className={`btn ${selectedMetric === 'efficiency' ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => setSelectedMetric('efficiency')}
                            >
                              Efficiency
                            </button>
                            <button 
                              className={`btn ${selectedMetric === 'cost' ? 'btn-primary' : 'btn-outline-primary'}`}
                              onClick={() => setSelectedMetric('cost')}
                            >
                              Cost
                            </button>
                          </div>
                        </div>
                        <div className="table-responsive">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Stage</th>
                                <th>Duration</th>
                                <th>Efficiency</th>
                                <th>Cost Impact</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <FaWarehouse className="me-2 text-primary" />
                                    Order Processing
                                  </div>
                                </td>
                                <td>2.1h</td>
                                <td>
                                  <div className="progress" style={{ height: '6px' }}>
                                    <div className="progress-bar bg-success" style={{ width: '98%' }}></div>
                                  </div>
                                  <small>98%</small>
                                </td>
                                <td className="text-success">-12%</td>
                                <td><span className="badge bg-success">Optimal</span></td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <FaRoute className="me-2 text-info" />
                                    Warehouse Handling
                                  </div>
                                </td>
                                <td>4.2h</td>
                                <td>
                                  <div className="progress" style={{ height: '6px' }}>
                                    <div className="progress-bar bg-success" style={{ width: '95%' }}></div>
                                  </div>
                                  <small>95%</small>
                                </td>
                                <td className="text-success">-8%</td>
                                <td><span className="badge bg-success">Optimal</span></td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <FaTruck className="me-2 text-warning" />
                                    Transit
                                  </div>
                                </td>
                                <td>24.5h</td>
                                <td>
                                  <div className="progress" style={{ height: '6px' }}>
                                    <div className="progress-bar bg-warning" style={{ width: '92%' }}></div>
                                  </div>
                                  <small>92%</small>
                                </td>
                                <td className="text-warning">+3%</td>
                                <td><span className="badge bg-warning">Average</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="card-title mb-3">Business Impact Analysis</h6>
                        <div className="mb-4">
                          <h6 className="text-muted mb-2">Cost Efficiency</h6>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>Processing</span>
                            <span className="text-success">-12%</span>
                          </div>
                          <div className="progress mb-3" style={{ height: '6px' }}>
                            <div className="progress-bar bg-success" style={{ width: '88%' }}></div>
                          </div>
                        </div>
                        <div className="mb-4">
                          <h6 className="text-muted mb-2">Time Optimization</h6>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>Handling</span>
                            <span className="text-success">-8%</span>
                          </div>
                          <div className="progress mb-3" style={{ height: '6px' }}>
                            <div className="progress-bar bg-success" style={{ width: '92%' }}></div>
                          </div>
                        </div>
                        <div>
                          <h6 className="text-muted mb-2">Resource Utilization</h6>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>Efficiency</span>
                            <span className="text-success">+15%</span>
                          </div>
                          <div className="progress mb-3" style={{ height: '6px' }}>
                            <div className="progress-bar bg-success" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Predictive Analytics */}
                <div className="row">
                  <div className="col-md-12">
                    <div className="card">
                      <div className="card-body">
                        <h6 className="card-title mb-3">Predictive Analytics & Insights</h6>
                        <div className="row">
                          <div className="col-md-4">
                            <div className="alert alert-info mb-0">
                              <h6 className="alert-heading">Delivery Optimization</h6>
                              <p className="mb-0">AI predicts 15% faster delivery times with route optimization</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="alert alert-success mb-0">
                              <h6 className="alert-heading">Cost Reduction</h6>
                              <p className="mb-0">Potential 8% cost reduction through process automation</p>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="alert alert-warning mb-0">
                              <h6 className="alert-heading">Risk Mitigation</h6>
                              <p className="mb-0">Early warning system detects 92% of potential delays</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Details Modal */}
      {showSecurityDetails && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Security Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowSecurityDetails(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <h6 className="mb-3">Transaction Security</h6>
                  <div className="d-flex align-items-center mb-2">
                    <FaShieldAlt className="me-2 text-success" />
                    <div>
                      <p className="mb-0">Payment Verified</p>
                      <small className="text-muted">Secure payment gateway</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FaLock className="me-2 text-primary" />
                    <div>
                      <p className="mb-0">Data Encryption</p>
                      <small className="text-muted">256-bit SSL encryption</small>
                    </div>
                  </div>
                </div>
                <div>
                  <h6 className="mb-3">Order Protection</h6>
                  <div className="d-flex align-items-center mb-2">
                    <FaUserShield className="me-2 text-success" />
                    <div>
                      <p className="mb-0">Identity Verified</p>
                      <small className="text-muted">Multi-factor authentication</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center">
                    <FaChartLine className="me-2 text-primary" />
                    <div>
                      <p className="mb-0">Fraud Prevention</p>
                      <small className="text-muted">AI-powered detection</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Order Modal */}
      {showReportModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Report Order Issue</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReportModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Reason for Report</label>
                  <select 
                    className="form-select"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="">Select a reason</option>
                    <option value="delayed_delivery">Delayed Delivery</option>
                    <option value="package_not_received">Package Not Received</option>
                    <option value="damaged_package">Damaged Package</option>
                    <option value="wrong_item">Wrong Item Received</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Additional Details</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Please provide more details about the issue..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                  ></textarea>
                </div>
                <div className="alert alert-info">
                  <FaInfoCircle className="me-2" />
                  This report will be reviewed by our support team and the vendor.
                </div>
                <div className="d-grid">
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitReport}
                    disabled={isSubmittingReport}
                    style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}
                  >
                    {isSubmittingReport ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaExclamationCircle className="me-2" />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
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
      `}</style>
    </div>
  );
};

export default TrackOrder; 