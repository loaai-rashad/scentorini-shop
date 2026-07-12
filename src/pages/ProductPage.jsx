import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Minus, Plus, Truck, BadgeCheck, Sparkles, FlaskConical } from "lucide-react";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import LoadingScreen from "../components/LoadingScreen";
import ReactGA from 'react-ga4';
import { pixelTrack } from "../lib/metaPixel";
import { setPageMeta } from "../lib/seo";

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

// TARGETED UPDATE: Cleans and aggregates images, checking arrays first and merging legacy string links safely
const getCleanImages = (productData) => {
    // 1. Capture the array values from your dashboard file uploads first
    let images = (productData.images && Array.isArray(productData.images) ? productData.images : []);
    
    // 2. If an old single image string exists and isn't already inside the list, add it as a fallback
    if (productData.image && !images.includes(productData.image)) {
        images.push(productData.image); 
    }
    
    // 3. Filter out bad strings/undefined values
    const validUrls = images.filter(url => isValidImageUrl(url));
    
    // 4. Return an array free of duplicate URL strings
    return [...new Set(validUrls)];
};

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [mainImage, setMainImage] = useState("");
  const [selectedSize, setSelectedSize] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Refs for scroll-to-reviews and the sticky-bar visibility trigger
  const reviewsRef = useRef(null);
  const ctaRef = useRef(null);

  // Show the mobile sticky add-to-cart bar once the main CTA scrolls out of view
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
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

          // --- Meta Pixel: ViewContent ---
          pixelTrack('ViewContent', {
              content_ids: [productData.id],
              content_name: productData.title,
              content_type: 'product',
              value: Number(productData.price) || 0,
              currency: 'EGP',
          });

          // --- SEO: per-product title + description ---
          setPageMeta({
              title: `${productData.title} | Scentorini`,
              description:
                  productData.subtitle ||
                  (productData.description ? String(productData.description).slice(0, 160) : "") ||
                  `${productData.title} — discover it at Scentorini.`,
          });
        }

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

  /**
   * UPDATED: handleAddToCart
   * This now passes the price and size correctly to match the new CartContext logic.
   */
  const handleAddToCart = (itemToTarget = null) => {
    const target = itemToTarget || product;
   
    // Determine the final price based on selection
    const finalPrice = itemToTarget 
      ? Number(itemToTarget.price) 
      : (selectedSize ? Number(selectedSize.price) : Number(product.price));

    // Determine the label for the size
    const finalSizeLabel = itemToTarget 
      ? (itemToTarget.subtitle || "Standard") 
      : (selectedSize ? selectedSize.size : (product.subtitle || "Standard"));

    // Prepare the item object for the cart
    const cartItem = {
      ...target,
      price: finalPrice || 0,
    };
    
    // CRITICAL FIX: Pass the size as the SECOND argument to match CartContext.
    // For the main product, honor the chosen quantity (upsell items add 1).
    const times = itemToTarget ? 1 : Math.max(1, quantity);
    for (let i = 0; i < times; i++) {
      addToCart(cartItem, finalSizeLabel);
    }

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

  // --- Review summary (uses the reviews already fetched for this product) ---
  const reviewCount = reviews.length;
  const avgRating = reviewCount
    ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviewCount
    : 0;

  const inStock = Number(product.stock) > 0;
  const maxQty = Math.max(1, Number(product.stock) || 1);
  const isTester = String(product.for).toLowerCase() === "tester";

  const scrollToReviews = () =>
    reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Render a row of 5 stars filled up to `value`.
  const renderStars = (value, size = 16) =>
    [...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={size}
        className="flex-shrink-0"
        fill={i < Math.round(value) ? "#1C3C85" : "none"}
        color="#1C3C85"
      />
    ));

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

              {/* Rating summary — social proof up top */}
              <button
                onClick={scrollToReviews}
                className="flex items-center gap-2 mt-3 group"
              >
                {reviewCount > 0 ? (
                  <>
                    <span className="flex items-center gap-0.5">{renderStars(avgRating, 16)}</span>
                    <span className="text-sm font-bold text-stone-800">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-stone-500 group-hover:text-[#1C3C85] underline-offset-2 group-hover:underline">
                      ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-0.5 opacity-40">{renderStars(0, 16)}</span>
                    <span className="text-sm text-stone-500 group-hover:text-[#1C3C85] underline-offset-2 group-hover:underline">
                      Be the first to review
                    </span>
                  </>
                )}
              </button>
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
          
          <div ref={ctaRef} className="flex flex-col gap-4 mt-2">
              {inStock ? (
                  <div className="flex items-stretch gap-3">
                      {/* Quantity stepper */}
                      <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                          <button
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              disabled={quantity <= 1}
                              aria-label="Decrease quantity"
                              className="px-4 py-4 text-stone-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                          >
                              <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-black text-stone-900 select-none">{quantity}</span>
                          <button
                              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                              disabled={quantity >= maxQty}
                              aria-label="Increase quantity"
                              className="px-4 py-4 text-stone-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                          >
                              <Plus className="w-4 h-4" />
                          </button>
                      </div>
                      {/* Add to cart */}
                      <button
                          className="flex-1 bg-[#1C3C85] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-[#142d63] transition-all transform active:scale-95 shadow-lg"
                          onClick={() => handleAddToCart()}
                      >
                          Add to Cart
                      </button>
                  </div>
              ) : (
                  <button
                      className="w-full bg-gray-300 text-gray-500 py-4 rounded-xl font-bold uppercase cursor-not-allowed"
                      disabled
                  >
                      Out of Stock
                  </button>
              )}

              {/* Trust badges — reassurance right at the buy decision */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                      { icon: BadgeCheck, label: "Authentic" },
                      { icon: Truck, label: "Fast delivery" },
                      { icon: Sparkles, label: "Long lasting" },
                  ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center text-center gap-1.5 text-stone-500">
                          <Icon className="w-5 h-5 text-[#1C3C85]" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide leading-tight">{label}</span>
                      </div>
                  ))}
              </div>

              {/* Sample cross-sell — capture risk-averse buyers */}
              {!isTester && (
                  <Link
                      to="/testers/builder"
                      className="flex items-center justify-center gap-2 text-sm font-bold text-stone-600 hover:text-[#1C3C85] transition-colors mt-1"
                  >
                      <FlaskConical className="w-4 h-4" />
                      Not sure? Try a sample first
                  </Link>
              )}
          </div>
          
          <div className="mt-4 border-t border-gray-50 pt-4">
              <h4 className="font-bold uppercase text-xs tracking-widest text-stone-400 mb-2">Description</h4>
              <div className="text-stone-700 leading-relaxed text-md whitespace-pre-wrap">
                  {product.description}
              </div>
          </div>

          <UpsellSection 
            currentProduct={product} 
            allProducts={allProducts} 
            addToCart={(item) => handleAddToCart(item)}
          />

        </div>
      </div>

      <div ref={reviewsRef} className="max-w-7xl mx-auto mt-12 border-t border-gray-100 pt-12 pb-20 scroll-mt-24">
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

      {/* Sticky add-to-cart bar (mobile) — keeps the CTA reachable while scrolling */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3 transition-transform duration-300 ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <img
          src={currentMainImage}
          alt={product.title}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-500 truncate">{product.title}</p>
          <p className="text-base font-black text-stone-900">EGP {displayedPrice.toLocaleString()}</p>
        </div>
        {inStock ? (
          <button
            onClick={() => handleAddToCart()}
            className="bg-[#1C3C85] text-white px-7 py-3 rounded-xl font-black uppercase tracking-wider text-sm active:scale-95 transition-transform shadow-lg"
          >
            Add to Cart
          </button>
        ) : (
          <button
            disabled
            className="bg-gray-300 text-gray-500 px-7 py-3 rounded-xl font-bold uppercase text-sm"
          >
            Sold Out
          </button>
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-[#1C3C85] text-white px-8 py-4 rounded-2xl shadow-2xl z-50 animate-bounce font-bold uppercase tracking-wider">
          Added to your bag!
        </div>
      )}
    </div>
  );
}