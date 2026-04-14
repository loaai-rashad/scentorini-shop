import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard'; 
import { motion } from 'framer-motion';

export default function CustomProductSection({ sectionConfig }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { title, productIds } = sectionConfig; 
  
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
        <div className="text-center p-8 text-gray-500 font-montserrat">Loading {title}...</div>
    ) : null; 
  }

  if (products.length === 0) {
    return null; 
  }
  
  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="px-4 md:px-8 py-4 max-w-7xl mx-auto my-4 md:my-8 overflow-hidden"
    >
      <h2 className="text-xl md:text-3xl font-montserrat font-bold text-[#1C3C85] text-center mb-8 md:mb-10 whitespace-nowrap">
        {title}
      </h2>
      
      {/* FIX: 
          1. We use 'justify-center' by default.
          2. We use 'md:justify-start' and 'overflow-x-auto' only if products exceed view.
          3. 'items-center' ensures cards stay vertically aligned.
      */}
      <div 
        className={`
          flex gap-6 pb-6 w-full
          /* The logic: 
             - Centered by default (for 1-2 items)
             - Switches to justify-start and allows scrolling ONLY when content overflows
          */
          ${products.length < 4 
            ? 'justify-center' 
            : 'justify-start overflow-x-auto custom-scrollbar'
          }
          /* Important for mobile: always allow start-alignment if the screen is too narrow */
          max-md:justify-start max-md:overflow-x-auto
        `}
      >
        {products.map((product) => (
          <div 
            key={product.id} 
            className="flex-shrink-0 w-64" 
          > 
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
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar {
          scrollbar-width: thin; 
          scrollbar-color: #e2e8f0 transparent; 
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </motion.section>
  );
}