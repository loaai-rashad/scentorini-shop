// src/components/admin/AdminProducts.jsx

import React from 'react';

// Props will contain all necessary state (products, newProduct) and handlers
export default function AdminProducts({ 
    products, 
    newProduct, 
    setNewProduct, 
    handleProductChange, 
    handleSaveProduct, 
    handleAddProduct, 
    handleDeleteProduct 
}) {

  return (
    <div className="p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Manage Products</h2>

        {/* Add Product */}
        {/* NOTE: Changed grid to md:grid-cols-10 to fit the new field and the Add button */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-2 mb-3">
          <input
            type="text"
            placeholder="Title"
            value={newProduct.title}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, title: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="text"
            placeholder="Subtitle"
            value={newProduct.subtitle}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, subtitle: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="text"
            placeholder="For (him/her/oil/tester)"
            value={newProduct.for}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, for: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          {/* --- NEW FIELD: INSPIRED BY (for Adding) --- */}
          <input
            type="text"
            placeholder="Inspired By"
            value={newProduct.inspiredBy || ""}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, inspiredBy: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          {/* ------------------------------------------- */}
          <input
            type="number"
            placeholder="Price"
            value={newProduct.price}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, price: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="number"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, stock: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="text"
            placeholder="Image URL"
            value={newProduct.image}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, image: e.target.value }))
            }
            className="px-2 py-1 border rounded col-span-2"
          />
          <button
            onClick={handleAddProduct}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 md:col-span-1"
          >
            Add
          </button>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border-b">Image</th>
                <th className="p-2 border-b">Title</th>
                <th className="p-2 border-b">Subtitle</th>
                <th className="p-2 border-b">For</th> 
                {/* --- NEW COLUMN HEADER --- */}
                <th className="p-2 border-b">Inspired By</th> 
                {/* ------------------------- */}
                <th className="p-2 border-b">Price</th>
                <th className="p-2 border-b">Stock</th>
                <th className="p-2 border-b">Description</th>
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-2 border-b">
                    <img
                      src={p.image || "/perfume.jpeg"}
                      alt={p.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={p.title}
                      onChange={e =>
                        handleProductChange(p.id, "title", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={p.subtitle}
                      onChange={e =>
                        handleProductChange(p.id, "subtitle", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={p.for || ""}
                      onChange={e =>
                        handleProductChange(p.id, "for", e.target.value)
                      }
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>
                  {/* --- NEW INPUT FIELD (for Editing) --- */}
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={p.inspiredBy || ""}
                      onChange={e =>
                        handleProductChange(p.id, "inspiredBy", e.target.value)
                      }
                      className="w-32 border rounded px-2 py-1"
                    />
                  </td>
                  {/* ------------------------------------ */}
                  <td className="p-2 border-b">
                    <input
                      type="number"
                      value={p.price}
                      onChange={e =>
                        handleProductChange(p.id, "price", e.target.value)
                      }
                      className="w-24 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="number"
                      value={p.stock}
                      onChange={e =>
                        handleProductChange(p.id, "stock", e.target.value)
                      }
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>

                  <td className="p-2 border-b">
                    <textarea
                      value={p.description || ""}
                      onChange={e =>
                        handleProductChange(p.id, "description", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1 h-20"
                    />
                  </td>

                  <td className="p-2 border-b flex gap-2">
                    <button
                      onClick={() => handleSaveProduct(p.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
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