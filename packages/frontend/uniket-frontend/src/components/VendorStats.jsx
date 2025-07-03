import React, { useEffect, useState } from "react";
import axios from "axios";

const VendorStats = () => {
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("/products/vendor/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default VendorStats;