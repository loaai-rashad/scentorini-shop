// src/components/HomeProductFetcher.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; 
import LoadingScreen from "./LoadingScreen";
import HorizontalProductSlider from './HorizontalProductSlider'; 

export default function HomeProductFetcher() {
    const [allProducts, setAllProducts] = useState([]);
    const [oilProducts, setOilProducts] = useState([]); // State for oils
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllProducts = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "products"));
                const productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                // --- CRITICAL CHANGE: FILTERING LOGIC using single string comparison ---
                
                // 1. Separate Perfume Oils (where 'for' is the single string 'oil')
                const oils = productsData.filter(product => {
                    return String(product.for).toLowerCase() === 'oil';
                });

                // 2. Filter out Testers AND Oils for the main collection
                const mainCollectionProducts = productsData.filter(product => {
                    const productFor = String(product.for).toLowerCase();
                    // Exclude products where 'for' is 'tester' OR 'oil'
                    return productFor !== 'tester' && productFor !== 'oil'; 
                });
                
                setOilProducts(oils); 
                setAllProducts(mainCollectionProducts); 
                // ----------------------------------------------------

            } catch (error) {
                console.error("Error fetching all products for homepage:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllProducts();
    }, []);

    if (loading) return <LoadingScreen />;

    if (allProducts.length === 0 && oilProducts.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 font-sans font-bold">
                <p>The Scentorini collection is currently being updated. Please check back soon.</p>
            </div>
        );
    }

    return (
        <>
            {/* 1. RENDER THE MAIN SCENTORINI COLLECTION */}
            {allProducts.length > 0 && (
                <HorizontalProductSlider 
                    title="Scentorini Collection" 
                    products={allProducts} 
                />
            )}
            
            {/* 2. RENDER THE NEW PERFUME OIL SECTION */}
            {oilProducts.length > 0 && (
                <HorizontalProductSlider 
                    title="Essential Perfume Oils" 
                    products={oilProducts} 
                />
            )}
        </>
    );
}