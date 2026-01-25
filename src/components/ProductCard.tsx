// src/components/ProductCard.jsx
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function ProductCard({
  id,
  images, 
  title,
  subtitle,
  price,
  stock = 0, 
  for: productFor, 
  className = "",
}) {
  
  // LOGIC: Image Selection
  const mainImageUrl = (images && images.length > 0) ? images[0] : "/perfume.jpeg"; 

  // LOGIC: Product Type Identification
  const isTester = productFor && String(productFor).toLowerCase() === 'tester';
  
  // LOGIC: Routing Path Determination
  const path = isTester ? `/testers/builder` : `/products/${id}`;    

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
          <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
            {stock > 0 ? (
              <span className="text-sm md:text-base font-extrabold text-[#1C3C85]">
                {isTester ? `From EGP ${price}` : `EGP ${price.toLocaleString()}`}
              </span>
            ) : (
              <span className="text-red-600 font-bold text-xs uppercase">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}