import React from 'react';
import ProductCard from './ProductCard'; 

export default function HorizontalProductSlider({ title, products }) {
  
  if (!products || products.length === 0) {
    return null;
  }
  
  const PADDING_CLASSES = "px-4 sm:px-8 lg:px-12"; 

  return (
    <section className="my-4"> {/* Reduced from mt-12 mb-16 */}
      
      {/* Group Heading - Reduced bottom margin to mb-4 */}
      <h2 
  className={`
    text-2xl 
    font-archivo 
    font-black 
    uppercase 
    text-center 
    mb-6 
    tracking-tighter 
    text-[#1C3C85]  /* 👈 Added the specific blue from your other titles */
    pb-4 
    ${PADDING_CLASSES}
  `}
>
  {title}
</h2>

      {/* HORIZONTAL SCROLLING CONTAINER */}
      <div 
        className="overflow-x-scroll"
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
      
      {/* Separator Line - Reduced top margin to mt-6 */}
      <hr className={`mt-6 mx-auto w-3/4 border-gray-200 ${PADDING_CLASSES}`} />
    </section>
  );
}