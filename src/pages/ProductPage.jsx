import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import LoadingScreen from "../components/LoadingScreen"; 

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // ... (fetch logic remains unchanged)
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
    <div className="min-h-screen p-8 flex flex-col md:flex-row gap-8 relative max-w-6xl mx-auto">
      
      {/* Product Image Container (No Change) */}
      <div 
        className="
          flex-shrink-0 
          w-full md:w-1/3 
          h-[24rem]
          md:h-auto
          md:max-h-[36rem]
          overflow-hidden
          shadow-lg rounded-lg
        "
      >
        <img
          src={product.image || "/perfume.jpeg"}
          alt={product.title}
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Product Details - Logic updated to move the button */}
      <div className="flex-1 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <p className="text-stone-500">{product.subtitle}</p>
        
        {/* --- Display the Inspired By field (No Change) --- */}
        {product.inspiredBy && (
            <p className="text-md font-medium text-stone-700 p-2 border-l-4 border-stone-300 bg-stone-50">
                Inspired by: <span className="font-semibold text-stone-900">{product.inspiredBy}</span>
            </p>
        )}
        {/* ------------------------------------------- */}

        <p className="text-2xl font-semibold text-stone-900">
          EGP{product.price.toFixed(2)}
        </p>
        
        {/* === MOVED BUTTON BLOCK (Now immediately follows the Price) === */}
        {product.stock > 0 ? (
          <button
            // Removed mt-4 to reduce margin since it's now higher up
            className="bg-[#1C3C85] text-white py-2 px-4 rounded hover:bg-blue-700 transition" 
            onClick={() => handleAddToCart(product)}
          >
            Add to Cart
          </button>
        ) : (
          <button
            // Removed mt-4
            className="bg-gray-400 text-white py-2 px-4 rounded cursor-not-allowed"
            disabled
          >
            Out of Stock
          </button>
        )}
        {/* ============================================================= */}
        
        {/* The Description now follows the button */}
        <p className="text-stone-700">{product.description}</p>
      </div>

      {/* Toast Notification (Unchanged) */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#1C3C85] text-white px-6 py-3 rounded shadow-lg z-50 animate-slide-down">
          Item added to cart!
        </div>
      )}
    </div>
  );
}