import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import { FaExclamationCircle, FaCheckCircle, FaClock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const CustomerReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/orders/reports', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReports(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      const response = await axios.put(`/admin/reports/${reportId}`, {
        status: newStatus,
        adminResponse
      });
      
      // Update the local state
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus, adminResponse }
          : report
      ));
      
      setShowModal(false);
      setAdminResponse('');
      
      // Show success message
      toast.success(`Report marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error(error.response?.data?.error || 'Failed to update report status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge bg-warning"><FaClock className="me-1" /> Pending</span>;
      case 'resolved':
        return <span className="badge bg-success"><FaCheckCircle className="me-1" /> Resolved</span>;
      case 'in_progress':
        return <span className="badge bg-info"><FaClock className="me-1" /> In Progress</span>;
      case 'rejected':
        return <span className="badge bg-danger"><FaExclamationCircle className="me-1" /> Rejected</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      report.orderId.toString().includes(searchQuery) ||
      report.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container my-4">
      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-0">Customer Reports</h3>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: 150 }}>
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No customer reports found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Vendor</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <span className="fw-semibold">#{report.orderId}</span>
                      </td>
                      <td>
                        <span className="fw-semibold">{report.user?.name || '-'}</span>
                        <br />
                        <span className="text-muted small">{report.user?.email}</span>
                      </td>
                      <td>
                        <span className="fw-semibold">{report.vendor?.name || '-'}</span>
                      </td>
                      <td>
                        <span className="text-capitalize">{report.reason ? report.reason.replace(/_/g, ' ') : '-'}</span>
                        {report.description && (
                          <p className="text-muted small mb-0 mt-1">{report.description}</p>
                        )}
                      </td>
                      <td>{getStatusBadge(report.status)}</td>
                      <td>
                        <span className="text-muted small">
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowModal(true);
                          }}
                          style={{ backgroundColor: '#001f3f', color: 'white' }}
                        >
                          View Details
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

      {/* Report Details Modal */}
      {showModal && selectedReport && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#001f3f', color: 'white' }}>
                <h5 className="modal-title">Report Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Order Information</h6>
                    <p><strong>Order ID:</strong> #{selectedReport.orderId}</p>
                    <p><strong>Status:</strong> {selectedReport.orderStatus}</p>
                    <p><strong>Reported On:</strong> {new Date(selectedReport.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Customer Information</h6>
                    <p><strong>Name:</strong> {selectedReport.user?.name}</p>
                    <p><strong>Email:</strong> {selectedReport.user?.email}</p>
                    <p><strong>Phone:</strong> {selectedReport.user?.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h6>Report Details</h6>
                  <p><strong>Reason:</strong> <span className="text-capitalize">{selectedReport.reason ? selectedReport.reason.replace(/_/g, ' ') : '-'}</span></p>
                  <p><strong>Description:</strong></p>
                  <div className="p-3 bg-light rounded">
                    {selectedReport.description || 'No additional details provided.'}
                  </div>
                </div>

                <div className="mb-4">
                  <h6>Vendor Information</h6>
                  <p><strong>Name:</strong> {selectedReport.vendor?.name}</p>
                  <p><strong>Email:</strong> {selectedReport.vendor?.email}</p>
                  <p><strong>Phone:</strong> {selectedReport.vendor?.phone || 'N/A'}</p>
                </div>

                <div className="mb-4">
                  <h6>Admin Response</h6>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter your response..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                  ></textarea>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={() => handleStatusUpdate(selectedReport.id, 'resolved')}
                    style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaCheckCircle className="me-2" />
                    Mark as Resolved
                  </button>
                  <button
                    className="btn btn-info"
                    onClick={() => handleStatusUpdate(selectedReport.id, 'in_progress')}
                  >
                    <FaClock className="me-2" />
                    Mark as In Progress
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleStatusUpdate(selectedReport.id, 'rejected')}
                  >
                    <FaExclamationCircle className="me-2" />
                    Reject Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .card {
          border-radius: 1rem;
        }
        .table th, .table td {
          vertical-align: middle !important;
        }
        .table th {
          font-size: 1rem;
        }
        .table td {
          font-size: 0.97rem;
        }
        .badge {
          font-size: 0.85rem;
          padding: 0.5em 0.8em;
        }
      `}</style>
    </div>
  );
};

export default CustomerReport; 