import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import LoadingScreen from "../components/LoadingScreen"; 
import ReactGA from 'react-ga4'; // <-- NEW: Import GA4

// =========================================================
// 1. ROBUST IMAGE VALIDATION HELPERS (CRITICAL FIX)
// =========================================================

// Helper to check if a URL is valid (must start with http/https or /)
const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.length < 5) return false;
    
    // Check for standard web links or local paths
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
        return true;
    }
    
    // Explicitly reject short, incomplete data URI fragments (like "data:image/jpeg;base64:1")
    if (url.startsWith('data:image/')) {
        // A valid Base64 image is very long. We assume short ones (under 500 chars) are corrupt fragments.
        return url.length > 500; 
    }
    return false;
};

// Function to process product data and return a clean, unique array of valid image URLs
const getCleanImages = (productData) => {
    // Start with the new 'images' array
    let images = (productData.images && Array.isArray(productData.images) ? productData.images : []);
    
    // Fallback/Legacy check for the old single 'image' field
    if (productData.image && !images.includes(productData.image)) {
        // Add the old single image to the front if it's not already in the array
        images.unshift(productData.image); 
    }
    
    // Filter the entire list using the validator
    const validUrls = images.filter(url => isValidImageUrl(url));
    
    // Ensure uniqueness
    return [...new Set(validUrls)];
};

// =========================================================

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);
  
  // 1. NEW STATE: To control the currently displayed image
  const [mainImage, setMainImage] = useState(""); 

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() };
          
          // CRITICAL STEP 2: Get the clean image array immediately after fetching
          const cleanImages = getCleanImages(productData);

          const productWithImages = { ...productData, uniqueGalleryImages: cleanImages };

          setProduct(productWithImages); // Store clean array on state
          
          // 3. INITIALIZE mainImage: Use the first CLEAN image, or fallback
          setMainImage(cleanImages[0] || "/perfume.jpeg");
          
          // ******************************************************
          // *** START: GA4 VIEW ITEM EVENT (Phase 3.2) ***
          // ******************************************************
          ReactGA.event('view_item', {
              currency: "EGP",
              value: productWithImages.price, 
              items: [{
                  item_id: productWithImages.id,
                  item_name: productWithImages.title,
                  price: productWithImages.price,
                  // Add category if available on productData
                  // item_category: productData.category, 
              }]
          });
          // ******************************************************
          // *** END: GA4 VIEW ITEM EVENT ***
          // ******************************************************


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

  // Use the pre-cleaned array from state
  const uniqueGalleryImages = product.uniqueGalleryImages || [];
  
  // Fallback check for mainImage state
  const currentMainImage = mainImage || uniqueGalleryImages[0] || "/perfume.jpeg";


  return (
    <div className="min-h-screen p-8 flex flex-col md:flex-row gap-8 relative max-w-6xl mx-auto">
      
      {/* === START OF IMAGE GALLERY CONTAINER === */}
      <div 
        className="
          flex-shrink-0 
          w-full md:w-1/2 lg:w-1/3 
          flex flex-col gap-4 
          md:sticky md:top-8 md:self-start
        "
      >
        {/* Main Product Image */}
        <div 
          className="
            h-[28rem] md:h-[36rem] 
            overflow-hidden shadow-lg rounded-lg
          "
        >
          <img
            src={currentMainImage} // GUARANTEED to be a valid URL or the default path
            alt={product.title}
            className="w-full h-full object-cover transition duration-300" 
          />
        </div>

        {/* Thumbnail Gallery Strip */}
        {uniqueGalleryImages.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {uniqueGalleryImages.map((imgUrl, index) => (
              <button
                key={index}
                onClick={() => setMainImage(imgUrl)} // Handler to switch main image
                className={`
                  flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition
                  ${imgUrl === currentMainImage 
                    ? 'border-[#1C3C85] shadow-md' 
                    : 'border-transparent hover:border-stone-300'
                  }
                `}
              >
                <img
                  src={imgUrl} // GUARANTEED to be a valid URL
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* === END OF IMAGE GALLERY CONTAINER === */}


      {/* Product Details (Now occupies remaining width) */}
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
        
        {/* === ADD TO CART BUTTON (No Change) === */}
        {product.stock > 0 ? (
          <button
            className="bg-[#1C3C85] text-white py-2 px-4 rounded hover:bg-blue-700 transition" 
            onClick={() => handleAddToCart(product)}
          >
            Add to Cart
          </button>
        ) : (
          <button
            className="bg-gray-400 text-white py-2 px-4 rounded cursor-not-allowed"
            disabled
          >
            Out of Stock
          </button>
        )}
        {/* ======================================= */}
        
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