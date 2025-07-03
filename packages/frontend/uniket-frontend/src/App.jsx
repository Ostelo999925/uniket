import React, { Suspense } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";
import useAuth from "./context/AuthContext";
import OrderDetails from './components/OrderDetails';
import TrackOrder from './components/TrackOrder';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';

// Import pages
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Products from "./pages/Products";
import VendorDashboard from "./pages/VendorDashboard";
import TrackOrderPage from "./pages/TrackOrderPage";
import MyOrders from "./pages/MyOrders";
import ProductPage from "./pages/ProductPage";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerBrowse from './pages/CustomerBrowse'; 
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import CurrencySetup from "./pages/CurrencySetup";
import FlaggedProducts from "./pages/admin/flagged-products";
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

// Lazy load components
const ProductDetail = React.lazy(() => import('./components/ProductDetail'));

// Loading component
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SocketProvider>
      <OrderProvider>
        <CartProvider>
          <Navbar />
          <div className="container mt-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/signup" 
                element={
                  !user ? (
                    <Signup />
                  ) : (
                    user.role === 'vendor' ? (
                      <Navigate to="/vendor/dashboard" replace />
                    ) : user.role === 'admin' ? (
                      <Navigate to="/admin" replace />
                    ) : (
                      <Navigate to="/browse" replace />
                    )
                  )
                } 
              />
              <Route 
                path="/login" 
                element={
                  !user ? (
                    <Login />
                  ) : (
                    user.role === 'vendor' ? (
                      <Navigate to="/vendor/dashboard" replace />
                    ) : user.role === 'admin' ? (
                      <Navigate to="/admin" replace />
                    ) : (
                      <Navigate to="/browse" replace />
                    )
                  )
                } 
              />
              <Route path="/products" element={<Products />} />
              <Route 
                path="/vendor/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={["vendor"]}>
                    <VendorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/track-order" element={<TrackOrderPage />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/products/:productId" element={<ProductPage />} />
              <Route path="/browse" element={<CustomerBrowse />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/setup-currency" element={<CurrencySetup />} />
              <Route path="/admin/flagged-products" element={<FlaggedProducts />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/orders/:id" 
                element={
                  <ProtectedRoute>
                    <OrderDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/track-order/:id" 
                element={
                  <ProtectedRoute>
                    <TrackOrder />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
          <ToastContainer 
            position="top-right" 
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </CartProvider>
      </OrderProvider>
    </SocketProvider>
  );
};

export default App;
