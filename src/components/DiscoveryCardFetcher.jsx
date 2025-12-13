// src/components/DiscoveryCardFetcher.jsx

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard'; // Import the reusable card component
import LoadingScreen from './LoadingScreen'; // Assuming you have a loading component

// IMPORTANT: Use the same ID you were using in DiscoverySetPage.jsx
const DISCOVERY_SET_PRODUCT_ID = 'oCD4raXzttsP44xAruut'; 
const DEFAULT_FALLBACK_IMAGE = "/default-set-image.jpg";

export default function DiscoveryCardFetcher() {
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docRef = doc(db, "products", DISCOVERY_SET_PRODUCT_ID);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProductData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.error("Discovery Set main product not found.");
                }
            } catch (error) {
                console.error("Error fetching Discovery Set data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, []);

    if (loading) return (
        <div className="flex justify-center w-full max-w-sm">
            <LoadingScreen />
        </div>
    );
    
    if (!productData) {
        return (
            <div className="text-center text-gray-500 w-full max-w-sm">
                Discovery Set data unavailable.
            </div>
        );
    }

    // Pass the fetched data directly to the ProductCard, just like a regular product
    return (
        <ProductCard
            id={productData.id}
            image={productData.image || DEFAULT_FALLBACK_IMAGE}
            title={productData.title || "Discovery Set Builder"}
            subtitle={productData.subtitle || "Custom Sample Set"}
            price={productData.price || 0.00}
            stock={productData.stock || 0.00}
            for={productData.for || "tester"} // Ensures routing is correct
            className="w-full max-w-sm"
        />
    );
}