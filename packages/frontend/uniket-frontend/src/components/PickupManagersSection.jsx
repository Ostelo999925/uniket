import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const PickupManagersSection = () => {
  const [managers, setManagers] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    phone: '',
    pickupPointId: ''
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

  // Fetch all pickup managers
  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/pickup-managers');
      setManagers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch pickup managers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available pickup points
  const fetchPickupPoints = async () => {
    try {
      const res = await axios.get('/admin/pickup-points');
      // Filter out pickup points that already have managers
      const availablePoints = res.data.filter(point => !point.managerId);
      setPickupPoints(availablePoints);
    } catch (err) {
      toast.error('Failed to fetch pickup points');
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchPickupPoints();
  }, []);

  // Handle add form change
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle edit form change
  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Add new pickup manager
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/admin/pickup-managers', form);
      toast.success('Pickup manager created and assigned to pickup point');
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', phone: '', pickupPointId: '' });
      fetchManagers();
      fetchPickupPoints(); // Refresh pickup points list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create pickup manager');
    }
  };

  // Start editing
  const startEdit = (manager) => {
    setEditId(manager.id);
    setEditForm({ name: manager.name, email: manager.email, phone: manager.phone });
    setShowEdit(true);
  };

  // Submit edit
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/admin/pickup-managers/${editId}`, editForm);
      toast.success('Pickup manager updated');
      setShowEdit(false);
      setEditId(null);
      fetchManagers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update pickup manager');
    }
  };

  // Deactivate
  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this pickup manager?')) return;
    try {
      await axios.put(`/admin/pickup-managers/${id}/deactivate`);
      toast.success('Pickup manager deactivated');
      fetchManagers();
      fetchPickupPoints(); // Refresh pickup points list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate pickup manager');
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: '#001f3f' }}>Pickup Managers</h2>
        <button 
          className="btn px-4 py-2 d-flex align-items-center gap-2" 
          style={{
            backgroundColor: '#001f3f',
            borderColor: '#001f3f',
            color: 'white'
          }}
          onClick={() => {
            if (pickupPoints.length === 0) {
              toast.warning('No available pickup points. Please create a pickup point first.');
              return;
            }
            setShowAdd(true);
          }}
        >
          <i className="fas fa-plus"></i>
          Add Pickup Manager
        </button>
      </div>
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Pickup Point</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No pickup managers found
                    </td>
                  </tr>
                ) : (
                  managers.map(m => (
                    <tr key={m.id}>
                      <td className="px-4 py-3">{m.name}</td>
                      <td className="px-4 py-3">{m.email}</td>
                      <td className="px-4 py-3">{m.phone}</td>
                      <td className="px-4 py-3">
                        {m.pickuppoint ? (
                          <div>
                            <div className="fw-semibold">{m.pickuppoint.name}</div>
                            <small className="text-muted">
                              {m.pickuppoint.location}, {m.pickuppoint.school}
                            </small>
                          </div>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.isActive ? (
                          <span className="badge bg-success-subtle text-success px-3 py-2">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary px-3 py-2">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="d-flex justify-content-center gap-2">
                          <button 
                            className="btn btn-outline-primary btn-sm px-3"
                            onClick={() => startEdit(m)} 
                            disabled={!m.isActive}
                            title={!m.isActive ? "Cannot edit inactive manager" : "Edit manager"}
                          >
                            <i className="fas fa-edit me-2"></i>
                            Edit
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm px-3"
                            onClick={() => handleDeactivate(m.id)} 
                            disabled={!m.isActive}
                            title={!m.isActive ? "Manager already inactive" : "Deactivate manager"}
                          >
                            <i className="fas fa-user-slash me-2"></i>
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
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
          <div className="modal-dialog modal-dialog-centered">
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
                  Add Pickup Manager
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAdd(false)}></button>
              </div>
              <form onSubmit={handleAdd}>
                <div className="modal-body" style={{ padding: '2rem', backgroundColor: 'white' }}>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="name" 
                      value={form.name} 
                      onChange={handleFormChange} 
                      required 
                      placeholder="Enter full name"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="email" 
                      value={form.email} 
                      onChange={handleFormChange} 
                      required 
                      placeholder="Enter email address"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Phone</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="phone" 
                      value={form.phone} 
                      onChange={handleFormChange} 
                      required 
                      placeholder="Enter phone number"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="password" 
                      value={form.password} 
                      onChange={handleFormChange} 
                      required 
                      minLength={8}
                      placeholder="Enter password (min. 8 characters)"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Assign to Pickup Point</label>
                    <select 
                      className="form-select" 
                      name="pickupPointId" 
                      value={form.pickupPointId} 
                      onChange={handleFormChange}
                      required
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    >
                      <option value="">Select a pickup point</option>
                      {pickupPoints.map(point => (
                        <option key={point.id} value={point.id}>
                          {point.name} ({point.location}, {point.school})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer" style={{ 
                  borderTop: '2px solid #e9ecef',
                  padding: '1.5rem 2rem',
                  backgroundColor: '#f8f9fa'
                }}>
                  <button type="button" className="btn btn-secondary px-4" onClick={() => setShowAdd(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4" style={{
                    backgroundColor: '#001f3f',
                    borderColor: '#001f3f'
                  }}>
                    Add Manager
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
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
          <div className="modal-dialog modal-dialog-centered">
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
                  Edit Pickup Manager
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEdit(false)}></button>
              </div>
              <form onSubmit={handleEdit}>
                <div className="modal-body" style={{ padding: '2rem', backgroundColor: 'white' }}>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="name" 
                      value={editForm.name} 
                      onChange={handleEditFormChange} 
                      required 
                      placeholder="Enter full name"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="email" 
                      value={editForm.email} 
                      onChange={handleEditFormChange} 
                      required 
                      placeholder="Enter email address"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" style={{ color: '#000', fontWeight: '500' }}>Phone</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="phone" 
                      value={editForm.phone} 
                      onChange={handleEditFormChange} 
                      required 
                      placeholder="Enter phone number"
                      style={{ border: '2px solid #dee2e6', borderRadius: '8px' }}
                    />
                  </div>
                </div>
                <div className="modal-footer" style={{ 
                  borderTop: '2px solid #e9ecef',
                  padding: '1.5rem 2rem',
                  backgroundColor: '#f8f9fa'
                }}>
                  <button type="button" className="btn btn-secondary px-4" onClick={() => setShowEdit(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4" style={{
                    backgroundColor: '#001f3f',
                    borderColor: '#001f3f'
                  }}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupManagersSection; 