// src/components/ProductsList.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
// ProductCard is imported here and used inside the standalone section
import ProductCard from "./ProductCard"; 
import LoadingScreen from "./LoadingScreen"; 
// ProductGroup is the new component handling the titles and 3-column grid
import ProductGroup from "./ProductGroup"; 

export default function ProductsList() {
  // State variables for all four distinct product categories
  const [productsForHim, setProductsForHim] = useState([]);
  const [productsForHer, setProductsForHer] = useState([]);
  const [productsForUnisex, setProductsForUnisex] = useState([]);
  const [productsForTesters, setProductsForTesters] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsArray = querySnapshot.docs.map(doc => ({
          id: doc.id,
          rating: 0, 
          // Ensure all product data, including the 'for' field, is spread here
          ...doc.data(),
        }));
        
        // --- Filtering Logic (Exact Match on 'for' field) ---
        // Note: The logic uses .toLowerCase() === to handle case variations (e.g., Him, him, HIM)

        const himProducts = productsArray.filter(
             product => product.for && product.for.toLowerCase() === "him"
        );
        const herProducts = productsArray.filter(
             product => product.for && product.for.toLowerCase() === "her"
        );
        const unisexProducts = productsArray.filter(
             product => product.for && product.for.toLowerCase() === "unisex"
        ); 
        const testerProducts = productsArray.filter(
             product => product.for && product.for.toLowerCase() === "tester"
        ); 

        setProductsForHim(himProducts);
        setProductsForHer(herProducts);
        setProductsForUnisex(unisexProducts);
        setProductsForTesters(testerProducts);
        
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <LoadingScreen />; 
  
  // Find the Hidden Desire product for the standalone card 
  // We search across all lists to ensure we find it, even if its 'for' field changes.
  const allProducts = [...productsForHim, ...productsForHer, ...productsForUnisex, ...productsForTesters];
  const hiddenDesireProduct = allProducts.find(
    product => product.title && product.title.toLowerCase() === "hidden desire"
  );

  return (
    <div className="container mx-auto py-10">
      
      {/* 1. Scentorini for Him Section */}
      <ProductGroup 
        title="Scentorini for Him" 
        products={productsForHim} 
      />

      {/* 2. Scentorini for Her Section */}
      <ProductGroup 
        title="Scentorini for Her" 
        products={productsForHer} 
      />
      
      {/* 3. Scentorini Unisex Selection (This includes Hidden Desire) */}
      <ProductGroup 
        title="Scentorini Unisex Selection" 
        products={productsForUnisex} 
      />

      {/* 4. Scentorini Testers Section */}
      <ProductGroup 
        title="Scentorini Testers" 
        products={productsForTesters} 
      />

  
      
    </div>
  );
}