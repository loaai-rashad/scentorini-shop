// src/components/ProductCard.jsx

import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function ProductCard({
  id,
  image,
  title,
  subtitle,
  price,
  stock = 0, 
  for: productFor, 
  className = "",
}) {
  // Logic remains unchanged
  const isTester = 
    productFor && 
    String(productFor).toLowerCase() === 'tester';

  const path = isTester 
    ? `/testers/builder`    
    : `/products/${id}`;    

  return (
    <Link to={path} className="w-full">
      <Card
        className={`overflow-hidden bg-white cursor-pointer transition ${className}`}
      >
        {/* Product Image Container */}
        {/* --- CRITICAL CHANGE: Decreasing the height utility classes (e.g., h-96 -> h-80/h-72) --- */}
        <div className="w-full 
             h-80 sm:h-72 md:h-80 lg:h-96 xl:h-96  // <-- ADJUSTED HEIGHTS HERE
             bg-gray-100 flex items-center justify-center relative">
          <img
            src={image || "/perfume.jpeg"}
            alt={title}
            className="w-full h-full object-cover" 
          />

          {/* Badges remain unchanged */}
          {stock === 0 && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          )}

          {isTester && (
             <span className="absolute top-3 right-3 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Tester Set
            </span>
          )}
        </div>

        {/* Product Details (Remains unchanged from the visual fix) */}
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
            <div className="text-right">
              <span className="text-xl font-extrabold text-stone-900 whitespace-nowrap">
                {isTester ? `Start from EGP${price.toFixed(2)}` : `EGP${price.toFixed(2)}`}
              </span>
            </div>
          ) : (
            <div className="text-right text-red-600 font-semibold text-sm whitespace-nowrap pt-2">
                Unavailable
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}