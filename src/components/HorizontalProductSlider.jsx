// src/components/HorizontalProductSlider.jsx

import React from 'react';
import ProductCard from './ProductCard'; 

export default function HorizontalProductSlider({ title, products }) {
  
  if (!products || products.length === 0) {
    return null;
  }
  
  const PADDING_CLASSES = "px-4 sm:px-8 lg:px-12"; 

  return (
    <section className="mt-12 mb-16"> 
      
      {/* 2. Group Heading - ENSURE MONTSERRAT BOLD IS APPLIED HERE */}
      <h2 
        className={`
          text-3xl 
          font-bold          
          text-center 
          mb-10 
          tracking-widest 
          border-b 
          pb-2 
          ${PADDING_CLASSES}
        `}
        // --- CRITICAL FIX: Explicitly set the font family ---
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {title}
      </h2>

      {/* HORIZONTAL SCROLLING CONTAINER WRAPPER (Rest of code is unchanged) */}
      <div 
        className="
          overflow-x-scroll 
        "
        style={{ 
          WebkitOverflowScrolling: 'touch',
          MsOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
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