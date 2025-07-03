import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaUserCircle } from 'react-icons/fa';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    zipCode: '+233',
    country: 'Ghana'
  });
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: false,
    sms: false
  });
  const [showContactConfirmation, setShowContactConfirmation] = useState(false);
  const [contactDetails, setContactDetails] = useState({
    email: '',
    phone: ''
  });

  // Ghana regions and their cities
  const ghanaRegionsAndCities = {
    'Greater Accra': ['Accra', 'Tema', 'Madina', 'Adenta', 'East Legon', 'West Legon', 'Spintex', 'Dansoman', 'Osu', 'Labone'],
    'Ashanti': ['Kumasi', 'Obuasi', 'Ejisu', 'Mampong', 'Konongo', 'Bekwai', 'Juaso', 'Manso Nkwanta'],
    'Western': ['Sekondi', 'Takoradi', 'Tarkwa', 'Axim', 'Elubo', 'Prestea', 'Bogoso'],
    'Eastern': ['Koforidua', 'Nsawam', 'Suhum', 'Aburi', 'Akropong', 'Mpraeso', 'Asamankese'],
    'Central': ['Cape Coast', 'Winneba', 'Elmina', 'Saltpond', 'Dunkwa', 'Swedru', 'Kasoa'],
    'Northern': ['Tamale', 'Yendi', 'Bimbilla', 'Walewale', 'Savelugu', 'Damongo'],
    'Upper East': ['Bolgatanga', 'Bawku', 'Navrongo', 'Zuarungu', 'Sandema'],
    'Upper West': ['Wa', 'Tumu', 'Jirapa', 'Lawra', 'Nandom'],
    'Volta': ['Ho', 'Hohoe', 'Keta', 'Aflao', 'Kpando', 'Sogakope'],
    'Bono': ['Sunyani', 'Berekum', 'Dormaa Ahenkro', 'Wenchi', 'Techiman'],
    'Bono East': ['Techiman', 'Kintampo', 'Atebubu', 'Nkoranza', 'Yeji'],
    'Ahafo': ['Goaso', 'Kenyasi', 'Hwidiem', 'Bechem', 'Duayaw Nkwanta'],
    'Oti': ['Dambai', 'Jasikan', 'Kadjebi', 'Kpassa', 'Nkwanta'],
    'Western North': ['Sefwi Wiawso', 'Bibiani', 'Enchi', 'Asankragwa', 'Juaboso'],
    'Savannah': ['Damongo', 'Bole', 'Sawla', 'Larabanga', 'Daboya'],
    'North East': ['Nalerigu', 'Gambaga', 'Walewale', 'Bunkpurugu', 'Chereponi']
  };

  // Common countries and their codes
  const countryCodes = {
    'Ghana': '+233',
    'Nigeria': '+234',
    'Kenya': '+254',
    'South Africa': '+27',
    'United States': '+1',
    'United Kingdom': '+44',
    'Canada': '+1',
    'Australia': '+61',
    'China': '+86',
    'India': '+91',
    'Germany': '+49',
    'France': '+33',
    'Japan': '+81',
    'Brazil': '+55',
    'Russia': '+7'
  };

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          toast.error('Please log in to view your profile');
          navigate('/login');
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser || !parsedUser.id) {
          toast.error('Invalid user data');
          navigate('/login');
          return;
        }

        setUser(parsedUser);
        // Initialize form data with user data from localStorage
        setFormData({
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          address: parsedUser.address || '',
          city: parsedUser.city || '',
          region: parsedUser.region || '',
          zipCode: parsedUser.zipCode || '+233',
          country: parsedUser.country || 'Ghana'
        });
        await Promise.all([
          fetchUserData(),
          fetchOrders()
        ]);
      } catch (error) {
        console.error('Error initializing profile:', error);
        toast.error('Error loading profile data');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/users/profile');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/orders/user');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load orders');
      setOrders([]); // Set empty array on error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'country') {
      // Update both country and zipCode when country changes
      setFormData(prev => ({
        ...prev,
        country: value,
        zipCode: countryCodes[value] || '',
        city: '' // Reset city when country changes
      }));
    } else if (name === 'region') {
      // Reset city when region changes
      setFormData(prev => ({
        ...prev,
        region: value,
        city: ''
      }));
    } else if (name === 'city') {
      // Update city and auto-fill address
      const newAddress = `${value}, ${formData.region}, ${formData.country}`;
      setFormData(prev => ({
        ...prev,
        city: value,
        address: newAddress
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLocationClick = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Here you would typically use a reverse geocoding service
          // to get the address from coordinates
          const { latitude, longitude } = position.coords;
          toast.success('Location detected! Please select your region and city.');
          // You could integrate with a mapping service here to get the actual address
        },
        (error) => {
          toast.error('Unable to retrieve your location');
          console.error('Error getting location:', error);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('User data not available');
      return;
    }

    try {
      const response = await axios.put(`/user/${user.id}`, formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      
      // Update local storage with new user data
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (e) => {
    const { id, checked } = e.target;
    setNotificationPreferences(prev => ({
      ...prev,
      [id === 'emailNotif' ? 'email' : 'sms']: checked
    }));

    // Show contact confirmation if either preference is checked
    if (checked) {
      setShowContactConfirmation(true);
      // Pre-fill contact details from user data
      setContactDetails({
        email: user.email || '',
        phone: user.phone || ''
      });
    } else {
      // Hide confirmation if both preferences are unchecked
      if (!(id === 'emailNotif' ? notificationPreferences.sms : notificationPreferences.email)) {
        setShowContactConfirmation(false);
      }
    }
  };

  const handleContactConfirmation = async () => {
    try {
      // Update notification preferences
      const response = await axios.put(`/user/${user.id}/notifications`, {
        emailNotifications: notificationPreferences.email,
        smsNotifications: notificationPreferences.sms,
        email: contactDetails.email,
        phone: contactDetails.phone
      });

      toast.success('Notification preferences updated successfully');
      setShowContactConfirmation(false);

      // Update user data in localStorage
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.response?.data?.message || 'Failed to update notification preferences');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      await axios.put(`/user/${user.id}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || 'Failed to update password');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderProfileSection = () => (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Profile Information</h5>
        <button
          className={`btn ${isEditing ? 'btn-success' : 'btn-primary'}`}
          style={{ backgroundColor: isEditing ? undefined : '#001f3f', borderColor: isEditing ? undefined : '#001f3f' }}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <FaSave className="me-2" /> : <FaEdit className="me-2" />}
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">
                <FaUser className="me-2" />
                Full Name
              </label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">
                <FaEnvelope className="me-2" />
                Email
              </label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">
                <FaPhone className="me-2" />
                Phone Number
              </label>
              <input
                type="tel"
                className="form-control"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Country</label>
              <select
                className="form-select"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                disabled={!isEditing}
              >
                {Object.keys(countryCodes).map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Region</label>
              <select
                className="form-select"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                disabled={!isEditing}
              >
                <option value="">Select Region</option>
                {Object.keys(ghanaRegionsAndCities).map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">City</label>
              <select
                className="form-select"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                disabled={!isEditing || !formData.region}
              >
                <option value="">Select City</option>
                {formData.region && ghanaRegionsAndCities[formData.region]?.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Country Code</label>
              <input
                type="text"
                className="form-control"
                name="zipCode"
                value={formData.zipCode}
                disabled={true}
                placeholder="Country Code"
              />
            </div>
            <div className="col-12">
              <label className="form-label">
                <FaMapMarkerAlt className="me-2" />
                Address
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Address will be auto-filled based on your selections"
                />
                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleLocationClick}
                    style={{ color: '#001f3f', borderColor: '#001f3f' }}
                  >
                    <FaMapMarkerAlt className="me-2" />
                    Use My Location
                  </button>
                )}
              </div>
            </div>
          </div>
          {isEditing && (
            <div className="mt-3">
              <button type="submit" className="btn btn-primary me-2" style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}>
                <FaSave className="me-2" />
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  setIsEditing(false);
                  fetchUserData();
                }}
              >
                <FaTimes className="me-2" />
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const renderOrdersSection = () => (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">Order History</h5>
      </div>
      <div className="card-body">
        {!orders || orders.length === 0 ? (
          <p className="text-muted text-center">No orders found</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Product</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Tracking ID</th>
                  <th>Delivery Method</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span>{order.product?.name}</span>
                      </div>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>GH₵{order.total?.toFixed(2) || '0.00'}</td>
                    <td>
                      <span className={`badge bg-${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.trackingId || 'Not assigned'}</td>
                    <td>{order.deliveryMethod || 'Standard'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        style={{ color: '#001f3f', borderColor: '#001f3f' }}
                        onClick={() => navigate(`/orders/${order.id}`)}
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
  );

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
      <div className="row">
        <div className="col-md-3">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex flex-column align-items-center text-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt="Profile"
                    className="rounded-circle mb-3"
                    width="150"
                    height="150"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <FaUserCircle size={150} className="mb-3 text-primary" />
                )}
                <h4>{user.name}</h4>
                <p className="text-muted mb-1">{user.email}</p>
                <p className="text-muted font-size-sm">{user.phone}</p>
                <div className="mt-2">
                  <span className="badge" style={{ backgroundColor: '#001f3f' }}>
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="list-group">
                <button
                  className={`list-group-item list-group-item-action ${activeTab === 'profile' ? 'active' : ''}`}
                  style={{ backgroundColor: activeTab === 'profile' ? '#001f3f' : undefined, color: activeTab === 'profile' ? 'white' : undefined }}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Information
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeTab === 'orders' ? 'active' : ''}`}
                  style={{ backgroundColor: activeTab === 'orders' ? '#001f3f' : undefined, color: activeTab === 'orders' ? 'white' : undefined }}
                  onClick={() => setActiveTab('orders')}
                >
                  Order History
                </button>
                <button
                  className={`list-group-item list-group-item-action ${activeTab === 'settings' ? 'active' : ''}`}
                  style={{ backgroundColor: activeTab === 'settings' ? '#001f3f' : undefined, color: activeTab === 'settings' ? 'white' : undefined }}
                  onClick={() => setActiveTab('settings')}
                >
                  Account Settings
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-9">
          {activeTab === 'profile' && renderProfileSection()}
          {activeTab === 'orders' && renderOrdersSection()}
          {activeTab === 'settings' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Account Settings</h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <h6>Change Password</h6>
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Current Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">New Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Confirm New Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        minLength={8}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}>
                      Update Password
                    </button>
                  </form>
                </div>
                <div className="mb-4">
                  <h6>Notification Preferences</h6>
                  <div className="form-check mb-2">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="emailNotif"
                      checked={notificationPreferences.email}
                      onChange={handleNotificationChange}
                    />
                    <label className="form-check-label" htmlFor="emailNotif">
                      Email Notifications
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="smsNotif"
                      checked={notificationPreferences.sms}
                      onChange={handleNotificationChange}
                    />
                    <label className="form-check-label" htmlFor="smsNotif">
                      SMS Notifications
                    </label>
                  </div>

                  {showContactConfirmation && (
                    <div className="mt-3 p-3 border rounded">
                      <h6 className="mb-3">Confirm Contact Details</h6>
                      <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          value={contactDetails.email}
                          onChange={(e) => setContactDetails(prev => ({ ...prev, email: e.target.value }))}
                          required={notificationPreferences.email}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Phone Number</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          value={contactDetails.phone}
                          onChange={(e) => setContactDetails(prev => ({ ...prev, phone: e.target.value }))}
                          required={notificationPreferences.sms}
                        />
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleContactConfirmation}
                        style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}
                      >
                        Confirm Contact Details
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <h6>Account Actions</h6>
                  <button 
                    className="btn btn-danger me-2"
                    style={{ backgroundColor: '#001f3f', borderColor: '#001f3f' }}
                  >
                    Delete Account
                  </button>
                  <button 
                    className="btn btn-warning"
                    style={{ backgroundColor: '#001f3f', borderColor: '#001f3f', color: 'white' }}
                  >
                    Deactivate Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 