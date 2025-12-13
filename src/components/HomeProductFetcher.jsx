// src/components/HomeProductFetcher.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; 
import LoadingScreen from "./LoadingScreen";
import HorizontalProductSlider from './HorizontalProductSlider'; 

export default function HomeProductFetcher() {
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllProducts = async () => {
            setLoading(true);
            try {
                // Fetch ALL documents from the 'products' collection
                const querySnapshot = await getDocs(collection(db, "products"));
                const productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                // --- CRITICAL CHANGE: FILTER OUT THE DISCOVERY SET ---
                const nonTesterProducts = productsData.filter(product => {
                    // Normalize the 'for' property and exclude "tester"
                    return String(product.for).toLowerCase() !== 'tester';
                });
                
                setAllProducts(nonTesterProducts);
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

    if (allProducts.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>The Scentorini collection is currently being updated. Please check back soon.</p>
            </div>
        );
    }

    return (
        <HorizontalProductSlider 
            title="Scentorini Collection" 
            products={allProducts} // This now only contains non-tester products
        />
    );
}