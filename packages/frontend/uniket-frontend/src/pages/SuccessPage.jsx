import React from "react";

// If you use Bootstrap Icons via CDN, add this to your public/index.html:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

const SuccessPage = () => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: "60vh", background: "#faf9f6" }}>
    {/* Shopping bag icon with UniKet blue/green */}
    <div style={{ position: "relative", width: "4.5rem", height: "4.5rem", marginBottom: "2rem" }}>
      <i
        className="bi bi-bag-check-fill"
        style={{
          fontSize: "4rem",
          color: "#1761a0",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      ></i>
      <i
        className="bi bi-mortarboard-fill"
        style={{
          fontSize: "2.5rem",
          color: "#1abc9c",
          position: "absolute",
          top: "1.05rem",
          left: "0.95rem",
        }}
      ></i>
    </div>
    <h2 className="fw-bold mb-2" style={{ color: "#1761a0", letterSpacing: "1px" }}>Thank you for your order!</h2>
    <p className="lead text-muted mb-4" style={{ maxWidth: 400, textAlign: "center" }}>
      Your order has been received and is being processed.<br />
      We appreciate your business and hope you enjoy your purchase.
    </p>
    <a href="/browse" className="btn btn-dark-blue px-4 py-2" style={{ background: "#1761a0", border: "none" }}>
      <i className="bi bi-arrow-left me-2"></i>
      Continue Shopping
    </a>
  </div>
);

export default SuccessPage;
