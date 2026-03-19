import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from './ProductCard'; 
import LoadingScreen from '../components/LoadingScreen'; 
import { motion } from 'framer-motion'; // 1. Added Framer Motion

// IMPORTANT: ID for the Discovery Set product
const DISCOVERY_SET_PRODUCT_ID = 'oCD4raXzttsP44xAruut'; 

export default function DiscoveryCardFetcher() {
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docRef = doc(db, "products", DISCOVERY_SET_PRODUCT_ID);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const initialImages = 
                        data.images && Array.isArray(data.images) && data.images.length > 0
                            ? data.images
                            : (data.image ? [data.image] : []);

                    setProductData({ 
                        id: docSnap.id, 
                        ...data,
                        images: initialImages 
                    });
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

    return (
        // 2. Wrap the card in a motion div for the "Reveal on Scroll" effect
        <motion.div
            initial={{ opacity: 0, y: 30 }} // Start invisible and lower
            whileInView={{ opacity: 1, y: 0 }} // Animate to visible and normal position
            viewport={{ once: true, amount: 0.2 }} // Trigger when 20% of the card is visible
            transition={{ duration: 0.7, ease: "easeOut" }} // Smooth timing
            className="w-full flex justify-center"
        >
            <ProductCard
                id={productData.id}
                images={productData.images || []} 
                title={productData.title || "Discovery Set Builder"}
                subtitle={productData.subtitle || "Custom Sample Set"}
                price={productData.price || 0.00}
                stock={productData.stock || 0.00}
                for={productData.for || "tester"} 
                className="w-full max-w-sm shadow-xl" // Added a slight shadow for depth
            />
        </motion.div>
    );
}