import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../context/AuthContext";
import { toast } from "react-hot-toast";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        toast.success("Login successful!");
        // Get user from localStorage (set by login)
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.role === 'admin') {
          navigate('/admin');
        } else if (user?.role === 'pickup_manager') {
          navigate('/pickupmanager/dashboard');
        } else if(user?.role === 'vendor') {
          navigate('/vendor/dashboard');
        } else if(user?.role === 'customer') {
          navigate('/browse');
        }else{
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || "Login failed. Please try again.");
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
          <h2 className="text-center mb-4" style={{ color: "#001f3f", fontSize: "1.75rem" }}>Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="email"
                className="form-control form-control-lg"
                placeholder="Email"
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
            </div>
            <div className="mb-4">
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
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
          <p className="text-center mt-4 mb-0" style={{ fontSize: "0.9rem" }}>
            Don't have an account? <Link to="/signup" style={{ color: "#001f3f", textDecoration: "none", fontWeight: "500" }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
