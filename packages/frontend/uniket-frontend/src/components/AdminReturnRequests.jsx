import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { FaEye, FaCheck, FaTimes, FaMoneyBillWave, FaChartBar, FaClock, FaFilter, FaDownload } from 'react-icons/fa';

const AdminReturnRequests = () => {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    vendor: '',
    customer: '',
    dateRange: ''
  });
  const [statistics, setStatistics] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    approvedReturns: 0,
    rejectedReturns: 0,
    refundedReturns: 0,
    totalRefunded: 0,
    averageProcessingTime: 0
  });

  useEffect(() => {
    fetchReturnRequests();
    fetchStatistics();
  }, []);

  const fetchReturnRequests = async () => {
    try {
      const response = await axios.get('/admin/returns');
      setReturnRequests(response.data);
    } catch (error) {
      console.error('Error fetching return requests:', error);
      toast.error('Failed to fetch return requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/admin/returns/stats');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleViewDetails = (returnRequest) => {
    setSelectedReturn(returnRequest);
    setShowDetailsModal(true);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getFilteredReturns = () => {
    let filtered = returnRequests;

    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.vendor) {
      filtered = filtered.filter(r => 
        r.vendor.name.toLowerCase().includes(filters.vendor.toLowerCase())
      );
    }

    if (filters.customer) {
      filtered = filtered.filter(r => 
        r.customer.name.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.dateRange) {
      const now = new Date();
      const daysAgo = parseInt(filters.dateRange);
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      filtered = filtered.filter(r => new Date(r.createdAt) >= cutoffDate);
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filteredData = getFilteredReturns();
    const csvContent = [
      ['ID', 'Customer', 'Vendor', 'Product', 'Reason', 'Amount', 'Status', 'Created Date', 'Processed Date'],
      ...filteredData.map(r => [
        r.id,
        r.customer.name,
        r.vendor.name,
        r.order.product.name,
        r.reason,
        r.refundAmount || r.order.total,
        r.status,
        new Date(r.createdAt).toLocaleDateString(),
        r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `return-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { class: 'warning', text: 'Pending Review', icon: <FaClock /> },
      APPROVED: { class: 'success', text: 'Approved', icon: <FaCheck /> },
      REJECTED: { class: 'danger', text: 'Rejected', icon: <FaTimes /> },
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

  const calculateProcessingTime = (returnRequest) => {
    if (!returnRequest.reviewedAt) return null;
    
    const created = new Date(returnRequest.createdAt);
    const reviewed = new Date(returnRequest.reviewedAt);
    const diffHours = (reviewed - created) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return `${Math.round(diffHours)} hours`;
    } else {
      const days = Math.round(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
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

  const filteredReturns = getFilteredReturns();

  return (
    <div>
      <div className="admin-header">
        <h1>Return Requests Management</h1>
        <p className="text-muted">Monitor and track all return requests across the platform</p>
      </div>

      {/* Statistics Cards */}
      <div className="horizontal-scroll mb-4">
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <FaChartBar className="text-primary mb-2" style={{ fontSize: '2rem' }} />
              <h5 className="card-title">{statistics.totalReturns}</h5>
              <p className="card-text text-muted">Total Returns</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <FaClock className="text-warning mb-2" style={{ fontSize: '2rem' }} />
              <h5 className="card-title">{statistics.pendingReturns}</h5>
              <p className="card-text text-muted">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <FaMoneyBillWave className="text-success mb-2" style={{ fontSize: '2rem' }} />
              <h5 className="card-title">GH₵{statistics.totalRefunded.toFixed(2)}</h5>
              <p className="card-text text-muted">Total Refunded</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <div className="text-info mb-2" style={{ fontSize: '2rem' }}>⏱️</div>
              <h5 className="card-title">{statistics.averageProcessingTime.toFixed(1)}h</h5>
              <p className="card-text text-muted">Avg Processing Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaFilter className="me-2" />
            Filters & Actions
          </h5>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => {
              fetchReturnRequests();
              fetchStatistics();
            }}
          >
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="REFUNDED">Refunded</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Vendor</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search vendor..."
                value={filters.vendor}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Customer</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search customer..."
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Date Range</label>
              <select
                className="form-select"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="">All Time</option>
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-12">
              <button
                className="btn btn-outline-success"
                onClick={exportToCSV}
                disabled={filteredReturns.length === 0}
              >
                <FaDownload className="me-2" />
                Export to CSV ({filteredReturns.length} records)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Return Requests Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Return Requests ({filteredReturns.length})
          </h5>
          <div className="text-muted">
            Showing {filteredReturns.length} of {returnRequests.length} total
          </div>
        </div>
        <div className="card-body">
          {filteredReturns.length === 0 ? (
            <div className="text-center text-muted p-5">
              <div className="mb-3">
                <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
              </div>
              <h5>No Return Requests Found</h5>
              <p>No return requests match the current filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Vendor</th>
                    <th>Product</th>
                    <th>Reason</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Processing Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((returnRequest) => (
                    <tr key={returnRequest.id}>
                      <td>#{returnRequest.id}</td>
                      <td>
                        <div>
                          <div className="fw-bold">{returnRequest.customer.name}</div>
                          <small className="text-muted">{returnRequest.customer.email}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-bold">{returnRequest.vendor.name}</div>
                          <small className="text-muted">{returnRequest.vendor.email}</small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={returnRequest.order.product.image}
                            alt={returnRequest.order.product.name}
                            className="me-2"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div>
                            <div className="fw-bold">{returnRequest.order.product.name}</div>
                            <small className="text-muted">Order #{returnRequest.orderId}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-bold">{getReasonLabel(returnRequest.reason)}</div>
                          <small className="text-muted">
                            {returnRequest.description?.substring(0, 50)}...
                          </small>
                        </div>
                      </td>
                      <td>GH₵{returnRequest.refundAmount?.toFixed(2) || returnRequest.order.total}</td>
                      <td>{getStatusBadge(returnRequest.status)}</td>
                      <td>{new Date(returnRequest.createdAt).toLocaleDateString()}</td>
                      <td>
                        {calculateProcessingTime(returnRequest) ? (
                          <span className="text-muted">{calculateProcessingTime(returnRequest)}</span>
                        ) : (
                          <span className="text-warning">Pending</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewDetails(returnRequest)}
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
                {/* Customer Information */}
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
                      Customer Information
                    </h6>
                  </div>
                  <div className="card-body" style={{ padding: '1.5rem' }}>
                    <div className="row">
                      <div className="col-md-6">
                        <p style={{ color: '#000', fontWeight: '500' }}><strong>Name:</strong> {selectedReturn.customer.name}</p>
                        <p style={{ color: '#000', fontWeight: '500' }}><strong>Email:</strong> {selectedReturn.customer.email}</p>
                        <p style={{ color: '#000', fontWeight: '500' }}><strong>Phone:</strong> {selectedReturn.customer.phone}</p>
                      </div>
                      <div className="col-md-6">
                        <p style={{ color: '#000', fontWeight: '500' }}><strong>Vendor:</strong> {selectedReturn.vendor.name}</p>
                        <p style={{ color: '#000', fontWeight: '500' }}><strong>Vendor Email:</strong> {selectedReturn.vendor.email}</p>
                        <p style={{ color: '#000', fontWeight: '500' }}><strong>Order ID:</strong> #{selectedReturn.orderId}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Product Information</h6>
                  </div>
                  <div className="card-body">
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
                            <strong>Original Price:</strong> GH₵{selectedReturn.order.product.price}
                          </div>
                          <div className="col-6">
                            <strong>Order Total:</strong> GH₵{selectedReturn.order.total}
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
                        <p><strong>Status:</strong> {getStatusBadge(selectedReturn.status)}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Submitted:</strong> {new Date(selectedReturn.createdAt).toLocaleString()}</p>
                        <p><strong>Last Updated:</strong> {new Date(selectedReturn.updatedAt).toLocaleString()}</p>
                        {selectedReturn.reviewedAt && (
                          <p><strong>Reviewed:</strong> {new Date(selectedReturn.reviewedAt).toLocaleString()}</p>
                        )}
                        {selectedReturn.refundedAt && (
                          <p><strong>Refunded:</strong> {new Date(selectedReturn.refundedAt).toLocaleString()}</p>
                        )}
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

                {/* Processing Timeline */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Processing Timeline</h6>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-marker bg-primary"></div>
                        <div className="timeline-content">
                          <h6 className="mb-1">Return Request Submitted</h6>
                          <p className="text-muted mb-1">Customer submitted return request</p>
                          <small className="text-muted">
                            {new Date(selectedReturn.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </div>
                      
                      {selectedReturn.status !== 'PENDING' && selectedReturn.status !== 'CANCELLED' && (
                        <div className="timeline-item">
                          <div className="timeline-marker bg-success"></div>
                          <div className="timeline-content">
                            <h6 className="mb-1">Request Reviewed</h6>
                            <p className="text-muted mb-1">
                              Request was {selectedReturn.status.toLowerCase()} by vendor
                            </p>
                            <small className="text-muted">
                              {selectedReturn.reviewedAt ? new Date(selectedReturn.reviewedAt).toLocaleString() : 'N/A'}
                            </small>
                          </div>
                        </div>
                      )}

                      {selectedReturn.status === 'REFUNDED' && (
                        <div className="timeline-item">
                          <div className="timeline-marker bg-info"></div>
                          <div className="timeline-content">
                            <h6 className="mb-1">Refund Processed</h6>
                            <p className="text-muted mb-1">
                              Refund of GH₵{selectedReturn.refundAmount?.toFixed(2)} processed
                            </p>
                            <small className="text-muted">
                              {selectedReturn.refundedAt ? new Date(selectedReturn.refundedAt).toLocaleString() : 'N/A'}
                            </small>
                          </div>
                        </div>
                      )}

                      {selectedReturn.status === 'CANCELLED' && (
                        <div className="timeline-item">
                          <div className="timeline-marker bg-secondary"></div>
                          <div className="timeline-content">
                            <h6 className="mb-1">Request Cancelled</h6>
                            <p className="text-muted mb-1">Return request was cancelled</p>
                            <small className="text-muted">
                              {new Date(selectedReturn.updatedAt).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      )}
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

export default AdminReturnRequests; 