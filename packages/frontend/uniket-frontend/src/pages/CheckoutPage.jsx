import React, { useState, useEffect } from 'react';
import useCart from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';
import axios from '../api/axios';
import './CartPage.css'; // <-- Make sure this is imported for the dark blue variable

const stripePromise = loadStripe('pk_test_51RKhrBPWpRqLyHNLnCibBV10pHTFM5PkYLLIyKcaQ0RSf2dbYH2aWV4iKh4rB3qvCoNEJ98Xf8ZfGg8n2EDVN6rh005BGoKpTv'); // <-- Replace with your Stripe publishable key

const CheckoutForm = () => {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('mobileMoney');
  // Stripe
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Form state
  const [shipping, setShipping] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [mobileMoney, setMobileMoney] = useState({
    number: '',
    accountName: '',
    network: '',
  });

  // Pickup point states
  const [pickupPoints, setPickupPoints] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Calculate total
  const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.qty), 0);

  // Add this useEffect to fetch pickup points
  useEffect(() => {
    const fetchPickupPoints = async () => {
      try {
        const response = await axios.get('/pickup');
        setPickupPoints(response.data);
      } catch (error) {
        console.error('Error fetching pickup points:', error);
        toast.error('Failed to fetch pickup points');
      }
    };

    fetchPickupPoints();
  }, []);

  // Get unique regions from pickup points (case-insensitive)
  const regions = [...new Set(pickupPoints.map(point => point.region))].sort();

  // Get schools for selected region (case-insensitive)
  const schools = [...new Set(
    pickupPoints
      .filter(point => point.region.toLowerCase() === selectedRegion.toLowerCase())
      .map(point => point.school)
  )].sort();

  // Get departments for selected school (case-insensitive)
  const departments = [
    'Computer Science',
    'Information Technology',
    'Business Administration',
    'Accounting',
    'Marketing',
    'Economics',
    'Engineering',
    'Medicine',
    'Law',
    'Arts and Humanities',
    'Social Sciences',
    'Natural Sciences',
    'Education',
    'Agriculture',
    'Other'
  ].sort();

  // Get locations for selected school (case-insensitive)
  const locations = pickupPoints
    .filter(point => 
      point.region.toLowerCase() === selectedRegion.toLowerCase() && 
      point.school.toLowerCase() === selectedSchool.toLowerCase()
    )
    .map(point => point.location)
    .sort();

  // Place order handler
  const placeOrder = async (paymentRef, paymentMethod) => {
    if (!selectedRegion || !selectedSchool || !selectedDepartment || !selectedLocation) {
      toast.error('Please select all pickup point details');
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Placing order...");

    try {
      // Find the matching pickup point
      const selectedPickupPoint = pickupPoints.find(point => 
        point.region.toLowerCase() === selectedRegion.toLowerCase() &&
        point.school.toLowerCase() === selectedSchool.toLowerCase() &&
        point.location.toLowerCase() === selectedLocation.toLowerCase()
      );

      if (!selectedPickupPoint) {
        toast.error('Selected pickup point not found');
        return;
      }

      // Map cart items to order items format
      const formattedCartItems = cartItems.map(item => ({
        productId: item.id,
        quantity: item.qty,
        price: item.price
      }));

      // Create the order data using the existing structure from order.controller.js
      const orderData = {
        items: formattedCartItems,
        shippingAddress: {
          name: shipping.name,
          phone: shipping.phone,
          email: shipping.email
        },
        paymentMethod,
        paymentRef,
        pickupPointId: selectedPickupPoint.id,
        deliveryMethod: 'PICKUP',
        totalAmount
      };

      console.log('Submitting order with data:', orderData);

      const response = await axios.post('/orders', orderData);

      clearCart();
      toast.dismiss(toastId);
      toast.success("Order placed successfully!");
      navigate('/success');
    } catch (err) {
      console.error('Order placement error:', err);
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form fields
    if (!shipping.name || !shipping.email || !shipping.phone) {
      toast.error('Please fill in all shipping information');
      return;
    }
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // For card payments, handle Stripe
    if (paymentMethod === 'card') {
      if (!stripe || !elements) {
        toast.error('Payment processing not ready');
        return;
      }

      setProcessing(true);
      const { error, paymentMethod: stripePaymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)
      });

      if (error) {
        setCardError(error.message);
        setProcessing(false);
        return;
      }

      // Use Stripe payment method ID as reference
      await placeOrder(stripePaymentMethod.id, 'card');
      setProcessing(false);
    } else {
      // For mobile money payments
      if (!mobileMoney.network || !mobileMoney.number || !mobileMoney.accountName) {
        toast.error('Please fill in all mobile money details');
        return;
      }

      // Use mobile money number as reference
      await placeOrder(mobileMoney.number, 'mobile_money');
    }
  };

  return (
    <div className="checkout-page-container py-5">
      <h2>Checkout</h2>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-8">
            {/* Pickup Point Form */}
            <div className="card mb-4">
              <div className="card-header">Pickup Information</div>
              <div className="card-body">
                {/* Common fields */}
                <input className="form-control mb-2" placeholder="Full Name"
                  value={shipping.name}
                  onChange={e => setShipping({ ...shipping, name: e.target.value })}
                  required
                />
                <input className="form-control mb-2" placeholder="Phone Number"
                  value={shipping.phone}
                  onChange={e => setShipping({ ...shipping, phone: e.target.value })}
                  required
                />
                <input className="form-control mb-2" placeholder="Email"
                  value={shipping.email}
                  onChange={e => setShipping({ ...shipping, email: e.target.value })}
                  required
                  type="email"
                />

                {/* Pickup point selection */}
                <div className="mt-3">
                  <div className="row">
                    <div className="col-md-3">
                      <select
                        className="form-control mb-2"
                        value={selectedRegion}
                        onChange={(e) => {
                          setSelectedRegion(e.target.value);
                          setSelectedSchool('');
                          setSelectedDepartment('');
                          setSelectedLocation('');
                        }}
                        required
                      >
                        <option value="">Select Region</option>
                        {regions.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-control mb-2"
                        value={selectedSchool}
                        onChange={(e) => {
                          setSelectedSchool(e.target.value);
                          setSelectedDepartment('');
                          setSelectedLocation('');
                        }}
                        disabled={!selectedRegion}
                        required
                      >
                        <option value="">Select School</option>
                        {schools.map(school => (
                          <option key={school} value={school}>{school}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-control mb-2"
                        value={selectedDepartment}
                        onChange={(e) => {
                          setSelectedDepartment(e.target.value);
                          setSelectedLocation('');
                        }}
                        disabled={!selectedSchool}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(department => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-control mb-2"
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        disabled={!selectedDepartment}
                        required
                      >
                        <option value="">Select Location</option>
                        {locations.map(location => (
                          <option key={location} value={location}>{location}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="card mb-4">
              <div className="card-header">Payment Method</div>
              <div className="card-body">
                <div className="btn-group w-100 mb-3">
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'mobileMoney' ? 'btn-dark-blue' : 'btn-outline-dark-blue'}`}
                    onClick={() => setPaymentMethod('mobileMoney')}
                  >
                    <i className="bi bi-phone me-2"></i>Mobile Money
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'card' ? 'btn-dark-blue' : 'btn-outline-dark-blue'}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <i className="bi bi-credit-card me-2"></i>Card
                  </button>
                </div>

                {paymentMethod === 'mobileMoney' ? (
                  <div className="mobile-money-form">
                    <select
                      className="form-control mb-2"
                      value={mobileMoney.network}
                      onChange={e => setMobileMoney({ ...mobileMoney, network: e.target.value })}
                      required
                    >
                      <option value="">Select Network</option>
                      <option value="MTN">MTN</option>
                      <option value="Vodafone">Vodafone</option>
                      <option value="AirtelTigo">AirtelTigo</option>
                    </select>
                    <input
                      className="form-control mb-2"
                      placeholder="Mobile Money Number"
                      value={mobileMoney.number}
                      onChange={e => setMobileMoney({ ...mobileMoney, number: e.target.value })}
                      required
                    />
                    <input
                      className="form-control mb-2"
                      placeholder="Account Name"
                      value={mobileMoney.accountName}
                      onChange={e => setMobileMoney({ ...mobileMoney, accountName: e.target.value })}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-dark-blue w-100"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Pay with Mobile Money'}
                    </button>
                  </div>
                ) : (
                  <div className="card-form">
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                              color: '#aab7c4',
                            },
                          },
                          invalid: {
                            color: '#9e2146',
                          },
                        },
                      }}
                    />
                    {cardError && <div className="text-danger mt-2">{cardError}</div>}
                    <button
                      type="submit"
                      className="btn btn-dark-blue w-100 mt-3"
                      disabled={!stripe || processing || loading}
                    >
                      {processing || loading ? 'Processing...' : 'Pay with Card'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="col-md-4">
            <div className="card">
              <div className="card-header">Order Summary</div>
              <div className="card-body">
                {cartItems.map(item => (
                  <div key={item.id} className="d-flex justify-content-between mb-2">
                    <span>{item.name} x {item.qty}</span>
                    <span>GH₵{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <hr />
                <div className="d-flex justify-content-between">
                  <strong>Total:</strong>
                  <strong>GH₵{totalAmount.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

// Wrap with Elements for Stripe
const CheckoutPage = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);

export default CheckoutPage;