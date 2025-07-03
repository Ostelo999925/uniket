import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../context/AuthContext";
import { toast } from "react-hot-toast";

function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateEmail = (email) => {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = [
      'knust.edu.gh', 'ug.edu.gh', 'ucc.edu.gh', 'uew.edu.gh',
      'umat.edu.gh', 'upsa.edu.gh', 'ktu.edu.gh', 'kstu.edu.gh',
      'htu.edu.gh', 'atu.edu.gh', 'stu.edu.gh', 'ctu.edu.gh',
      'edu.gh'
    ];
    return allowedDomains.some(domain => emailDomain?.endsWith(domain));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      toast.error("Please use your institutional email address (e.g., @ktu.edu.gh, @ug.edu.gh)");
      setLoading(false);
      return;
    }

    try {
      const success = await signup(formData);
      if (success) {
        toast.success("Registration successful! Please login.");
        navigate("/login");
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-4 px-3" 
         style={{ backgroundColor: "#fefefe" }}>
      <div className="card shadow-sm w-100" 
           style={{
             maxWidth: "500px",
             border: "none",
             backgroundColor: "#ffffff",
             borderRadius: "1rem",
           }}>
        <div className="card-body p-3 p-md-4">
          <h2 className="text-center mb-4" style={{ color: "#001f3f", fontSize: "1.75rem" }}>Sign Up</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{ 
                  borderColor: "#001f3f",
                  fontSize: "0.95rem",
                  padding: "0.6rem 1rem"
                }}
              />
            </div>
            <div className="mb-3">
              <input
                type="email"
                className="form-control form-control-lg"
                placeholder="Student Email (e.g., student@ktu.edu.gh)"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ 
                  borderColor: "#001f3f",
                  fontSize: "0.95rem",
                  padding: "0.6rem 1rem"
                }}
              />
              <small className="text-muted d-block mt-1" style={{ fontSize: "0.8rem" }}>
                Please use your institutional email address (e.g., @ktu.edu.gh, @ug.edu.gh)
              </small>
            </div>
            <div className="mb-3">
              <input
                type="tel"
                className="form-control form-control-lg"
                placeholder="Phone Number (e.g., 0241234567)"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                pattern="^(\+233|0)[0-9]{9}$"
                title="Please enter a valid Ghana phone number (e.g., 0241234567 or +233241234567)"
                style={{ 
                  borderColor: "#001f3f",
                  fontSize: "0.95rem",
                  padding: "0.6rem 1rem"
                }}
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control form-control-lg"
                placeholder="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{ 
                  borderColor: "#001f3f",
                  fontSize: "0.95rem",
                  padding: "0.6rem 1rem"
                }}
              />
            </div>
            <div className="mb-3">
              <input
                type="password"
                className="form-control form-control-lg"
                placeholder="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{ 
                  borderColor: "#001f3f",
                  fontSize: "0.95rem",
                  padding: "0.6rem 1rem"
                }}
              />
            </div>
            <div className="mb-4">
              <select
                className="form-select form-select-lg"
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{ 
                  borderColor: "#001f3f",
                  fontSize: "0.95rem",
                  padding: "0.6rem 1rem"
                }}
              >
                <option value="customer">Student (Buyer/Customer)</option>
                <option value="vendor">Student (Seller/Vendor)</option>
              </select>
              <small className="text-muted d-block mt-1" style={{ fontSize: "0.8rem" }}>
                Select your role: Student (Buyer/Customer) to purchase items, Student (Seller/Vendor) to sell items
              </small>
            </div>
            <button
              type="submit"
              className="btn w-100 py-2"
              disabled={loading}
              style={{
                backgroundColor: "#001f3f",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: "500"
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing up...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>
          <p className="text-center mt-4 mb-0" style={{ fontSize: "0.9rem" }}>
            Already have an account? <Link to="/login" style={{ color: "#001f3f", textDecoration: "none", fontWeight: "500" }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
