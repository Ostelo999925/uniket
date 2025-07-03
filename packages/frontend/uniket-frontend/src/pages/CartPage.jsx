import React, { useState } from 'react';
import useCart from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import axios from '../api/axios';
import './CartPage.css'; // We'll create this for custom styles
import { getProductImageUrl } from '../utils/imageUtils';

const CartPage = () => {
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showRemoveToast, setShowRemoveToast] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [removing, setRemoving] = useState(false);

  const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const res = await axios.post('/orders', {
        items: cartItems,
        total: totalPrice
      });
      alert('Order placed successfully!');
      clearCart();
      navigate('/success');
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClearCart = () => {
    setShowClearCartModal(true); // Show confirmation modal
  };

  const confirmClearCart = () => {
    clearCart();
    setShowClearCartModal(false); // Close modal after clearing
  };

  return (
    <div className="cart-page-container">
      {/* Clear Cart Confirmation Modal */}
      <Modal show={showClearCartModal} onHide={() => setShowClearCartModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Clear Cart</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove all items from your cart?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClearCartModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmClearCart}>
            Clear Cart
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showRemoveToast} onHide={() => { setShowRemoveToast(false); setRemoving(false); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Remove Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove this item from your cart?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowRemoveToast(false); setRemoving(false); }}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={removing}
            onClick={async () => {
              setRemoving(true);
              await removeFromCart(pendingRemoveId);
              setRemoving(false);
              setShowRemoveToast(false);
            }}
          >
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </Modal.Footer>
      </Modal>

       {/* Header */}
       <div className="cart-header p-4 mb-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0">
              <i className="bi bi-cart-fill me-2"></i>
              Your Cart
            </h1>
            <span className="cart-item-count">
              {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
        </div>
      </div>

      <div className="container">
        {cartItems.length === 0 ? (
          <div className="text-center py-5 empty-cart">
            <div className="empty-cart-icon mb-3">
              <i className="bi bi-cart-x"></i>
            </div>
            <h2 className="mb-2">Your Cart is Empty</h2>
            <p className="mb-4">Start shopping to add items</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/browse')} // Updated to navigate to CustomerBrowse
            >
              Browse Products
            </button>
          </div>
        ) :  (
          <div className="row">
            <div className="col-lg-8 mb-4 mb-lg-0">
              <div className="cart-items-container">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item card mb-3">
                    <div className="row g-0 align-items-center">
                      <div className="col-md-3 d-flex flex-column align-items-center justify-content-center">
                        <img 
                          src={getProductImageUrl(item.image)}
                          alt={item.name}
                          className="img-fluid rounded-start mb-2"
                          style={{ maxHeight: '90px', objectFit: 'contain' }}
                        />
                        <div className="text-center w-100">
                          <div className="fw-semibold" style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div className="text-gold fw-bold" style={{ fontSize: '1.1rem' }}>
                            GH₵{(item.price || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="col-md-9">
                        <div className="card-body">
                          <div className="d-flex flex-column h-100">
                            <div className="mb-2">
                              <p className="card-text text-muted small mb-2">{item.category}</p>
                            </div>
                            <div className="d-flex align-items-center mb-2 justify-content-end">
                              <div className="quantity-selector" style={{ minWidth: '90px' }}>
                                <div className="input-group input-group-sm" style={{ width: '90px' }}>
                                  <button 
                                    className="btn btn-outline-secondary quantity-btn py-0 px-2"
                                    style={{ fontSize: '0.9rem' }}
                                    onClick={() => updateQuantity(item.id, item.qty - 1)}
                                    disabled={item.qty <= 1 || isCheckingOut}
                                  >
                                    <i className="bi bi-dash-lg"></i>
                                  </button>
                                  <input 
                                    type="text" 
                                    className="form-control text-center border-left-0 border-right-0 quantity-input"
                                    style={{ fontSize: '0.9rem', padding: '0.25rem 0' }}
                                    value={item.qty}
                                    readOnly
                                  />
                                  <button 
                                    className="btn btn-outline-secondary quantity-btn py-0 px-2"
                                    style={{ fontSize: '0.9rem' }}
                                    onClick={() => updateQuantity(item.id, item.qty + 1)}
                                    disabled={isCheckingOut}
                                  >
                                    <i className="bi bi-plus-lg"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="text-end mb-2">
                              <p className="item-total mb-0">GH₵{((item.price || 0) * (item.qty || 0)).toLocaleString()}</p>
                            </div>
                            <div className="item-actions text-end">
                              <button 
                                className="btn btn-link text-danger p-0 remove-btn"
                                onClick={() => {
                                  setPendingRemoveId(item.id);
                                  setShowRemoveToast(true);
                                }}
                              >
                                <i className="bi bi-trash-fill me-1"></i>Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="col-lg-4">
              <div className="cart-summary card">
                <div className="card-header">
                  <h2 className="h5 mb-0">Order Summary</h2>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Subtotal ({cartItems.length} items):</span>
                      <span>GH₵{(totalPrice || 0).toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Shipping:</span>
                      <span className="text-success">FREE</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between fw-bold">
                      <span>Total:</span>
                      <span className="text-gold">GH₵{(totalPrice || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <button
                    className="btn w-100 mb-2 checkout-btn"
                    style={{ backgroundColor: '#0a2540', borderColor: '#0a2540', color: '#fff' }}
                    onClick={() => navigate('/checkout')}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-lock-fill me-2"></i>
                        Secure Checkout
                      </>
                    )}
                  </button>
                  
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={handleClearCart}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Clear Cart
                  </button>
                  
                  <div className="mt-3 pt-3 border-top">
                    <p className="small text-muted">
                      <i className="bi bi-shield-check me-2"></i>
                      Secure payment processing
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="card mt-3 help-card">
                <div className="card-body">
                  <h3 className="h6 mb-2">Need Help?</h3>
                  <p className="small text-muted mb-2">
                    Contact our customer support for assistance with your order.
                  </p>
                  <a href="#" className="small">
                    <i className="bi bi-headset me-1"></i>
                    Contact Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;