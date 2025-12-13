// src/components/HorizontalProductSlider.jsx

import React from 'react';
import ProductCard from './ProductCard'; 

export default function HorizontalProductSlider({ title, products }) {
  
  if (!products || products.length === 0) {
    return null;
  }
  
  // Define the padding we want on the sides of the visible screen content
  const PADDING_CLASSES = "px-4 sm:px-8 lg:px-12"; 

  return (
    <section className="mt-12 mb-16"> 
      
      {/* Group Heading */}
      <h2 className={`text-3xl font-serif text-center mb-10 tracking-widest border-b pb-2 ${PADDING_CLASSES}`}>
        {title}
      </h2>

      {/* HORIZONTAL SCROLLING CONTAINER WRAPPER */}
      <div 
        className="
          overflow-x-scroll 
          // REMOVED: scrollbar-hide (since the plugin might be missing)
        "
        style={{ 
          WebkitOverflowScrolling: 'touch',
          // --- CRITICAL FIX: Inline CSS to hide the scrollbar for Webkit browsers (Chrome, Safari) ---
          MsOverflowStyle: 'none',   /* IE and Edge */
          scrollbarWidth: 'none',    /* Firefox */
          // Webkit scrollbar pseudo-elements are handled via global CSS or a plugin, 
          // but often setting the others helps greatly.
        }}
      >
        {/* INNER FLEX CONTAINER */}
        <div
          className={`
            flex 
            ${PADDING_CLASSES} 
            space-x-6 
            pb-4 
            mr-[-24px] 
          `}
        >
          {products.map(product => (
            <div 
              key={product.id} 
              className="flex-none w-72 md:w-80" 
            >
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      </div>
      
      <hr className={`mt-16 mx-auto w-3/4 border-gray-200 ${PADDING_CLASSES}`} />
    </section>
  );
}