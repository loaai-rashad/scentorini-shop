import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Trash2, Star, MessageSquare } from 'lucide-react';

export default function AdminReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReviews(reviewsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this review? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "reviews", id));
            } catch (err) {
                console.error("Error deleting review:", err);
                alert("Failed to delete review");
            }
        }
    };

    if (loading) return <div className="p-8 text-center font-bold text-[#1C3C85]">Loading Reviews...</div>;

    return (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-[#1C3C85]/10 rounded-xl text-[#1C3C85]">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black uppercase text-[#1C3C85] tracking-tight">Manage Reviews</h2>
                    <p className="text-sm text-gray-500 font-medium">Monitor and moderate customer feedback</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 uppercase text-[10px] tracking-widest text-gray-400 font-black">
                            <th className="pb-4 pl-2">Product / Type</th>
                            <th className="pb-4">Customer</th>
                            <th className="pb-4">Rating</th>
                            <th className="pb-4">Comment</th>
                            <th className="pb-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {reviews.map((rev) => (
                            <tr key={rev.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 pl-2">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter ${rev.productName ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                                        {rev.productName || "General Site"}
                                    </span>
                                </td>
                                <td className="py-4">
                                    <div className="font-bold text-gray-900">{rev.name}</div>
                                    <div className="text-[10px] text-gray-400">
                                        {rev.createdAt?.toDate().toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="py-4">
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill={i < rev.rating ? "#1C3C85" : "none"} color="#1C3C85" />
                                        ))}
                                    </div>
                                </td>
                                <td className="py-4 max-w-xs">
                                    <p className="text-sm text-gray-600 line-clamp-2 italic">"{rev.comment}"</p>
                                </td>
                                <td className="py-4 text-right pr-2">
                                    <button 
                                        onClick={() => handleDelete(rev.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Review"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {reviews.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-medium">
                        No reviews found in the database.
                    </div>
                )}
            </div>
        </div>
    );
}