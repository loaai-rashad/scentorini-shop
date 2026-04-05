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
        // 1. Added "mx-auto" and removed "w-full" from the motion div to prevent stretching
        // 2. Added "flex justify-center items-center" to the container
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex justify-center items-center w-full py-4"
        >
            {/* 3. Wrap the card in a div with a fixed width to match your other sections (w-64) */}
            <div className="w-64 flex-shrink-0">
                <ProductCard
                    id={productData.id}
                    images={productData.images || []} 
                    title={productData.title || "Discovery Set Builder"}
                    subtitle={productData.subtitle || "Custom Sample Set"}
                    price={productData.price || 0.00}
                    stock={productData.stock || 0.00}
                    for={productData.for || "tester"} 
                />
            </div>
        </motion.div>
    );
}