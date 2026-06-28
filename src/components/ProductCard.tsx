// src/components/ProductCard.jsx
import { useState, type MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ShoppingCart, Check, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ProductCard({
  id,
  image,  // Added back fallback string property explicitly just in case
  images,
  title,
  subtitle,
  price,
  stock = 0,
  inspiredBy = "",
  for: productFor,
  className = "",
}) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  // LOGIC: Check array first, fallback to single legacy image string next, then fallback to placeholder
  const mainImageUrl = (images && images.length > 0 && images[0])
    ? images[0]
    : (image || "/perfume.jpeg");

  // LOGIC: Product Type Identification
  const isTester = productFor && String(productFor).toLowerCase() === 'tester';
  const genderLabel = String(productFor).toLowerCase() === 'her'
    ? 'For Her'
    : String(productFor).toLowerCase() === 'him'
    ? 'For Him'
    : null;

  // LOGIC: Stock state for badges / urgency
  const isOut = Number(stock) <= 0;
  const isLow = !isOut && Number(stock) <= 5;

  // LOGIC: Routing Path Determination
  const path = isTester ? `/testers/builder` : `/products/${id}`;

  // LOGIC: Add to cart directly from the card without navigating to the product page
  const handleAddToCart = (e: MouseEvent<HTMLButtonElement>) => {
    // Card is wrapped in a <Link>; stop the click from triggering navigation
    e.preventDefault();
    e.stopPropagation();

    if (stock <= 0) return;

    const product = {
      id,
      title,
      subtitle,
      price: Number(price) || 0,
      stock,
      image,
      images,
      for: productFor,
    };

    // Pass subtitle as the default size/variant label, matching ProductPage behaviour
    addToCart(product, subtitle || "Standard");

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <Link to={path} className="w-full block h-full group">
      {/* LOGIC: 'flex-col h-full' forces uniform card heights */}
      <Card
        className={`flex flex-col h-full overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
      >
        {/* Image Section - Fixed Aspect Ratio */}
        <div className="w-full h-64 sm:h-72 md:h-80 bg-gray-100 flex items-center justify-center relative overflow-hidden flex-shrink-0">
          <img
            src={mainImageUrl}
            alt={title}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isOut ? "opacity-60 grayscale" : ""
            }`}
          />

          {/* Subtle gradient for depth + badge legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

          {/* Top-left status badge */}
          {isOut ? (
            <span className="absolute top-3 left-3 bg-gray-900/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
              Sold Out
            </span>
          ) : isLow ? (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
              Only {stock} left
            </span>
          ) : null}

          {/* Top-right gender tag */}
          {genderLabel && (
            <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#1C3C85] text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">
              {genderLabel}
            </span>
          )}
        </div>

        {/* Details Section - 'flex-grow' ensures the bottom row aligns */}
        <div className="p-4 flex flex-col justify-between flex-grow">

          <div className="mb-2">
            {/* LOGIC: 'line-clamp' prevents height jumps from long titles */}
            <h3 className="text-sm md:text-base font-bold text-stone-900 uppercase line-clamp-1 group-hover:text-[#1C3C85] transition-colors">
              {title}{isTester && " Builder"}
            </h3>
            <p className="text-stone-500 text-xs mt-1 line-clamp-1">
                {subtitle}
            </p>
            {/* Inspired-by hint — strong buy trigger for fragrance shoppers */}
            {inspiredBy && (
              <p className="flex items-center gap-1 text-[11px] text-[#1C3C85]/80 font-medium mt-1.5 line-clamp-1">
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                Inspired by {inspiredBy}
              </p>
            )}
          </div>

          {/* LOGIC: Conditional Price/Availability Display */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center gap-2">
            {!isOut ? (
              <span className="text-base md:text-lg font-extrabold text-[#1C3C85]">
                {isTester ? `From EGP ${price}` : `EGP ${price.toLocaleString()}`}
              </span>
            ) : (
              <span className="text-red-600 font-bold text-xs uppercase">
                Unavailable
              </span>
            )}

            {/* LOGIC: Testers route to a builder page, so no direct add-to-cart there */}
            {!isTester && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOut}
                aria-label={`Add ${title} to cart`}
                title={isOut ? "Out of stock" : "Add to cart"}
                className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition-all active:scale-95 ${
                  isOut
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : justAdded
                    ? "bg-emerald-500 text-white"
                    : "bg-[#1C3C85] text-white hover:bg-[#142d63] shadow-md"
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
