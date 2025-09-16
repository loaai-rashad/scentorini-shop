import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import LoadingScreen from "../components/LoadingScreen"; // ✅ Import it

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = (product) => {
    addToCart(product);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };


  if (loading) return <LoadingScreen />;
  if (!product) return <div className="min-h-screen p-8">Product not found</div>;

  return (
    <div className="min-h-screen p-8 flex flex-col md:flex-row gap-8 relative">
      {/* Product Image */}
      <div className="flex-shrink-0 w-full md:w-1/3">
        <img
          src={product.image || "/perfume.jpeg"}
          alt={product.title}
          className="w-full h-auto object-cover rounded-lg shadow-lg"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <p className="text-stone-500">{product.subtitle}</p>
        <p className="text-2xl font-semibold text-stone-900">
          EGP{product.price.toFixed(2)}
        </p>
        <p className="text-stone-700">{product.description}</p>

        {product.stock > 0 ? (
          <button
            className="mt-4 bg-[#1C3C85] text-white py-2 px-4 rounded hover:bg-blue-700 transition"
            onClick={() => handleAddToCart(product)}
          >
            Add to Cart
          </button>
        ) : (
          <button
            className="mt-4 bg-gray-400 text-white py-2 px-4 rounded cursor-not-allowed"
            disabled
          >
            Out of Stock
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#1C3C85] text-white px-6 py-3 rounded shadow-lg z-50 animate-slide-down">
    Item added to cart!
  </div>
)}
    </div>
  );
}
