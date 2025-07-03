import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { FaTrophy, FaStar, FaChartLine, FaShoppingBag, FaComments } from 'react-icons/fa';
import { toast } from 'react-toastify';

const VendorLeaderboard = () => {
  const [selectedCategory, setSelectedCategory] = useState('topSellers');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'topSellers', name: 'Top Sellers', icon: <FaShoppingBag /> },
    { id: 'mostActive', name: 'Most Active', icon: <FaChartLine /> },
    { id: 'bestRated', name: 'Best Rated', icon: <FaStar /> },
    { id: 'mostReviewed', name: 'Most Reviewed', icon: <FaComments /> },
    { id: 'fastestGrowing', name: 'Fastest Growing', icon: <FaChartLine /> }
  ];

  const fetchLeaderboardData = async (category) => {
    try {
      setLoading(true);
      const response = await axios.get(`/admin/vendor-leaderboard?category=${category}`);
      setVendors(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      toast.error('Failed to fetch leaderboard data');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(selectedCategory);
  }, [selectedCategory]);

  const getRewardBadge = (rank) => {
    if (rank === 1) return { color: 'bg-warning text-dark', text: 'Gold' };
    if (rank === 2) return { color: 'bg-secondary text-dark', text: 'Silver' };
    if (rank === 3) return { color: 'bg-warning text-white', text: 'Bronze' };
    return null;
  };

  const formatMetric = (vendor, category) => {
    if (!vendor) return '';
    switch (category) {
      case 'topSellers':
        return `GH₵${(vendor.totalRevenue || 0).toFixed(2)}`;
      case 'mostActive':
        return `${vendor.totalOrders || 0} orders`;
      case 'bestRated':
        return `${(vendor.averageRating || 0).toFixed(1)} ⭐ (${vendor.totalRatings || 0} ratings)`;
      case 'mostReviewed':
        return `${vendor.totalReviews || 0} reviews`;
      case 'fastestGrowing':
        return `${vendor.growthRate || 0} orders (30 days)`;
      default:
        return '';
    }
  };

  return (
    <div className="container my-4">
      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white d-flex align-items-center justify-content-between">
          <h3 className="mb-0">Vendor Leaderboard</h3>
          <ul className="nav nav-pills">
            {categories.map((category) => (
              <li className="nav-item" key={category.id}>
                <button
                  className={`nav-link ${selectedCategory === category.id ? 'active bg-warning text-dark' : ''}`}
                  style={{ minWidth: 120 }}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.icon} <span className="ms-1">{category.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: 150 }}>
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No vendor data available</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Rank</th>
                    <th>Vendor</th>
                    <th>Performance</th>
                    <th>Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor, index) => {
                    const reward = getRewardBadge(index + 1);
                    return (
                      <tr key={vendor.id}>
                        <td>
                          {index < 3 ? (
                            <span className={`badge ${reward.color} fs-6`} title={reward.text}>
                              <FaTrophy className="me-1" />
                              {index + 1}
                            </span>
                          ) : (
                            <span className="fw-semibold">{index + 1}</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              className="rounded-circle border border-2"
                              src={vendor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name)}`}
                              alt={vendor.name}
                              style={{ width: 40, height: 40, objectFit: 'cover' }}
                              onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name)}`; }}
                            />
                            <div>
                              <span className="fw-semibold">{vendor.name}</span>
                              <br />
                              <span className="text-muted small">{vendor.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{formatMetric(vendor, selectedCategory)}</td>
                        <td>
                          {reward && (
                            <span className={`badge ${reward.color} px-3 py-2`}>{reward.text}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .card { border-radius: 1rem; }
        .table th, .table td { vertical-align: middle !important; }
        .table th { font-size: 1rem; }
        .table td { font-size: 0.97rem; }
        .nav-pills .nav-link { border-radius: 2rem; margin-left: 0.5rem; }
        .nav-pills .nav-link.active { font-weight: 600; }
      `}</style>
    </div>
  );
};

export default VendorLeaderboard; 