// src/components/ProductsList.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; 
import LoadingScreen from "./LoadingScreen"; 
import ProductGroup from "./ProductGroup"; // Used to display the grid of products

export default function ProductsList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Read the search parameters from the URL (e.g., ?gender=Him)
    const [searchParams] = useSearchParams();
    const genderFilter = searchParams.get('gender'); 
    
    // Set the title for the page (e.g., "Scentorini for Him")
    const pageTitle = genderFilter 
        ? `Scentorini for ${genderFilter}` 
        : 'Scentorini Collection';

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const productsRef = collection(db, "products");
                let productsQuery;
                let filteredGenders = [];

                // Determine the filter value and normalize it to lowercase for comparison
                const filterValue = genderFilter ? genderFilter.toLowerCase() : null;

                // --- 1. Determine which Firestore categories to fetch (Now checking both cases) ---
                if (filterValue === "him") {
                    // For 'Him', fetch products tagged as: him, Him, unisex, Unisex, tester, Tester
                    filteredGenders = ["him", "Him", "unisex", "Unisex", "tester", "Tester"]; 
                } else if (filterValue === "her") {
                    // For 'Her', fetch products tagged as: her, Her, unisex, Unisex, tester, Tester
                    filteredGenders = ["her", "Her", "unisex", "Unisex", "tester", "Tester"];
                } 
                
                // --- 2. Construct the Firestore Query ---
                if (filteredGenders.length > 0) {
                    // Use 'where' with 'in' to get all required categories (up to 10 values supported)
                    productsQuery = query(
                        productsRef, 
                        // The 'in' operator now checks against 6 possible string values
                        where("for", "in", filteredGenders) 
                    );
                } else {
                    // Fallback: If no filter is present, fetch all products
                    productsQuery = productsRef;
                }

                const snapshot = await getDocs(productsQuery);
                const productsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                setProducts(productsData);

            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [genderFilter]); 
    
    // --- Rendering Logic ---

    if (loading) {
        return <LoadingScreen />;
    }
    
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">{pageTitle}</h1>
            
            {/* Display the single, combined list of filtered products */}
            <ProductGroup products={products} />

            {products.length === 0 && (
                <p className="text-center text-gray-500 mt-10">
                    We're currently updating our collection for {genderFilter || 'this category'}. Check back soon!
                </p>
            )}
        </div>
    );
}