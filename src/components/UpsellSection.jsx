import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import { Link } from 'react-router-dom';

export default function UpsellSection({ currentProduct, allProducts, addToCart }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUpsellLogic = async () => {
            try {
                const docRef = doc(db, "metadata", "upsell_logic");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const pairMap = docSnap.data().pairings || {};
                    const matchedTitles = pairMap[currentProduct.title] || [];
                    
                    // FIXED: Filter out the current product AND the Discovery Set ID
                    const recommended = allProducts.filter(p => 
                        matchedTitles.includes(p.title) && 
                        p.id !== currentProduct.id && 
                        p.id !== 'oCD4raXzttsP44xAruut' // This removes the discovery set
                    );

                    setSuggestions(recommended);
                }
            } catch (error) {
                console.error("Error fetching upsell data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentProduct && allProducts.length > 0) {
            fetchUpsellLogic();
        }
    }, [currentProduct, allProducts]);

    if (loading || suggestions.length === 0) return null;

    return (
        <div className="mt-16 border-t border-gray-100 pt-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1C3C85]">
                        Pairs Well With
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">
                        Frequently bought together by Scentorini customers
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((item) => (
                    <div 
                        key={item.id} 
                        className="group flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 hover:border-[#1C3C85]/20 hover:shadow-md transition-all duration-300"
                    >
                        <Link 
                            to={`/products/${item.id}`} 
                            className="flex items-center gap-4 flex-1 min-w-0"
                            onClick={() => window.scrollTo(0, 0)}
                        >
                            <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                                <img 
                                    src={item.image || (item.images && item.images[0]) || "/perfume.jpeg"} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-black text-gray-800 truncate uppercase group-hover:text-[#1C3C85] transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] font-bold text-gray-400 mt-1">
                                    EGP {item.price}
                                </p>
                            </div>
                        </Link>

                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                addToCart(item);
                            }}
                            className="bg-[#1C3C85] text-white p-3 rounded-xl hover:bg-black transition-all active:scale-90 z-10"
                            aria-label="Add to cart"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v12m6-6H6" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}