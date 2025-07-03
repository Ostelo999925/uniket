import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';

const WithdrawalForm = () => {
  const [formData, setFormData] = useState({
    amount: '',
    withdrawalMethod: 'mobile_money',
    accountDetails: {
      accountNumber: '',
      accountName: '',
      bankName: '',
      mobileMoneyProvider: 'mtn',
      phoneNumber: ''
    }
  });

  const [walletBalance, setWalletBalance] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [loading, setLoading] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  useEffect(() => {
    fetchWalletBalance();
    fetchWithdrawalHistory();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get('/wallet/balance');
      setWalletBalance(response.data.balance || 0);
      setTotalRevenue(response.data.totalRevenue || 0);
      setTotalWithdrawals(response.data.totalWithdrawals || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast.error('Failed to fetch wallet balance');
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const response = await axios.get('/withdrawals/history');
      setWithdrawalHistory(response.data);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      toast.error('Failed to fetch withdrawal history');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('accountDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/withdrawals', {
        amount: parseFloat(formData.amount),
        withdrawalMethod: formData.withdrawalMethod,
        bankName: formData.withdrawalMethod === 'bank' ? formData.accountDetails.bankName : formData.accountDetails.mobileMoneyProvider,
        accountNumber: formData.withdrawalMethod === 'bank' ? formData.accountDetails.accountNumber : formData.accountDetails.phoneNumber,
        accountName: formData.withdrawalMethod === 'bank' ? formData.accountDetails.accountName : formData.accountDetails.phoneNumber
      });
      toast.success('Withdrawal initiated successfully');
      await fetchWalletBalance();
      await fetchWithdrawalHistory();
      setFormData({
        amount: '',
        withdrawalMethod: 'mobile_money',
        accountDetails: {
          accountNumber: '',
          accountName: '',
          bankName: '',
          mobileMoneyProvider: 'mtn',
          phoneNumber: ''
        }
      });
    } catch (error) {
      console.error('Error initiating withdrawal:', error);
      toast.error(error.response?.data?.error || 'Failed to initiate withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (transactionId) => {
    try {
      await axios.put(`/transactions/${transactionId}/cancel`, {
        status: 'CANCELLED'
      });
      toast.success('Withdrawal cancelled successfully');
      await fetchWalletBalance();
      await fetchWithdrawalHistory();
    } catch (error) {
      console.error('Error cancelling withdrawal:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel withdrawal');
    }
  };

  const handleComplete = async (transactionId) => {
    try {
      await axios.put(`/transactions/${transactionId}/complete`, {
        status: 'COMPLETED'
      });
      toast.success('Withdrawal completed successfully');
      await fetchWalletBalance();
      await fetchWithdrawalHistory();
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      toast.error(error.response?.data?.error || 'Failed to complete withdrawal');
    }
  };

  return (
    <div className="withdrawal-container">
      {/* Wallet Balance Card */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card bg-light border-0 shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-2">Available Balance</h6>
              <h3 className="mb-0" style={{ color: '#001f3f' }}>GH₵{walletBalance?.toLocaleString() || '0.00'}</h3>
              <div className="mt-3">
                <div className="d-flex justify-content-between text-muted">
                  <small>Total Revenue:</small>
                  <small>GH₵{totalRevenue?.toLocaleString() || '0.00'}</small>
                </div>
                <div className="d-flex justify-content-between text-muted">
                  <small>Total Withdrawals:</small>
                  <small>GH₵{totalWithdrawals?.toLocaleString() || '0.00'}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="row">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-4">Request Withdrawal</h5>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Amount (GH₵)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    min="1"
                    step="0.01"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Withdrawal Method</label>
                  <select
                    className="form-select"
                    name="withdrawalMethod"
                    value={formData.withdrawalMethod}
                    onChange={handleChange}
                    required
                  >
                    <option value="mobile_money">Mobile Money</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                {formData.withdrawalMethod === 'mobile_money' ? (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Mobile Money Provider</label>
                      <select
                        className="form-select"
                        name="accountDetails.mobileMoneyProvider"
                        value={formData.accountDetails.mobileMoneyProvider}
                        onChange={handleChange}
                        required
                      >
                        <option value="mtn">MTN</option>
                        <option value="vodafone">Vodafone</option>
                        <option value="airteltigo">AirtelTigo</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="accountDetails.phoneNumber"
                        value={formData.accountDetails.phoneNumber}
                        onChange={handleChange}
                        pattern="^(\+233|0)[0-9]{9}$"
                        title="Please enter a valid Ghana phone number (e.g., 0241234567 or +233241234567)"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="accountDetails.bankName"
                        value={formData.accountDetails.bankName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Account Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="accountDetails.accountNumber"
                        value={formData.accountDetails.accountNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Account Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="accountDetails.accountName"
                        value={formData.accountDetails.accountName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="btn w-100"
                  style={{ backgroundColor: '#001f3f', color: 'white' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Processing...
                    </>
                  ) : (
                    'Request Withdrawal'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-4">Withdrawal History</h5>
              {withdrawalHistory.length === 0 ? (
                <p className="text-muted text-center my-4">No withdrawal history yet</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalHistory.map((withdrawal) => {
                        const withdrawalDetails = JSON.parse(withdrawal.description || '{}');
                        return (
                          <tr key={withdrawal.id}>
                            <td>{new Date(withdrawal.createdAt).toLocaleDateString()}</td>
                            <td>GH₵{withdrawal.amount}</td>
                            <td>
                              <span className="badge" style={{ backgroundColor: '#001f3f' }}>
                                {withdrawalDetails.withdrawalMethod === 'mobile_money' ? 
                                  `${withdrawalDetails.bankName?.toUpperCase()} Mobile Money` : 
                                  'Bank Transfer'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                withdrawal.status === 'COMPLETED' ? 'bg-success' :
                                withdrawal.status === 'PENDING' ? 'bg-warning' :
                                'bg-danger'
                              }`}>
                                {withdrawal.status}
                              </span>
                            </td>
                            <td>
                              {withdrawal.status === 'PENDING' && (
                                <div className="btn-group">
                                  <button
                                    className="btn btn-sm btn-outline-success me-2"
                                    onClick={() => handleComplete(withdrawal.id)}
                                  >
                                    Complete
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleCancel(withdrawal.id)}
                                  >
                                    Cancel
                                  </button>
                                </div>
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
        </div>
      </div>
    </div>
  );
};

export default WithdrawalForm; 