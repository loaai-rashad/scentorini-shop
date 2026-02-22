import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, X } from 'lucide-react';

export default function ReviewModal({ isOpen, onClose, productId, productTitle }) {
    const [formData, setFormData] = useState({ name: '', comment: '', rating: 5 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.comment.trim()) return alert("Please fill all fields");
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "reviews"), {
                ...formData,
                productId: productId || "general",
                productName: productId === "general" ? null : productTitle, // Saves name for home page
                createdAt: serverTimestamp(),
            });
            
            setFormData({ name: '', comment: '', rating: 5 });
            onClose(); 
        } catch (err) {
            console.error("Error saving review:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-archivo font-black uppercase text-[#1C3C85] text-center">
                    {productTitle ? `Review ${productTitle}` : "Share Your Experience"}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                    <input 
                        type="text" placeholder="Your Name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1C3C85] outline-none"
                    />
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                        <span className="text-sm font-bold text-gray-600">Rating</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((num) => (
                                <Star 
                                    key={num}
                                    size={20}
                                    fill={num <= formData.rating ? "#1C3C85" : "none"}
                                    color="#1C3C85"
                                    className="cursor-pointer"
                                    onClick={() => setFormData({...formData, rating: num})}
                                />
                            ))}
                        </div>
                    </div>

                    <textarea 
                        placeholder="What did you think of this scent?"
                        value={formData.comment}
                        onChange={(e) => setFormData({...formData, comment: e.target.value})}
                        className="w-full p-3 border border-gray-200 rounded-xl h-32 focus:ring-2 focus:ring-[#1C3C85] outline-none resize-none"
                    />

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-[#1C3C85] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-[#142d63] transition-all"
                    >
                        {isSubmitting ? "Posting..." : "Post Review"}
                    </button>
                </form>
            </div>
        </div>
    );
}