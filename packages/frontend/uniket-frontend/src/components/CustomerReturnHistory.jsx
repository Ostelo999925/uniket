import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { FaEye, FaTimes, FaClock, FaCheck, FaTimes as FaReject, FaMoneyBillWave } from 'react-icons/fa';

const CustomerReturnHistory = () => {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchReturnRequests();
  }, []);

  const fetchReturnRequests = async () => {
    try {
      const response = await axios.get('/returns/customer');
      setReturnRequests(response.data);
    } catch (error) {
      console.error('Error fetching return requests:', error);
      toast.error('Failed to fetch return requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (returnRequest) => {
    setSelectedReturn(returnRequest);
    setShowDetailsModal(true);
  };

  const handleCancelRequest = async (returnRequestId) => {
    if (!window.confirm('Are you sure you want to cancel this return request?')) {
      return;
    }

    try {
      await axios.put(`/returns/customer/${returnRequestId}/cancel`);
      toast.success('Return request cancelled successfully');
      fetchReturnRequests();
    } catch (error) {
      console.error('Error cancelling return request:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel return request');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { class: 'warning', text: 'Pending Review', icon: <FaClock /> },
      APPROVED: { class: 'success', text: 'Approved', icon: <FaCheck /> },
      REJECTED: { class: 'danger', text: 'Rejected', icon: <FaReject /> },
      REFUNDED: { class: 'info', text: 'Refunded', icon: <FaMoneyBillWave /> },
      CANCELLED: { class: 'secondary', text: 'Cancelled', icon: <FaTimes /> }
    };

    const config = statusConfig[status] || { class: 'secondary', text: status, icon: <FaClock /> };
    return (
      <span className={`badge bg-${config.class} d-flex align-items-center gap-1`}>
        {config.icon} {config.text}
      </span>
    );
  };

  const getReasonLabel = (reason) => {
    const reasonLabels = {
      DEFECTIVE: 'Defective Product',
      WRONG_ITEM: 'Wrong Item Received',
      DAMAGED: 'Damaged in Transit',
      SIZE_ISSUE: 'Size/Color Issue',
      QUALITY_ISSUE: 'Quality Not as Expected',
      OTHER: 'Other'
    };
    return reasonLabels[reason] || reason;
  };

  const getStatusTimeline = (returnRequest) => {
    const timeline = [
      {
        status: 'PENDING',
        label: 'Request Submitted',
        description: 'Your return request has been submitted and is under review',
        date: returnRequest.createdAt,
        completed: true
      }
    ];

    if (returnRequest.status !== 'PENDING' && returnRequest.status !== 'CANCELLED') {
      timeline.push({
        status: 'REVIEWED',
        label: 'Request Reviewed',
        description: returnRequest.status === 'APPROVED' 
          ? 'Your return request has been approved' 
          : 'Your return request has been rejected',
        date: returnRequest.updatedAt,
        completed: true
      });
    }

    if (returnRequest.status === 'REFUNDED') {
      timeline.push({
        status: 'REFUNDED',
        label: 'Refund Processed',
        description: `Refund of GH₵${returnRequest.refundAmount?.toFixed(2)} has been processed`,
        date: returnRequest.updatedAt,
        completed: true
      });
    }

    if (returnRequest.status === 'CANCELLED') {
      timeline.push({
        status: 'CANCELLED',
        label: 'Request Cancelled',
        description: 'You cancelled this return request',
        date: returnRequest.updatedAt,
        completed: true
      });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>My Return Requests</h4>
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={fetchReturnRequests}
        >
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {returnRequests.length === 0 ? (
        <div className="text-center text-muted p-5">
          <div className="mb-3">
            <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
          </div>
          <h5>No Return Requests</h5>
          <p>You haven't submitted any return requests yet.</p>
        </div>
      ) : (
        <div className="row">
          {returnRequests.map((returnRequest) => (
            <div key={returnRequest.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Return #{returnRequest.id}</h6>
                  {getStatusBadge(returnRequest.status)}
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={returnRequest.order.product.image}
                      alt={returnRequest.order.product.name}
                      className="me-3"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                    <div>
                      <h6 className="mb-1">{returnRequest.order.product.name}</h6>
                      <small className="text-muted">Order #{returnRequest.orderId}</small>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Reason:</strong> {getReasonLabel(returnRequest.reason)}
                  </div>
                  
                  <div className="mb-3">
                    <strong>Amount:</strong> GH₵{returnRequest.refundAmount?.toFixed(2) || returnRequest.order.total}
                  </div>
                  
                  <div className="mb-3">
                    <strong>Date:</strong> {new Date(returnRequest.createdAt).toLocaleDateString()}
                  </div>

                  {returnRequest.adminNotes && (
                    <div className="mb-3">
                      <strong>Vendor Notes:</strong>
                      <p className="text-muted small mb-0">{returnRequest.adminNotes}</p>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary flex-fill"
                      onClick={() => handleViewDetails(returnRequest)}
                    >
                      <FaEye /> View Details
                    </button>
                    {returnRequest.status === 'PENDING' && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleCancelRequest(returnRequest.id)}
                        title="Cancel Request"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedReturn && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1040,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content" style={{
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              backgroundColor: 'white'
            }}>
              <div className="modal-header" style={{
                backgroundColor: '#001f3f',
                color: 'white',
                borderBottom: 'none',
                padding: '1.5rem 2rem',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="modal-title" style={{ 
                  fontSize: '1.4rem', 
                  fontWeight: '500',
                  margin: 0
                }}>
                  Return Request Details #{selectedReturn.id}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem', backgroundColor: 'white' }}>
                {/* Product Information */}
                <div className="card mb-3" style={{
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div className="card-header" style={{
                    backgroundColor: 'transparent',
                    borderBottom: '2px solid #e9ecef',
                    padding: '1rem 1.5rem'
                  }}>
                    <h6 className="mb-0" style={{ 
                      color: '#001f3f', 
                      fontWeight: '600',
                      fontSize: '1.1rem'
                    }}>
                      Product Information
                    </h6>
                  </div>
                  <div className="card-body" style={{ padding: '1.5rem' }}>
                    <div className="row">
                      <div className="col-md-3">
                        <img
                          src={selectedReturn.order.product.image}
                          alt={selectedReturn.order.product.name}
                          className="img-fluid rounded"
                          style={{ 
                            maxHeight: '100px', 
                            objectFit: 'cover',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            border: '3px solid white'
                          }}
                        />
                      </div>
                      <div className="col-md-9">
                        <h6 style={{ 
                          color: '#000', 
                          fontWeight: '600',
                          marginBottom: '0.5rem'
                        }}>
                          {selectedReturn.order.product.name}
                        </h6>
                        <p className="text-muted mb-2" style={{ color: '#666' }}>
                          {selectedReturn.order.product.description}
                        </p>
                        <div className="row" style={{ fontSize: '0.9rem', color: '#333' }}>
                          <div className="col-6">
                            <strong>Order ID:</strong> #{selectedReturn.orderId}
                          </div>
                          <div className="col-6">
                            <strong>Vendor:</strong> {selectedReturn.vendor.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Details */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Return Details</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Reason:</strong> {getReasonLabel(selectedReturn.reason)}</p>
                        <p><strong>Return Type:</strong> {selectedReturn.returnType}</p>
                        <p><strong>Requested Amount:</strong> GH₵{selectedReturn.refundAmount?.toFixed(2)}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Status:</strong> {getStatusBadge(selectedReturn.status)}</p>
                        <p><strong>Submitted:</strong> {new Date(selectedReturn.createdAt).toLocaleString()}</p>
                        <p><strong>Last Updated:</strong> {new Date(selectedReturn.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <strong>Description:</strong>
                      <p className="text-muted">{selectedReturn.description}</p>
                    </div>
                  </div>
                </div>

                {/* Images */}
                {selectedReturn.images && JSON.parse(selectedReturn.images || '[]').length > 0 && (
                  <div className="card mb-3">
                    <div className="card-header">
                      <h6 className="mb-0">Supporting Images</h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        {JSON.parse(selectedReturn.images || '[]').map((image, index) => (
                          <div key={index} className="col-md-4 mb-2">
                            <img
                              src={image}
                              alt={`Return ${index + 1}`}
                              className="img-fluid rounded"
                              style={{ height: '150px', objectFit: 'cover', width: '100%' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor Notes */}
                {selectedReturn.adminNotes && (
                  <div className="card mb-3">
                    <div className="card-header">
                      <h6 className="mb-0">Vendor Response</h6>
                    </div>
                    <div className="card-body">
                      <p className="mb-0">{selectedReturn.adminNotes}</p>
                    </div>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Status Timeline</h6>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      {getStatusTimeline(selectedReturn).map((item, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-marker bg-success"></div>
                          <div className="timeline-content">
                            <h6 className="mb-1">{item.label}</h6>
                            <p className="text-muted mb-1">{item.description}</p>
                            <small className="text-muted">
                              {new Date(item.date).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                {selectedReturn.status === 'PENDING' && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      handleCancelRequest(selectedReturn.id);
                      setShowDetailsModal(false);
                    }}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 30px;
        }
        
        .timeline-item {
          position: relative;
          margin-bottom: 20px;
        }
        
        .timeline-marker {
          position: absolute;
          left: -35px;
          top: 5px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #28a745;
        }
        
        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: -29px;
          top: 17px;
          width: 2px;
          height: calc(100% + 10px);
          background-color: #dee2e6;
        }
        
        .timeline-content {
          padding-left: 10px;
        }
      `}</style>
    </div>
  );
};

export default CustomerReturnHistory; 