import React, { useEffect } from "react";

function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const background = {
    success: "#28a745",
    error: "#dc3545",
    info: "#007BFF",
  }[type];

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        background,
        color: "white",
        padding: "1rem",
        borderRadius: "8px",
        zIndex: 9999,
        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
      }}
    >
      {message}
    </div>
  );
}

export default Toast;
