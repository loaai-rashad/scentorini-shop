// src/pages/DiscoverySetPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { db } from '../firebase'; 
import LoadingScreen from '../components/LoadingScreen'; 
import { useCart } from '../context/CartContext'; 

// --- CRITICAL CONSTANT: Define the Firestore Document ID for the Discovery Set Product ---
// You MUST replace 'YOUR_DISCOVERY_SET_PRODUCT_ID' with the actual ID from your 'products' collection.
const DISCOVERY_SET_PRODUCT_ID = 'oCD4raXzttsP44xAruut'; 
// ------------------------------------------------------------------------------------------

const MIN_SELECTIONS = 3; 
const DEFAULT_FALLBACK_IMAGE = "/default-product.jpeg"; // Generic fallback for consistency


export default function DiscoverySetPage() {
    // 1. Hook Integration
    const { addToCart } = useCart(); 
    
    // 2. STATE DEFINITIONS
    const [availableSamples, setAvailableSamples] = useState({}); 
    const [selections, setSelections] = useState(Array(6).fill(null)); 
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    
    // NEW STATE: To hold the main product data (including the image URL)
    const [discoverySetData, setDiscoverySetData] = useState(null); 
    

    // 3. EFFECT HOOKS (Data Fetching)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // A. Fetch the details of the main Discovery Set product for the image/title
                const setDocRef = doc(db, "products", DISCOVERY_SET_PRODUCT_ID);
                const setSnap = await getDoc(setDocRef);

                if (setSnap.exists()) {
                    setDiscoverySetData({ id: setSnap.id, ...setSnap.data() });
                } else {
                    console.error("Discovery Set main product not found in 'products' collection.");
                    setDiscoverySetData(null); 
                }

                // B. Fetch the list of available samples
                const q = query(collection(db, "samples")); 
                const samplesSnapshot = await getDocs(q);
                
                const samplesMap = {};
                samplesSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    samplesMap[data.title] = { 
                        ...data, 
                        price: Number(data.price), 
                        stock: Number(data.stock),  
                        docId: doc.id 
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

    // 4. HELPER FUNCTIONS 
    
    const handleSelectionChange = (index, value) => {
        // ... (unchanged)
        const newSelections = [...selections];
        
        // Ensure no duplicates are selected
        if (value !== '' && newSelections.includes(value)) {
            setMessage(`Error: '${value}' is already selected.`);
            return;
        }
        
        newSelections[index] = value === '' ? null : value;
        setSelections(newSelections);
        setMessage(''); 
    };

    // --- Logic: Calculate Total (unchanged) ---
    const calculateTotal = () => {
        const activeTitles = selections.filter(title => title !== null);
        const count = activeTitles.length;
        let total = 0.00;

        if (count === 0) return { count: 0, total: 0.00, pricePerItem: 0.00 };

        activeTitles.forEach(title => {
            const sample = availableSamples[title];
            if (sample && typeof sample.price === 'number') {
                total += sample.price;
            }
        });
        
        const averagePricePerItem = count > 0 ? total / count : 0.00;
        return { count, total, pricePerItem: averagePricePerItem };
    };

    // 5. CALL/DESTRUCTURE THE HELPER FUNCTION 
    const { count, total, pricePerItem } = calculateTotal();
    
    // 6. ORDER SUBMISSION 

    const handlePlaceOrder = () => {
        if (count < MIN_SELECTIONS) {
            setMessage(`Please select at least ${MIN_SELECTIONS} perfumes.`);
            return;
        }

        const selectedTitles = selections.filter(title => title !== null);
        let outOfStockTitle = null;
        
        const selectedSamplesData = selectedTitles.map(title => {
            const sample = availableSamples[title];
            if (!sample || sample.stock < 1) { 
                outOfStockTitle = title;
            }
            return { title: title, docId: sample.docId, price: sample.price };
        });

        if (outOfStockTitle) {
            setMessage(`Error: Sample '${outOfStockTitle}' is currently out of stock.`);
            return;
        }
        
        setIsSaving(true);
        setMessage('');

        // Prepare the custom product object for the cart
        const customTesterSet = {
            id: `tester-set-${Date.now()}`, 
            // Use the fetched title, or a fallback
            title: discoverySetData?.title || "Scentorini Discovery Set",
            price: total, 
            quantity: 1,  
            stock: 9999, 
            
            isCustomSet: true,
            selectedSamples: selectedSamplesData, 
            priceDetails: { count, averagePricePerItem: pricePerItem, total },
            // USE THE IMAGE LINK FROM THE FETCHED DATA, FALLING BACK TO THE GENERIC IMAGE
            image: discoverySetData?.image || DEFAULT_FALLBACK_IMAGE, 
        };

        try {
            addToCart(customTesterSet); 
            setMessage("Success! The Discovery Set has been added to your cart.");
            setSelections(Array(6).fill(null)); 
        } catch (error) {
            console.error("Error adding to cart:", error);
            setMessage("Error adding to cart. Please check console.");
        } finally {
            setIsSaving(false);
        }
    };


    // 7. RENDER RETURN
    if (loading) return <LoadingScreen />;
    // We should not proceed if we couldn't load the samples or the main product data
    if (!discoverySetData || Object.keys(availableSamples).length === 0) {
        return <div className="min-h-screen p-8">Error loading discovery set data.</div>;
    }

    // Determine the image source using the same logic as your ProductPage.jsx
    const imageSource = discoverySetData.image || DEFAULT_FALLBACK_IMAGE;

    return (
        <div className="container mx-auto p-8 max-w-4xl bg-white shadow-lg my-12 rounded-lg">
            <h1 className="text-4xl font-serif font-bold text-[#1C3C85] text-center mb-6">
                {discoverySetData.title} Builder
            </h1>

            {/* --- STATIC MAIN IMAGE FOR THE SET PAGE (Uses fetched data) --- */}
            <div className="flex justify-center mb-8">
                <img
                    // Uses the fetched image URL
                    src={imageSource} 
                    alt={discoverySetData.title}
                    className="w-full max-w-xs h-auto object-cover rounded-lg shadow-xl border-2 border-gray-100"
                />
            </div>
            {/* ---------------------------------------------------------------- */}

            <p className="text-center text-gray-600 mb-8">
                Select 3 to 6 unique perfumes to create your personalized sample set.
                <br/>
                <span className="text-sm italic text-gray-500">
                    The price is the sum of the individual sample prices.
                </span>
            </p>

            <div className="space-y-4">
                {selections.map((selection, index) => (
                    <div key={index} className="flex flex-col">
                        <label className="mb-1 font-medium text-gray-700">Option {index + 1} </label>
                        <select
                            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1C3C85] appearance-none"
                            value={selection || ''}
                            onChange={(e) => handleSelectionChange(index, e.target.value)}
                        >
                            <option value="">-- Select Perfume --</option>
                            {Object.keys(availableSamples).map((title) => (
                                <option 
                                    key={title} 
                                    value={title}
                                    disabled={availableSamples[title].stock < 1} 
                                >
                                    {title} (EGP {availableSamples[title].price.toFixed(2)}) 
                                    {availableSamples[title].stock < 1 ? " (Out of Stock)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* --- Pricing Summary --- */}
            <div className="mt-10 p-6 bg-gray-50 border rounded-lg">
                <h2 className="text-2xl font-semibold mb-4 text-[#1C3C85]">Order Summary</h2>
                <div className="space-y-2">
                    <p className="flex justify-between">
                        <span className="text-lg">Items Selected:</span>
                        <span className="font-bold text-xl">{count}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-lg">Average Price Per Sample:</span>
                        <span className="font-bold text-xl text-green-700">
                            EGP {pricePerItem.toFixed(2)}
                        </span>
                    </p>
                    <hr className="my-2 border-dashed" />
                    <p className="flex justify-between">
                        <span className="text-xl font-bold">Set Subtotal:</span>
                        <span className="text-3xl font-extrabold text-red-600">
                            EGP {total.toFixed(2)}
                        </span>
                    </p>
                </div>
            </div>

            {message && (
                <p className={`mt-4 text-center ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                    {message}
                </p>
            )}

            <button
                className={`w-full py-4 mt-6 text-xl font-bold rounded-md transition ${count < MIN_SELECTIONS || isSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={count < MIN_SELECTIONS || isSaving}
                onClick={handlePlaceOrder}
            >
                {isSaving ? 'Adding to Cart...' : `Add Discovery Set (EGP ${total.toFixed(2)})`}
            </button>
        </div>
    );
}