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
      className="px-4 md:px-8 py-4 max-w-7xl mx-auto my-4 md:my-8"
    >
      <h2 className="text-xl md:text-3xl font-montserrat font-bold text-[#1C3C85] text-center mb-8 md:mb-10 whitespace-nowrap">
        {title}
      </h2>
      
      {/* Scroll Wrapper */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-6">
        {/* Centering Wrapper: 
            If products < 4, it centers them. 
            If more, it allows them to take their natural width for scrolling. */}
        <div 
          className={`
            flex gap-6 min-w-full w-max mx-auto
            ${products.length < 4 ? 'justify-center' : 'justify-start px-4'}
          `}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-64"> 
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
      </div>
    </motion.section>
  );
}