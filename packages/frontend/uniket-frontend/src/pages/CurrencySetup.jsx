import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Sample country and currency data
const countries = [
  { name: 'Nigeria', currency: 'NGN' },
  { name: 'United States', currency: 'USD' },
  { name: 'United Kingdom', currency: 'GBP' },
  { name: 'Canada', currency: 'CAD' },
  { name: 'India', currency: 'INR' },
  { name: 'Kenya', currency: 'KES' },
  { name: 'Ghana', currency: 'GHS' },
];

const CurrencySetup = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const navigate = useNavigate();

  const handleCountryChange = (e) => {
    const country = countries.find(c => c.name === e.target.value);
    setSelectedCountry(country.name);
    setSelectedCurrency(country.currency);
  };

  const handleSubmit = () => {
    // Save to localStorage (or send to backend if user is authenticated)
    localStorage.setItem('userCountry', selectedCountry);
    localStorage.setItem('userCurrency', selectedCurrency);

    // Get user role from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Redirect based on role
    if (user) {
      switch (user.role) {
        case 'vendor':
          navigate('/vendor/dashboard');
          break;
        case 'admin':
          navigate('/admin');
          break;
        case 'customer':
          navigate('/browse');
          break;
        default:
          navigate('/browse');
      }
    } else {
      navigate('/browse');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-blue-50 p-6">
      <div className="bg-white rounded shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Set Your Country and Currency</h2>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Select Country</label>
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="w-full p-2 border rounded"
          >
            <option value="">-- Choose Country --</option>
            {countries.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium">Currency</label>
          <input
            type="text"
            value={selectedCurrency}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>

        <button
          disabled={!selectedCountry}
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default CurrencySetup;
