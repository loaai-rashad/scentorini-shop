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
    
    // Using your Bold Archivo style for the title
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

                // 1. Tags for filtering
                if (filterValue === "him") {
                    requiredTags = ["him", "Him", "unisex", "Unisex", "oil", "Oil", "tester", "Tester"]; 
                } else if (filterValue === "her") {
                    requiredTags = ["her", "Her", "unisex", "Unisex", "oil", "Oil", "tester", "Tester"]; 
                } 
                
                if (requiredTags.length > 0) {
                    productsQuery = query(productsRef, where("for", "in", requiredTags));
                } else {
                    productsQuery = productsRef;
                }

                const snapshot = await getDocs(productsQuery);
                
                let productsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // =========================================================
                // 2. CUSTOM PRIORITY SORTING LOGIC
                // =========================================================
                // We assign a numerical "weight" to each type. Lower number = shows up first.
                const getPriority = (forValue) => {
                    const val = String(forValue).toLowerCase();
                    
                    // Priority 1: Exact Gender Matches
                    if (val === filterValue) return 1;
                    
                    // Priority 2: Unisex items
                    if (val === "unisex") return 2;
                    
                    // Priority 3: Perfume Oils
                    if (val === "oil") return 3;
                    
                    // Priority 4: Tester Sets
                    if (val === "tester") return 4;
                    
                    return 5; // Everything else
                };

                productsData.sort((a, b) => getPriority(a.for) - getPriority(b.for));
                // =========================================================

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
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header styled with your Archivo Black look */}
            <h1 className="text-4xl font-archivo font-black uppercase tracking-tighter text-[#1C3C85] mb-12 text-center">
                {pageTitle}
            </h1>
            
            <ProductGroup products={products} />

            {products.length === 0 && (
                <p className="text-center text-gray-500 mt-10 font-medium">
                    We're currently updating our collection for {genderFilter || 'this category'}. Check back soon!
                </p>
            )}
        </div>
    );
}