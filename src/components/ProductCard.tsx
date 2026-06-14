// src/components/ProductCard.jsx
import { useState, type MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ProductCard({
  id,
  image,  // Added back fallback string property explicitly just in case
  images,
  title,
  subtitle,
  price,
  stock = 0,
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
    <Link to={path} className="w-full block h-full"> 
      {/* LOGIC: 'flex-col h-full' forces uniform card heights */}
      <Card
        className={`flex flex-col h-full overflow-hidden rounded-2xl border-none shadow-sm bg-white cursor-pointer transition hover:shadow-md ${className}`}
      >
        {/* Image Section - Fixed Aspect Ratio */}
        <div className="w-full h-64 sm:h-72 md:h-80 bg-gray-100 flex items-center justify-center relative overflow-hidden flex-shrink-0">
          <img
            src={mainImageUrl}
            alt={title}
            className="w-full h-full object-cover" 
          />

          {/* LOGIC: Conditional Badges */}
          {stock === 0 && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              Out of Stock
            </span>
          )}
        </div>

        {/* Details Section - 'flex-grow' ensures the bottom row aligns */}
        <div className="p-4 flex flex-col justify-between flex-grow">
            
          <div className="mb-2">
            {/* LOGIC: 'line-clamp' prevents height jumps from long titles */}
            <h3 className="text-sm md:text-base font-bold text-stone-900 uppercase line-clamp-1">
              {title}{isTester && " Builder"} 
            </h3>
            <p className="text-stone-500 text-xs mt-1 line-clamp-1">
                {subtitle}
            </p>
          </div>

          {/* LOGIC: Conditional Price/Availability Display */}
          <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center gap-2">
            {stock > 0 ? (
              <span className="text-sm md:text-base font-extrabold text-[#1C3C85]">
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
                disabled={stock <= 0}
                aria-label={`Add ${title} to cart`}
                title={stock <= 0 ? "Out of stock" : "Add to cart"}
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                  stock <= 0
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : justAdded
                    ? "bg-emerald-500 text-white"
                    : "bg-[#1C3C85] text-white hover:bg-[#142d63]"
                }`}
              >
                {justAdded ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}