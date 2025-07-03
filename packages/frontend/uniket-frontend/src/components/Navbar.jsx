import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [role, setRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Fixed: Safely get user from localStorage
    try {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      setRole(user?.role || null);
    } catch (error) {
      console.error("Failed to load user data", error);
      localStorage.removeItem("user"); // Clear corrupt data                       
    }

    // Your existing navbar toggle logic
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
      navbarToggler.addEventListener('click', () => {
        const target = navbarToggler.getAttribute('data-bs-target');
        const navbarCollapse = document.querySelector(target);
        navbarCollapse.classList.toggle('show');
      });
    }
  }, []);

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <nav className="navbar navbar-expand-lg navbar-custom">
      <div className="container">
        <Link className="navbar-brand" to="/">
          UniKet
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {!isAdminPage && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/">Home</Link>
                </li>
                {role === "customer" && (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/cart">Cart</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/orders">My Orders</Link>
                    </li>
                  </>
                )}
                {role === "vendor" && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/vendor/dashboard">Vendor Dashboard</Link>
                  </li>
                )}
                {role === "admin" && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin">Admin Dashboard</Link>
                  </li>
                )}
              </>
            )}
            {!role && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/signup">Sign Up</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Log In</Link>
                </li>
              </>
            )}
            {role && (
              <li className="nav-item">
                <Link 
                  className="nav-link" 
                  to="/" 
                  onClick={() => {
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    window.location.href = "/";
                  }}
                >
                  Logout
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;