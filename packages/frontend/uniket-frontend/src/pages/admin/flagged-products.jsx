import React, { useEffect, useState } from "react";
//import { Card, CardContent } from "@/components/ui/card";
//import { Button } from "@/components/ui/button";
//import { Badge } from "@/components/ui/badge";

const FlaggedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/flagged-products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch flagged products:", err);
        setProducts([]);
        setLoading(false);
      });
  }, []);

  const handleClearFlag = async (id) => {
    try {
      const res = await fetch(`/api/admin/clear-flag/${id}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        console.error("Failed to clear flag");
      }
    } catch (err) {
      console.error("Error clearing flag:", err);
    }
  };

  if (loading) return <p className="p-4">Loading flagged products...</p>;

  if (products.length === 0)
    return <p className="p-4">No flagged products found.</p>;

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <Card key={product.id}>
          <CardContent className="space-y-2">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.description}</p>
            <Badge variant="destructive">Flagged</Badge>
            <Button
              variant="default"
              onClick={() => handleClearFlag(product.id)}
            >
              Clear Flag
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FlaggedProducts;
