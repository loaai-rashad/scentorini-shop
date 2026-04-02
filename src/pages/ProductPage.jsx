import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import LoadingScreen from "../components/LoadingScreen"; 
import ReactGA from 'react-ga4';

// Review Components
import ReviewSlider from "../components/ReviewSlider";
import ReviewModal from "../components/ReviewModal";
// NEW: Import the Upsell Component
import UpsellSection from "../components/UpsellSection";

const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.length < 5) return false;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return true;
    if (url.startsWith('data:image/')) return url.length > 500; 
    return false;
};

const getCleanImages = (productData) => {
    let images = (productData.images && Array.isArray(productData.images) ? productData.images : []);
    if (productData.image && !images.includes(productData.image)) {
        images.unshift(productData.image); 
    }
    const validUrls = images.filter(url => isValidImageUrl(url));
    return [...new Set(validUrls)];
};

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]); // Needed for Upsell lookup
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [mainImage, setMainImage] = useState(""); 
  const [selectedSize, setSelectedSize] = useState(null); 
  const [reviews, setReviews] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        // 1. Fetch current product
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() };
          const cleanImages = getCleanImages(productData);
          const productWithImages = { ...productData, uniqueGalleryImages: cleanImages };

          setProduct(productWithImages);
          setMainImage(cleanImages[0] || "/perfume.jpeg");

          ReactGA.event('view_item', {
              currency: "EGP",
              value: Number(productData.price) || 0, 
              items: [{
                  item_id: productData.id,
                  item_name: productData.title,
                  price: Number(productData.price) || 0,
              }]
          });
        }

        // 2. Fetch all products (to pass to UpsellSection)
        const productsSnap = await getDocs(collection(db, "products"));
        const productsList = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllProducts(productsList);

      } catch (error) {
        console.error("Error fetching product data:", error);
      } finally {
        setLoading(false);
      }
    };

    const q = query(
        collection(db, "reviews"), 
        where("productId", "==", id), 
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(reviewsData);
    });

    fetchProductData();
    return () => unsubscribe();
  }, [id]);

  const handleAddToCart = (itemToTarget = null) => {
    // If itemToTarget is provided (from Upsell), use it; otherwise use main product
    const target = itemToTarget || product;
    
    const finalPrice = itemToTarget ? Number(itemToTarget.price) : (selectedSize ? Number(selectedSize.price) : Number(product.price));
    const finalSizeLabel = itemToTarget ? (itemToTarget.subtitle || "Standard") : (selectedSize ? selectedSize.size : (product.subtitle || "Standard"));

    const cartItem = {
      ...target,
      price: finalPrice || 0,
      selectedSize: finalSizeLabel,
      cartItemId: `${target.id}-${finalSizeLabel}`
    };
    
    addToCart(cartItem);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const getStockPercentage = (stock) => {
    const MAX_URGENCY = 10;
    const s = Number(stock) || 0;
    if (s <= 0) return 0;
    if (s >= MAX_URGENCY) return 100;
    return (s / MAX_URGENCY) * 100;
  };

  if (loading) return <LoadingScreen />;
  if (!product) return <div className="min-h-screen p-8 text-center font-bold">Product not found</div>;

  const uniqueGalleryImages = product.uniqueGalleryImages || [];
  const currentMainImage = mainImage || uniqueGalleryImages[0] || "/perfume.jpeg";

  const displayedPrice = selectedSize?.price 
    ? Number(selectedSize.price) 
    : (Number(product.price) || 0);

  return (
    <div className="min-h-screen">
      <div className="p-6 md:p-12 flex flex-col md:flex-row gap-10 relative max-w-7xl mx-auto">
        
        {/* LEFT: IMAGE GALLERY */}
        <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col gap-4 md:sticky md:top-8 md:self-start">
          <div className="aspect-[4/5] overflow-hidden shadow-xl rounded-2xl bg-gray-50">
            <img
              src={currentMainImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
            />
          </div>

          {uniqueGalleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {uniqueGalleryImages.map((imgUrl, index) => (
                <button
                  key={index}
                  onClick={() => setMainImage(imgUrl)}
                  className={`flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all
                    ${imgUrl === currentMainImage ? 'border-[#1C3C85] scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}
                  `}
                >
                  <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: PRODUCT INFO */}
        <div className="flex-1 flex flex-col gap-6 py-2">
          <div className="border-b border-gray-100 pb-4">
              <h1 className="text-4xl font-black font-archivo uppercase tracking-tighter text-[#1C3C85]">
                  {product.title}
              </h1>
              <p className="text-lg text-stone-500 font-medium mt-1">{product.subtitle}</p>
          </div>
          
          {product.inspiredBy && (
              <div className="bg-stone-50 border-l-4 border-[#1C3C85] p-3 rounded-r-lg">
                  <p className="text-sm font-medium text-stone-600">
                      Inspired by: <span className="font-bold text-stone-900">{product.inspiredBy}</span>
                  </p>
              </div>
          )}

          <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900">
                EGP {displayedPrice.toLocaleString()}
              </span>
          </div>

          {/* SIZE SELECTOR */}
          {product.sizeOptions && Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0 && (
            <div className="mt-2">
              <h4 className="font-bold uppercase text-[10px] tracking-widest text-stone-400 mb-3">Select Size</h4>
              <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedSize(null)}
                    className={`px-6 py-2 rounded-full border-2 text-sm font-bold transition-all
                      ${!selectedSize 
                        ? 'border-[#1C3C85] bg-[#1C3C85] text-white shadow-md' 
                        : 'border-gray-200 text-stone-600 hover:border-[#1C3C85]'
                      }
                    `}
                >
                    {product.subtitle || "Standard"}
                </button>

                {product.sizeOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSize(opt)}
                    className={`px-6 py-2 rounded-full border-2 text-sm font-bold transition-all
                      ${selectedSize?.size === opt.size 
                        ? 'border-[#1C3C85] bg-[#1C3C85] text-white shadow-md' 
                        : 'border-gray-200 text-stone-600 hover:border-[#1C3C85]'
                      }
                    `}
                  >
                    {opt.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.stock > 0 && product.stock <= 10 && (
            <div className="space-y-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
                <p className="text-sm font-bold text-stone-800 uppercase tracking-wide">
                  Hurry! Only <span className="text-red-600">{product.stock} items</span> left in stock
                </p>
              </div>
              
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${getStockPercentage(product.stock)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-2">
              {Number(product.stock) > 0 ? (
                  <button
                      className="w-full bg-[#1C3C85] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-[#142d63] transition-all transform active:scale-95 shadow-lg" 
                      onClick={() => handleAddToCart()}
                  >
                      Add to Cart
                  </button>
              ) : (
                  <button
                      className="w-full bg-gray-300 text-gray-500 py-4 rounded-xl font-bold uppercase cursor-not-allowed"
                      disabled
                  >
                      Out of Stock
                  </button>
              )}
          </div>
          
          <div className="mt-4 border-t border-gray-50 pt-4">
              <h4 className="font-bold uppercase text-xs tracking-widest text-stone-400 mb-2">Description</h4>
              <div className="text-stone-700 leading-relaxed text-md whitespace-pre-wrap">
                  {product.description}
              </div>
          </div>

          {/* NEW: UPSELL SECTION INTEGRATION */}
          <UpsellSection 
            currentProduct={product} 
            allProducts={allProducts} 
            addToCart={(item) => handleAddToCart(item)}
          />

        </div>
      </div>

      {/* Review Sections */}
      <div className="max-w-7xl mx-auto mt-12 border-t border-gray-100 pt-12 pb-20">
        <ReviewSlider title={`Reviews for ${product.title}`} reviews={reviews} />
        <div className="flex justify-center mt-10">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-10 py-4 border-2 border-[#1C3C85] text-[#1C3C85] font-black uppercase tracking-widest rounded-full hover:bg-[#1C3C85] hover:text-white transition-all transform hover:-translate-y-1 shadow-md"
          >
            Review this scent
          </button>
        </div>
      </div>

      <ReviewModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          productId={id} 
          productTitle={product.title}
      />

      {showToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-[#1C3C85] text-white px-8 py-4 rounded-2xl shadow-2xl z-50 animate-bounce font-bold uppercase tracking-wider">
          Added to your bag!
        </div>
      )}
    </div>
  );
}