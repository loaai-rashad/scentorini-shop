// src/components/admin/AdminPromos.jsx

import React from 'react';

export default function AdminPromos({
    promoCodes,
    newPromo,
    setNewPromo,
    handleCreatePromo,
    togglePromoActive
}) {
    return (
        <div className="p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-3">Manage Promo Codes</h2>
            
            {/* Add Promo Form */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Code"
                    value={newPromo.code}
                    onChange={e =>
                        setNewPromo(prev => ({ ...prev, code: e.target.value }))
                    }
                    className="px-2 py-1 border rounded w-32"
                />
                <input
                    type="number"
                    placeholder="Discount %"
                    value={newPromo.discount}
                    onChange={e =>
                        setNewPromo(prev => ({ ...prev, discount: e.target.value }))
                    }
                    className="px-2 py-1 border rounded w-24"
                />
                <button
                    onClick={handleCreatePromo}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                    Add Promo
                </button>
            </div>

            {/* Promo Code List */}
            <div className="flex flex-wrap gap-2">
                {promoCodes.map(p => (
                    <div
                        key={p.id}
                        className={`px-3 py-1 rounded border flex items-center justify-between gap-2 ${
                            p.active ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-200 text-gray-700 border-gray-300"
                        }`}
                    >
                        <span>
                            {p.code} ({p.discount}%)
                        </span>
                        <button
                            onClick={() => togglePromoActive(p)}
                            className={`px-2 py-0.5 rounded text-sm ${
                                p.active 
                                    ? "bg-green-300 hover:bg-green-400 text-green-900" 
                                    : "bg-gray-300 hover:bg-gray-400 text-gray-800"
                            }`}
                        >
                            {p.active ? "Deactivate" : "Activate"}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}