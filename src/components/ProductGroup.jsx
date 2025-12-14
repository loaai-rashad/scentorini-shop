// src/components/ProductGroup.jsx

import React from 'react';
import ProductCard from './ProductCard'; 

export default function ProductGroup({ title, products }) {
  
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 mb-16">
      {/* Group Heading */}
      <h2 className="text-3xl font-serif text-center mb-10 tracking-widest border-b pb-2">
        {title}
      </h2>

      {/* --- CRITICAL EDIT: Grid Columns Adjusted --- */}
      {/* - grid-cols-1: Default (Mobile Phones) -> 1 column
        - sm:grid-cols-2: Small Screens (Small Tablets/Large Phones) -> 2 columns
        - md:grid-cols-3: Medium Screens (Tablets/Small Desktops) -> 3 columns
        - lg:grid-cols-4: Large Screens (Desktop) -> 4 columns 
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-8">
        {products.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
      
      {/* Visual Separator */}
      <hr className="mt-16 mx-auto w-3/4 border-gray-200" />
    </section>
  );
}