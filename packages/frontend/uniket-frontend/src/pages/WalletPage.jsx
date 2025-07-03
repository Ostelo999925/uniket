import React, { useState, useEffect } from 'react';
import axios from '../api/axios';

const WalletPage = ({ userId }) => {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const fetchWallet = async () => {
      const res = await axios.get(`/wallet/${userId}`);
      setBalance(res.data.balance);
    };
    fetchWallet();
  }, [userId]);

  const handleFund = async () => {
    const res = await axios.post('/wallet/fund', { userId, amount: parseFloat(amount) });
    setBalance(res.data.wallet.balance);
    setAmount('');
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Wallet</h2>
      <p className="mt-2">Balance: ₦{balance}</p>
      <div className="mt-4">
        <input
          type="number"
          placeholder="Amount"
          className="border p-2 rounded mr-2"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button onClick={handleFund} className="bg-green-600 text-white px-4 py-2 rounded">
          Fund Wallet
        </button>
      </div>
    </div>
  );
};

export default WalletPage;
