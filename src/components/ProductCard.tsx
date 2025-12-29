// src/components/ProductCard.jsx

import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function ProductCard({
  id,
  // 1. KEY CHANGE: Accept 'images' array instead of single 'image' string
  images, 
  title,
  subtitle,
  price,
  stock = 0, 
  for: productFor, 
  className = "",
}) {
  
  // 2. NEW LOGIC: Determine the main image URL from the array
  const mainImageUrl = (images && images.length > 0) 
    ? images[0] 
    : "/perfume.jpeg"; // Fallback if array is empty

  // 3. Logic remains unchanged
  const isTester = 
    productFor && 
    String(productFor).toLowerCase() === 'tester';

  // 4. Path remains unchanged
  const path = isTester 
    ? `/testers/builder`    
    : `/products/${id}`;    

  return (
    // 5. Link remains unchanged
    <Link to={path} className="w-full">
      <Card
        className={`overflow-hidden bg-white cursor-pointer transition ${className}`}
      >
        {/* Product Image */}
        <div className="w-full 
             h-64 sm:h-72 md:h-80 lg:h-96 xl:h-96 
             bg-gray-100 flex items-center justify-center relative">
          <img
            // 6. CRITICAL FIX: Use the calculated mainImageUrl
            src={mainImageUrl}
            alt={title}
            className="w-full h-full object-cover" 
          />

          {/* Out of Stock Badge (Positioning is clean) */}
          {stock === 0 && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          )}

          {/* Tester Badge (Positioning is clean) */}
          {isTester && (
             <span className="absolute top-3 right-3 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Tester Set
            </span>
          )}
        </div>

        {/* Product Details - Mimicking the detached Title/Price structure */}
        <div className="p-2 pt-3 flex justify-between items-start">
            
          {/* Left Side: Title and Subtitle */}
          <div className="flex flex-col items-start pr-4">
            <h3 className="text-lg font-bold tracking-tight text-stone-900 uppercase">
              {title}
              {isTester && " Builder"} 
            </h3>
            <p className="text-stone-500 text-sm tracking-wide mt-1">
                {subtitle}
            </p>
          </div>

          {/* Right Side: Price / Status */}
          {stock > 0 ? (
            // Price Display
            <div className="text-right">
              <span className="text-xl font-extrabold text-stone-900 whitespace-nowrap">
                {/* Dynamically adjust prefix based on product type */}
                {isTester ? `Start from EGP${price.toFixed(2)}` : `EGP${price.toFixed(2)}`}
              </span>
            </div>
          ) : (
            // Currently Unavailable Status
            <div className="text-right text-red-600 font-semibold text-sm whitespace-nowrap pt-2">
                Unavailable
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}