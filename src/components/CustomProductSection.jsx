// src/components/CustomProductSection.jsx

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard'; 

export default function CustomProductSection({ sectionConfig }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { title, productIds } = sectionConfig; 
  
  // Logic to fetch products from Firestore based on IDs (this remains robust)
  useEffect(() => {
    if (!productIds || productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productPromises = productIds.map(id => getDoc(doc(db, "products", id)));
        const snapshots = await Promise.all(productPromises);

        const fetchedProducts = snapshots
          .filter(snap => snap.exists())
          .map(snap => {
              const data = snap.data();
              return { 
                  id: snap.id, 
                  ...data,
                  // Ensure data integrity for ProductCard
                  images: data.images || (data.image ? [data.image] : []),
                  stock: data.stock !== undefined ? data.stock : 0, 
                  title: data.title || "Untitled Product", 
                  price: parseFloat(data.price) || 0,
              };
          });
        
        const orderedProducts = productIds
          .map(id => fetchedProducts.find(p => p.id === id))
          .filter(p => p);
          
        setProducts(orderedProducts);
      } catch (error) {
        console.error(`Error fetching products for section "${title}":`, error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [productIds, title]); 

  if (loading) {
    return productIds && productIds.length > 0 ? (
        <div className="text-center p-8 text-gray-500">Loading {title} products...</div>
    ) : null; 
  }

  if (products.length === 0) {
    return null; 
  }
  
  // Renders the section with title and product cards
  return (
    <section className="p-8 max-w-7xl mx-auto my-12">
      <h2 className="text-3xl font-montserrat bold font-bold text-[#1C3C85] text-center mb-6">
        {title}
      </h2>
      
      {/* 💥 DYNAMIC CENTERING LOGIC HERE 💥 */}
      <div 
        className={`
          flex gap-6 pb-4
          ${products.length === 1 
            ? 'justify-center' // If only one product, center the flex container
            : 'overflow-x-auto custom-scrollbar' // If multiple, use scroll
          }
        `}
      >
        {products.map((product) => (
          <div 
            key={product.id} 
            className="flex-shrink-0 w-64" 
          > 
            {/* Pass individual props for compatibility with existing ProductCard.jsx */}
            <ProductCard 
                id={product.id}
                images={product.images}
                title={product.title}
                subtitle={product.subtitle}
                price={product.price}
                stock={product.stock}
                for={product.for}
            /> 
          </div>
        ))}
      </div>
      
      {/* Scrollbar styling for aesthetic consistency */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #ddd;
          border-radius: 10px;
        }
        .custom-scrollbar {
          scrollbar-width: thin; 
          scrollbar-color: #ddd transparent; 
        }
      `}</style>
    </section>
  );
}