// src/pages/DiscoverySetPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import LoadingScreen from '../components/LoadingScreen';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Check, Sparkles, FlaskConical, X } from 'lucide-react';

// --- CRITICAL CONSTANT: Define the Firestore Document ID for the Discovery Set Product ---
const DISCOVERY_SET_PRODUCT_ID = 'oCD4raXzttsP44xAruut';
// ------------------------------------------------------------------------------------------

const MIN_SELECTIONS = 3;
const MAX_SELECTIONS = 6;
const MAX_PER_SAMPLE = 2;
const DEFAULT_FALLBACK_IMAGE = "/default-product.jpeg";

export default function DiscoverySetPage() {
    const { addToCart } = useCart();

    // STATE — picked is a map of { sampleTitle: quantity }
    const [availableSamples, setAvailableSamples] = useState({});
    const [picked, setPicked] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [discoverySetData, setDiscoverySetData] = useState(null);

    // DATA FETCHING
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const setDocRef = doc(db, "products", DISCOVERY_SET_PRODUCT_ID);
                const setSnap = await getDoc(setDocRef);
                if (setSnap.exists()) {
                    setDiscoverySetData({ id: setSnap.id, ...setSnap.data() });
                } else {
                    console.error("Discovery Set main product not found in 'products' collection.");
                    setDiscoverySetData(null);
                }

                const q = query(collection(db, "samples"));
                const samplesSnapshot = await getDocs(q);
                const samplesMap = {};
                samplesSnapshot.docs.forEach(d => {
                    const data = d.data();
                    samplesMap[data.title] = {
                        ...data,
                        price: Number(data.price),
                        stock: Number(data.stock),
                        docId: d.id,
                    };
                });
                setAvailableSamples(samplesMap);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // HELPERS
    const getMainImageUrl = (data) => {
        if (!data) return DEFAULT_FALLBACK_IMAGE;
        if (data.images && Array.isArray(data.images) && data.images.length > 0) return data.images[0];
        if (data.image) return data.image;
        return DEFAULT_FALLBACK_IMAGE;
    };

    const totalCount = Object.values(picked).reduce((s, q) => s + q, 0);

    const addSample = (title) => {
        const sample = availableSamples[title];
        if (!sample || sample.stock < 1) return;
        if (totalCount >= MAX_SELECTIONS) {
            setMessage(`You can add up to ${MAX_SELECTIONS} samples per set.`);
            return;
        }
        const current = picked[title] || 0;
        if (current >= MAX_PER_SAMPLE) {
            setMessage(`You can add '${title}' up to ${MAX_PER_SAMPLE} times.`);
            return;
        }
        if (current + 1 > sample.stock) {
            setMessage(`'${title}' is low on stock.`);
            return;
        }
        setPicked(prev => ({ ...prev, [title]: current + 1 }));
        setMessage('');
    };

    const removeSample = (title) => {
        setPicked(prev => {
            const current = prev[title] || 0;
            if (current <= 1) {
                const { [title]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [title]: current - 1 };
        });
        setMessage('');
    };

    // PRICING
    const total = Object.entries(picked).reduce((sum, [title, qty]) => {
        const sample = availableSamples[title];
        return sum + (sample ? sample.price * qty : 0);
    }, 0);
    const pricePerItem = totalCount > 0 ? total / totalCount : 0;
    const progressPct = Math.min(100, (totalCount / MAX_SELECTIONS) * 100);
    const remaining = Math.max(0, MIN_SELECTIONS - totalCount);
    const canCheckout = totalCount >= MIN_SELECTIONS;

    // ORDER SUBMISSION
    const handlePlaceOrder = () => {
        if (!canCheckout) {
            setMessage(`Please select at least ${MIN_SELECTIONS} perfumes.`);
            return;
        }

        // Expand the picked map into one entry per unit (matches cart payload shape)
        const selectedSamplesData = [];
        let outOfStockTitle = null;
        for (const [title, qty] of Object.entries(picked)) {
            const sample = availableSamples[title];
            if (!sample || sample.stock < qty) {
                outOfStockTitle = title;
                break;
            }
            for (let i = 0; i < qty; i++) {
                selectedSamplesData.push({ title, docId: sample.docId, price: sample.price });
            }
        }

        if (outOfStockTitle) {
            setMessage(`Error: Sample '${outOfStockTitle}' is currently out of stock.`);
            return;
        }

        setIsSaving(true);
        setMessage('');

        const customTesterSet = {
            id: `tester-set-${Date.now()}`,
            title: discoverySetData?.title || "Scentorini Discovery Set",
            price: total,
            quantity: 1,
            stock: 9999,
            isCustomSet: true,
            selectedSamples: selectedSamplesData,
            priceDetails: { count: totalCount, averagePricePerItem: pricePerItem, total },
            image: getMainImageUrl(discoverySetData),
        };

        try {
            addToCart(customTesterSet);
            setMessage("Success! The Discovery Set has been added to your cart.");
            setPicked({});
        } catch (error) {
            console.error("Error adding to cart:", error);
            setMessage("Error adding to cart. Please check console.");
        } finally {
            setIsSaving(false);
        }
    };

    // RENDER
    if (loading) return <LoadingScreen />;
    if (!discoverySetData || Object.keys(availableSamples).length === 0) {
        return <div className="min-h-screen p-8 text-center font-bold">Error loading discovery set data.</div>;
    }

    const imageSource = getMainImageUrl(discoverySetData);
    const sampleTitles = Object.keys(availableSamples);
    const pickedEntries = Object.entries(picked);

    return (
        <div className="min-h-screen bg-gray-50/60 pb-28 lg:pb-16">
            {/* HERO / INTRO */}
            <section className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14 grid md:grid-cols-[1fr_auto] gap-8 items-center">
                    <div className="text-center md:text-left">
                        <span className="block text-[11px] md:text-xs font-archivo font-bold uppercase tracking-[0.3em] text-[#1C3C85]/60 mb-3">
                            Try Before You Commit
                        </span>
                        <h1 className="text-3xl md:text-5xl font-archivo font-black uppercase tracking-tight text-[#1C3C85] leading-[1.05]">
                            Build Your Discovery Set
                        </h1>
                        <p className="mt-4 text-gray-600 text-base md:text-lg max-w-xl mx-auto md:mx-0">
                            Pick <strong>{MIN_SELECTIONS} to {MAX_SELECTIONS}</strong> samples and find
                            your signature scent — risk-free. You can add the same scent up to {MAX_PER_SAMPLE} times.
                        </p>

                        {/* Step indicator */}
                        <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 mt-6 text-[11px] md:text-xs font-bold uppercase tracking-wider text-stone-400">
                            <span className="text-[#1C3C85]">1. Pick</span>
                            <span className="text-gray-300">›</span>
                            <span className={canCheckout ? "text-[#1C3C85]" : ""}>2. Review</span>
                            <span className="text-gray-300">›</span>
                            <span>3. Add to Cart</span>
                        </div>
                    </div>

                    <img
                        src={imageSource}
                        alt={discoverySetData.title}
                        className="hidden md:block w-44 lg:w-56 h-auto object-cover rounded-2xl shadow-xl border border-gray-100"
                    />
                </div>
            </section>

            {/* BUILDER */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">

                {/* LEFT: Sample picker */}
                <div className="lg:col-span-2">
                    <div className="flex items-end justify-between mb-4">
                        <h2 className="text-xl md:text-2xl font-archivo font-black uppercase tracking-tight text-[#1C3C85]">
                            Choose Your Scents
                        </h2>
                        <span className="text-sm font-bold text-stone-500">
                            {totalCount} / {MAX_SELECTIONS}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-6">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${canCheckout ? 'bg-emerald-500' : 'bg-[#1C3C85]'}`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                        {sampleTitles.map((title) => {
                            const sample = availableSamples[title];
                            const qty = picked[title] || 0;
                            const isPicked = qty > 0;
                            const isOut = sample.stock < 1;
                            const atMax = qty >= MAX_PER_SAMPLE;

                            return (
                                <div
                                    key={title}
                                    onClick={() => !isOut && !atMax && addSample(title)}
                                    className={`relative rounded-2xl border-2 p-4 transition-all select-none flex flex-col justify-between min-h-[120px] ${
                                        isOut
                                            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                            : isPicked
                                            ? 'border-[#1C3C85] bg-[#1C3C85]/5 shadow-md cursor-pointer'
                                            : 'border-gray-200 bg-white hover:border-[#1C3C85] hover:shadow-md cursor-pointer'
                                    }`}
                                >
                                    {/* qty badge */}
                                    {isPicked && (
                                        <span className="absolute top-2 right-2 flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-[#1C3C85] text-white text-xs font-black">
                                            ×{qty}
                                        </span>
                                    )}

                                    <div>
                                        <p className="text-sm font-bold text-stone-900 capitalize line-clamp-2 pr-6">
                                            {title}
                                        </p>
                                        <p className="text-xs font-extrabold text-[#1C3C85] mt-1">
                                            EGP {sample.price.toLocaleString()}
                                        </p>
                                    </div>

                                    {/* footer: add hint or stepper */}
                                    {isOut ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 mt-3">
                                            Out of stock
                                        </span>
                                    ) : isPicked ? (
                                        <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => removeSample(title)}
                                                aria-label={`Remove one ${title}`}
                                                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-stone-600 hover:bg-gray-100 active:scale-95 transition"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => addSample(title)}
                                                disabled={atMax || totalCount >= MAX_SELECTIONS}
                                                aria-label={`Add one ${title}`}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1C3C85] text-white hover:bg-[#142d63] active:scale-95 transition disabled:opacity-30"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-stone-400 mt-3">
                                            <Plus className="w-3.5 h-3.5" /> Add
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Sticky summary */}
                <aside className="lg:sticky lg:top-8 self-start">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                        <h2 className="text-lg font-archivo font-black uppercase tracking-tight text-[#1C3C85] flex items-center gap-2">
                            <FlaskConical className="w-5 h-5" /> Your Set
                        </h2>

                        {/* Picked list */}
                        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                            {pickedEntries.length === 0 ? (
                                <p className="text-sm text-stone-400 py-6 text-center">
                                    No scents yet — tap a tile to start building.
                                </p>
                            ) : (
                                pickedEntries.map(([title, qty]) => (
                                    <div key={title} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="text-sm font-medium text-stone-800 capitalize truncate">
                                            {title} {qty > 1 && <span className="text-[#1C3C85] font-bold">×{qty}</span>}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs font-bold text-stone-500">
                                                EGP {(availableSamples[title].price * qty).toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => removeSample(title)}
                                                aria-label={`Remove ${title}`}
                                                className="text-stone-300 hover:text-red-500 transition"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <hr className="my-4 border-gray-100" />

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-stone-500">
                                <span>Samples selected</span>
                                <span className="font-bold text-stone-800">{totalCount}</span>
                            </div>
                            <div className="flex justify-between text-stone-500">
                                <span>Avg. per sample</span>
                                <span className="font-bold text-stone-800">EGP {pricePerItem.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2">
                                <span className="text-base font-bold text-stone-900">Subtotal</span>
                                <span className="text-2xl font-black text-[#1C3C85]">EGP {total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Helper text */}
                        {!canCheckout && (
                            <p className="text-xs text-center text-stone-500 mt-3">
                                Add <strong>{remaining}</strong> more to reach the minimum of {MIN_SELECTIONS}.
                            </p>
                        )}

                        <button
                            disabled={!canCheckout || isSaving}
                            onClick={handlePlaceOrder}
                            className={`w-full py-4 mt-4 rounded-xl font-archivo font-black uppercase tracking-widest text-sm transition-all ${
                                !canCheckout || isSaving
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#1C3C85] text-white hover:bg-[#142d63] shadow-lg active:scale-95'
                            }`}
                        >
                            {isSaving ? 'Adding…' : canCheckout ? `Add Set · EGP ${total.toLocaleString()}` : 'Add to Cart'}
                        </button>

                        {message && (
                            <p className={`mt-3 text-center text-sm font-medium ${message.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                                {message}
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            {/* MOBILE STICKY BAR */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-500">{totalCount} / {MAX_SELECTIONS} selected</p>
                    <p className="text-lg font-black text-[#1C3C85]">EGP {total.toLocaleString()}</p>
                </div>
                <button
                    disabled={!canCheckout || isSaving}
                    onClick={handlePlaceOrder}
                    className={`px-7 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${
                        !canCheckout || isSaving
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#1C3C85] text-white active:scale-95 shadow-lg'
                    }`}
                >
                    {canCheckout ? 'Add Set' : `Pick ${remaining} more`}
                </button>
            </div>
        </div>
    );
}
