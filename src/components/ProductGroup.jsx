// src/components/ProductGroup.jsx
import React from 'react';
import ProductCard from './ProductCard'; // Make sure this import path is correct

export default function ProductGroup({ title, products }) {
  // If no products, don't render the section
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 mb-16">
      {/* Group Heading */}
      <h2 className="text-3xl font-serif text-center mb-10 tracking-widest border-b pb-2">
        {title}
      </h2>

      {/* 3-Column Grid Layout: This implements the 3-product-per-row design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-8">
        {products.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
      
      {/* Visual Separator */}
      <hr className="mt-16 mx-auto w-3/4 border-gray-200" />
    </section>
  );
}