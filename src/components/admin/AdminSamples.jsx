// src/components/admin/AdminSamples.jsx

import React from 'react';

export default function AdminSamples({
    samples,
    newSample,
    setNewSample,
    handleSampleChange,
    handleSaveSample,
    handleAddSample,
    handleDeleteSample
}) {
    return (
        <div className="p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-3 text-indigo-700">
                Manage Sample Inventory (`samples` collection)
            </h2>

            {/* Add Sample */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
                <input
                    type="text"
                    placeholder="Title (e.g., island blush)"
                    value={newSample.title}
                    onChange={e =>
                        setNewSample(prev => ({ ...prev, title: e.target.value }))
                    }
                    className="px-2 py-1 border rounded col-span-2"
                />
                <input
                    type="number"
                    placeholder="Price (EGP)"
                    value={newSample.price}
                    onChange={e =>
                        setNewSample(prev => ({ ...prev, price: e.target.value }))
                    }
                    className="px-2 py-1 border rounded"
                />
                <input
                    type="number"
                    placeholder="Stock"
                    value={newSample.stock}
                    onChange={e =>
                        setNewSample(prev => ({ ...prev, stock: e.target.value }))
                    }
                    className="px-2 py-1 border rounded"
                />
                <button
                    onClick={handleAddSample}
                    className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                >
                    Add Sample
                </button>
            </div>

            {/* Sample Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 bg-white">
                    <thead className="bg-indigo-50">
                        <tr>
                            <th className="p-2 border-b text-left">Title</th>
                            <th className="p-2 border-b">Price (EGP)</th>
                            <th className="p-2 border-b">Stock</th>
                            <th className="p-2 border-b">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {samples.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-2 border-b">
                                    <input
                                        type="text"
                                        value={s.title}
                                        onChange={e =>
                                            handleSampleChange(s.id, "title", e.target.value)
                                        }
                                        className="w-full border rounded px-2 py-1"
                                    />
                                </td>
                                <td className="p-2 border-b">
                                    <input
                                        type="number"
                                        value={s.price}
                                        onChange={e =>
                                            handleSampleChange(s.id, "price", e.target.value)
                                        }
                                        className="w-24 border rounded px-2 py-1"
                                    />
                                </td>
                                <td className="p-2 border-b">
                                    <input
                                        type="number"
                                        value={s.stock}
                                        onChange={e =>
                                            handleSampleChange(s.id, "stock", e.target.value)
                                        }
                                        className="w-20 border rounded px-2 py-1"
                                    />
                                </td>
                                <td className="p-2 border-b flex gap-2">
                                    <button
                                        onClick={() => handleSaveSample(s.id)}
                                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSample(s.id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}