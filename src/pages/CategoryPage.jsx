// src/pages/CategoryPage.jsx
// Public page for a single admin-defined category (e.g. /category/oils).
// Reuses the same look & feel as ProductsList (title + search/sort + grid).

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { db } from '../firebase';
import LoadingScreen from "../components/LoadingScreen";
import ProductGroup from "../components/ProductGroup";
import { setPageMeta } from "../lib/seo";

export default function CategoryPage() {
    const { slug } = useParams();
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("featured");

    useEffect(() => {
        const fetchCategory = async () => {
            setLoading(true);
            setNotFound(false);
            try {
                // 1. Find the category by its slug
                const catQuery = query(
                    collection(db, "categories"),
                    where("slug", "==", slug),
                    limit(1)
                );
                const catSnap = await getDocs(catQuery);
                if (catSnap.empty) {
                    setNotFound(true);
                    setCategory(null);
                    setProducts([]);
                    return;
                }

                const catData = { id: catSnap.docs[0].id, ...catSnap.docs[0].data() };
                setCategory(catData);

                const ids = Array.isArray(catData.productIds) ? catData.productIds : [];
                if (ids.length === 0) {
                    setProducts([]);
                    return;
                }

                // 2. Fetch products, then keep + order the ones chosen for this category
                const productsSnap = await getDocs(collection(db, "products"));
                const byId = {};
                productsSnap.docs.forEach(d => { byId[d.id] = { id: d.id, ...d.data() }; });
                const ordered = ids.map(id => byId[id]).filter(Boolean);
                setProducts(ordered);
            } catch (error) {
                console.error("Error loading category:", error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchCategory();
    }, [slug]);

    const pageTitle = category?.name || "Category";

    useEffect(() => {
        if (category) {
            setPageMeta({
                title: `${category.name} | Scentorini`,
                description: `Shop ${category.name} at Scentorini — long-lasting, Santorini-inspired fragrances delivered across Egypt.`,
            });
        }
    }, [category]);

    // Client-side search + sort (mirrors ProductsList)
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
            <h1 className="text-4xl font-archivo font-black uppercase tracking-tighter text-[#1C3C85] mb-8 text-center">
                {pageTitle}
            </h1>

            {notFound ? (
                <p className="text-center text-gray-500 mt-10 font-medium">
                    This category doesn't exist or is no longer available.
                </p>
            ) : (
                <>
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
                                : `We're currently updating "${pageTitle}". Check back soon!`}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
