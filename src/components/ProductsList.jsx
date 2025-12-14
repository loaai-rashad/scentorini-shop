// src/components/ProductsList.jsx

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { db } from '../firebase'; 
import LoadingScreen from "./LoadingScreen"; 
import ProductGroup from "./ProductGroup"; 

export default function ProductsList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchParams] = useSearchParams();
    const genderFilter = searchParams.get('gender'); 
    
    const pageTitle = genderFilter 
        ? `Scentorini for ${genderFilter}` 
        : 'Scentorini Collection';

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const productsRef = collection(db, "products");
                let productsQuery;
                
                let requiredTags = []; 

                const filterValue = genderFilter ? genderFilter.toLowerCase() : null;

                // --- 1. Determine the required tags for filtering ---
                if (filterValue === "him") {
                    // For Him: Only includes 'him' and 'unisex'
                    requiredTags = ["him", "Him", "unisex", "Unisex"]; 
                } else if (filterValue === "her") {
                    // For Her: Includes 'her', 'unisex', 'oil', AND 'tester' <--- CORRECTED
                    requiredTags = ["her", "Her", "unisex", "Unisex", "oil", "Oil", "tester", "Tester"]; 
                } 
                
                // --- 2. Construct the Firestore Query using 'where' with 'in' ---
                if (requiredTags.length > 0) {
                    productsQuery = query(
                        productsRef, 
                        // The 'in' operator now checks if the single string 'for' matches any of the tags
                        where("for", "in", requiredTags) 
                    );
                } else {
                    // Fallback: If no filter is present, fetch all products
                    productsQuery = productsRef;
                }

                const snapshot = await getDocs(productsQuery);
                
                // --- 3. UPDATED: Remove the blanket exclusion filter ---
                // We no longer need to filter out 'tester' products here,
                // because the Firestore query now handles which 'for' values are included.
                // Since 'tester' is only included in the 'her' filter, it will only show up there.
                const productsData = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })); // Removed the .filter() chain
                
                setProducts(productsData);

            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [genderFilter]); 
    
    
    if (loading) return <LoadingScreen />;
    
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">{pageTitle}</h1>
            
            <ProductGroup products={products} />

            {products.length === 0 && (
                <p className="text-center text-gray-500 mt-10">
                    We're currently updating our collection for {genderFilter || 'this category'}. Check back soon!
                </p>
            )}
        </div>
    );
}