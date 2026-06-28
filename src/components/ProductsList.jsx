// src/components/ProductsList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { db } from '../firebase';
import LoadingScreen from "./LoadingScreen";
import ProductGroup from "./ProductGroup";

export default function ProductsList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("featured");

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
    
    // Client-side search + sort over the fetched products
    const visibleProducts = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let list = products;

        if (term) {
            list = list.filter(p =>
                [p.title, p.subtitle, p.inspiredBy]
                    .filter(Boolean)
                    .some(field => String(field).toLowerCase().includes(term))
            );
        }

        if (sortBy === "price-asc") {
            list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        } else if (sortBy === "price-desc") {
            list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        }

        return list;
    }, [products, searchTerm, sortBy]);

    if (loading) return <LoadingScreen />;

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header styled with your Archivo Black look */}
            <h1 className="text-4xl font-archivo font-black uppercase tracking-tighter text-[#1C3C85] mb-8 text-center">
                {pageTitle}
            </h1>

            {/* Search + Sort toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10 max-w-2xl mx-auto">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search scents…"
                        className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none transition"
                    />
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 rounded-full border border-gray-200 bg-gray-50 text-sm font-bold text-stone-600 focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none appearance-none cursor-pointer"
                >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                </select>
            </div>

            <ProductGroup products={visibleProducts} />

            {visibleProducts.length === 0 && (
                <p className="text-center text-gray-500 mt-10 font-medium">
                    {searchTerm
                        ? `No scents match "${searchTerm}".`
                        : `We're currently updating our collection for ${genderFilter || 'this category'}. Check back soon!`}
                </p>
            )}
        </div>
    );
}