import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

// Helper component for loading
const Loading = () => <div className="p-8 text-center text-gray-500">Loading sections...</div>;

// Main component to manage the custom homepage sections
export default function AdminCustomizableSections() {
    const [sections, setSections] = useState([]);
    const [allProducts, setAllProducts] = useState([]); // List of all products to pick from
    const [loading, setLoading] = useState(true);
    // State for creating a new section
    const [newSection, setNewSection] = useState({ title: '', order: 0, productIds: [] });
    // State to track which section's edit form is open
    const [isEditing, setIsEditing] = useState(null); 

    // --- Data Fetching ---

    // 1. Fetch ALL products for the product picker/selector (Real-time)
    useEffect(() => {
        const productsRef = collection(db, "products");
        const unsubscribe = onSnapshot(productsRef, snapshot => {
            const data = snapshot.docs.map(doc => {
                const productData = doc.data();
                return { 
                    id: doc.id, 
                    title: productData.title,
                    // Use the first image URL or a placeholder for the picker view
                    image: productData.images?.[0] || productData.image || '/perfume.jpeg'
                };
            });
            setAllProducts(data);
        });
        return () => unsubscribe();
    }, []);

    // 2. Real-time fetch for CUSTOMIZABLE SECTIONS
    useEffect(() => {
        const sectionsRef = collection(db, "customizableSections");
        // Order by the 'order' field so the admin list matches the homepage order
        const q = query(sectionsRef, orderBy("order", "asc"));
        
        const unsubscribe = onSnapshot(q, snapshot => {
            const sectionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                productIds: doc.data().productIds || [],
            }));
            setSections(sectionsData);
            setLoading(false);
        }, error => {
            console.error("Error fetching customizable sections:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);


    // --- HANDLERS ---
    
    // Handler for creating a new section
    const handleCreateSection = async () => {
        if (!newSection.title) return alert("Section title is required.");
        
        try {
            await addDoc(collection(db, "customizableSections"), {
                title: newSection.title.trim(),
                order: parseInt(newSection.order) || 0,
                productIds: newSection.productIds,
            });
            setNewSection({ title: '', order: 0, productIds: [] }); // Clear form
        } catch (error) {
            console.error("Error creating section:", error);
            alert("Failed to create section.");
        }
    };
    
    // Handler for saving edits to an existing section
    const handleSaveSection = async (sectionToSave) => {
        try {
            const sectionRef = doc(db, "customizableSections", sectionToSave.id);
            
            // Clean the productIds array before saving: remove duplicates and nulls
            const cleanedProductIds = Array.from(new Set(
                (sectionToSave.productIds || [])
                    .filter(id => id && id.length > 0)
            ));

            await updateDoc(sectionRef, {
                title: sectionToSave.title.trim(),
                order: parseInt(sectionToSave.order) || 0,
                productIds: cleanedProductIds,
            });
            alert("Section updated successfully!");
            setIsEditing(null); // Exit edit mode
        } catch (error) {
            console.error("Error saving section:", error);
            alert("Failed to update section.");
        }
    };

    // Handler for deleting a section
    const handleDeleteSection = async (id) => {
        if (!window.confirm("Are you sure you want to delete this homepage section?")) return;
        try {
            await deleteDoc(doc(db, "customizableSections", id));
        } catch (error) {
            console.error("Error deleting section:", error);
            alert("Failed to delete section.");
        }
    };
    
    // Handler to toggle product selection and manage the order in the list
    const toggleProductInList = (sectionId, productId) => {
        setSections(prev => 
            prev.map(section => {
                if (section.id === sectionId) {
                    const currentIds = section.productIds || [];
                    if (currentIds.includes(productId)) {
                        // Remove product ID
                        return { ...section, productIds: currentIds.filter(id => id !== productId) };
                    } else {
                        // Add product ID to the end (maintaining order of selection)
                        return { ...section, productIds: [...currentIds, productId] };
                    }
                }
                return section;
            })
        );
    };


    if (loading) return <Loading />;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-indigo-700 border-b pb-2">Customizable Homepage Sections</h2>

            {/* --- 1. NEW SECTION CREATION FORM (FIXED FOR MOBILE) --- */}
            <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
                <h3 className="text-xl font-bold mb-4">Create New Section</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                    <input
                        type="text"
                        placeholder="Section Title (e.g., Seasonal Favorites)"
                        value={newSection.title}
                        onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                        className="p-2 border rounded w-full flex-1 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                    <input
                        type="number"
                        placeholder="Order (e.g., 10)"
                        value={newSection.order}
                        onChange={(e) => setNewSection({ ...newSection, order: e.target.value })}
                        className="p-2 border rounded w-full sm:w-28 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                    <button
                        onClick={handleCreateSection}
                        className="bg-indigo-600 text-white px-4 py-2 rounded shadow-md hover:bg-indigo-700 transition w-full sm:w-auto"
                    >
                        Create Section
                    </button>
                </div>
            </div>

            {/* --- 2. EXISTING SECTIONS LIST --- */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold">Existing Sections ({sections.length})</h3>
                {sections.map(section => (
                    <div key={section.id} className="border p-4 rounded-lg shadow-md bg-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-3">
                            
                            {/* Title & Order Edit Inputs */}
                            {isEditing === section.id ? (
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-3/5 mb-3 sm:mb-0">
                                    <input
                                        type="text"
                                        value={section.title}
                                        onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                                        className="p-1 border rounded text-lg font-semibold flex-1"
                                    />
                                    <input
                                        type="number"
                                        value={section.order}
                                        onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, order: e.target.value } : s))}
                                        className="p-1 border rounded w-full sm:w-20 text-center"
                                    />
                                </div>
                            ) : (
                                <p className="text-lg font-semibold mb-3 sm:mb-0">{section.title} <span className="text-sm text-gray-500"> (Order: {section.order})</span></p>
                            )}
                            
                            {/* Action Buttons (Save/Edit/Delete) */}
                            <div className="flex space-x-2 flex-shrink-0">
                                {isEditing === section.id ? (
                                    <>
                                        <button
                                            onClick={() => handleSaveSection(section)}
                                            className="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(null)}
                                            className="bg-gray-400 text-white px-3 py-1 text-sm rounded hover:bg-gray-500"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(section.id)}
                                        className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteSection(section.id)}
                                    className="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Product Selector/Orderer */}
                        <h4 className="font-medium mb-3">Products in this Section ({section.productIds.length}):</h4>
                        <div className="flex flex-wrap gap-3 max-h-96 overflow-y-auto p-2 border rounded-md bg-gray-50">
                            {allProducts.map(product => {
                                const isSelected = section.productIds.includes(product.id);
                                const orderIndex = section.productIds.indexOf(product.id);
                                
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => toggleProductInList(section.id, product.id)}
                                        // Only allow interaction if we are in edit mode
                                        disabled={isEditing !== section.id}
                                        className={`
                                            w-20 h-20 p-1 rounded-lg border-2 transition relative text-xs
                                            ${isSelected 
                                                ? 'border-indigo-600 bg-indigo-100 shadow-lg' 
                                                : 'border-gray-300 hover:border-gray-500'
                                            }
                                            ${isEditing !== section.id ? 'opacity-70 cursor-not-allowed' : ''}
                                        `}
                                        title={product.title}
                                    >
                                        <img 
                                            src={product.image} 
                                            alt={product.title} 
                                            className="w-full h-full object-cover rounded" 
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpeg'; }}
                                        />
                                        {isSelected && (
                                            <div className="absolute top-0 right-0 bg-indigo-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                                                {orderIndex + 1}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {isEditing === section.id && (
                            <p className="text-xs text-gray-500 mt-3">Click on a product to add/remove it. The number on the corner indicates the display order (1st, 2nd, etc.).</p>
                        )}
                        
                    </div>
                ))}
            </div>
        </div>
    );
}