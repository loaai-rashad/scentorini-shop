// src/components/admin/AdminProducts.jsx

import React from 'react';

export default function AdminProducts({ 
    products, 
    newProduct, 
    setNewProduct, 
    handleProductChange, 
    handleSaveProduct, 
    handleAddProduct, 
    handleDeleteProduct 
}) {

    // Helper to check if a URL is valid (used for display filtering only)
    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string' || url.length < 5) return false;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
            return true;
        }
        if (url.startsWith('data:image/')) {
            return url.length > 500; 
        }
        return false;
    };
    
    // Helper to get the main thumbnail URL
    const getMainImageUrl = (product) => {
        const validImages = (product.images || []).filter(url => isValidImageUrl(url));
        if (validImages.length > 0) {
            return validImages[0];
        }
        if (product.image && isValidImageUrl(product.image)) {
            return product.image;
        }
        return "/perfume.jpeg";
    };


    // =======================================================
    // DYNAMIC INPUT HANDLERS for NEW PRODUCT CREATION
    // These update the newProduct state array in AdminDashboard
    // =======================================================
    
    const handleNewImageChange = (index, value) => {
        setNewProduct(prev => {
            const newImages = [...(prev.images || [])];
            newImages[index] = value;
            return { ...prev, images: newImages };
        });
    };

    const handleNewImageAdd = () => {
        setNewProduct(prev => ({ 
            ...prev, 
            // Add an empty string for the new input field
            images: [...(prev.images || []), ''] 
        }));
    };

    const handleNewImageRemove = (index) => {
        setNewProduct(prev => {
            const newImages = (prev.images || []).filter((_, i) => i !== index);
            return { ...prev, images: newImages };
        });
    };
    
    // Initialize newProduct.images state to show at least one input field if empty
    const newProductImages = newProduct.images && newProduct.images.length > 0 ? newProduct.images : ['']; 
    

    // =======================================================
    // DYNAMIC INPUT HANDLERS for EDITING EXISTING PRODUCTS
    // These use handleProductChange prop to update the main products array
    // =======================================================
    
    const handleEditImageChange = (productId, index, value) => {
        const productToEdit = products.find(p => p.id === productId);
        if (!productToEdit) return;

        const updatedImages = [...(productToEdit.images || [])];
        updatedImages[index] = value;
        
        handleProductChange(productId, "images", updatedImages);
    };

    const handleEditImageAdd = (productId) => {
        const productToEdit = products.find(p => p.id === productId);
        if (!productToEdit) return;
        
        const updatedImages = [...(productToEdit.images || []), ''];
        handleProductChange(productId, "images", updatedImages);
    };

    const handleEditImageRemove = (productId, index) => {
        const productToEdit = products.find(p => p.id === productId);
        if (!productToEdit) return;

        const updatedImages = (productToEdit.images || []).filter((_, i) => i !== index);
        handleProductChange(productId, "images", updatedImages);
    };


  return (
    <div className="p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Manage Products</h2>

        {/* ============================================== */}
        {/* ADD PRODUCT SECTION - WITH DYNAMIC IMAGE INPUTS */}
        {/* ============================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-3 border p-3 rounded bg-gray-50">
            
          {/* Row 1: Key Info (Same as before) */}
          <input type="text" placeholder="Title" value={newProduct.title} onChange={e => setNewProduct(prev => ({ ...prev, title: e.target.value }))} className="px-2 py-1 border rounded md:col-span-3" />
          <input type="text" placeholder="Subtitle" value={newProduct.subtitle} onChange={e => setNewProduct(prev => ({ ...prev, subtitle: e.target.value }))} className="px-2 py-1 border rounded md:col-span-3" />
          <input type="text" placeholder="For (him/her/...)" value={newProduct.for} onChange={e => setNewProduct(prev => ({ ...prev, for: e.target.value }))} className="px-2 py-1 border rounded md:col-span-2" />
          <input type="text" placeholder="Inspired By" value={newProduct.inspiredBy || ""} onChange={e => setNewProduct(prev => ({ ...prev, inspiredBy: e.target.value }))} className="px-2 py-1 border rounded md:col-span-2" />
          <input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))} className="px-2 py-1 border rounded md:col-span-1" />
          <input type="number" placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct(prev => ({ ...prev, stock: e.target.value }))} className="px-2 py-1 border rounded md:col-span-1" />
          
          {/* Row 2: Description */}
          <input type="text" placeholder="Short Description" value={newProduct.description} onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))} className="px-2 py-1 border rounded col-span-full md:col-span-10" />
          
          <button onClick={handleAddProduct} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 col-span-full md:col-span-2">
            Add Product
          </button>
          
          {/* Row 3: DYNAMIC IMAGE URL INPUTS */}
          <div className="col-span-full">
            <h4 className="text-sm font-semibold mb-1">Image URLs</h4>
            {newProductImages.map((imgUrl, index) => (
                <div key={index} className="flex gap-2 mb-1">
                    <input
                        type="url"
                        placeholder={`Image URL ${index + 1}`}
                        value={imgUrl}
                        onChange={e => handleNewImageChange(index, e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-xs"
                    />
                    {/* Only allow removal if there is more than one field */}
                    {(newProduct.images || []).length > 1 && (
                        <button
                            onClick={() => handleNewImageRemove(index)}
                            className="bg-red-500 text-white px-2 rounded hover:bg-red-600 text-xs"
                        >
                            Remove
                        </button>
                    )}
                </div>
            ))}
            <button
                onClick={handleNewImageAdd}
                className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 text-xs mt-2"
            >
                + Add Another Image Field
            </button>
          </div>
        </div>
        

        {/* ============================================== */}
        {/* PRODUCT TABLE - WITH DYNAMIC IMAGE INPUTS */}
        {/* ============================================== */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border-b">Main Image</th>
                <th className="p-2 border-b">Title</th>
                <th className="p-2 border-b">Subtitle</th>
                <th className="p-2 border-b">For</th> 
                <th className="p-2 border-b">Inspired By</th> 
                <th className="p-2 border-b">Price</th>
                <th className="p-2 border-b">Stock</th>
                <th className="p-2 border-b w-1/4">Image URLs</th>
                <th className="p-2 border-b">Description</th>
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 align-top">
                  <td className="p-2 border-b">
                    <img
                      src={getMainImageUrl(p)} 
                      alt={p.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input type="text" value={p.title} onChange={e => handleProductChange(p.id, "title", e.target.value)} className="w-full border rounded px-2 py-1" />
                  </td>
                  <td className="p-2 border-b">
                    <input type="text" value={p.subtitle} onChange={e => handleProductChange(p.id, "subtitle", e.target.value)} className="w-full border rounded px-2 py-1" />
                  </td>
                  <td className="p-2 border-b">
                    <input type="text" value={p.for || ""} onChange={e => handleProductChange(p.id, "for", e.target.value)} className="w-20 border rounded px-2 py-1" />
                  </td>
                  <td className="p-2 border-b">
                    <input type="text" value={p.inspiredBy || ""} onChange={e => handleProductChange(p.id, "inspiredBy", e.target.value)} className="w-32 border rounded px-2 py-1" />
                  </td>
                  <td className="p-2 border-b">
                    <input type="number" value={p.price} onChange={e => handleProductChange(p.id, "price", e.target.value)} className="w-24 border rounded px-2 py-1" />
                  </td>
                  <td className="p-2 border-b">
                    <input type="number" value={p.stock} onChange={e => handleProductChange(p.id, "stock", e.target.value)} className="w-20 border rounded px-2 py-1" />
                  </td>
                  
                  <td className="p-2 border-b">
                    {/* DYNAMIC EDIT INPUTS */}
                    {/* Ensure there's at least one input if the array is empty */}
                    {(p.images && p.images.length > 0 ? p.images : ['']).map((imgUrl, index) => (
                        <div key={index} className="flex gap-2 mb-1">
                            <input
                                type="url"
                                placeholder={`Image URL ${index + 1}`}
                                value={imgUrl}
                                onChange={e => handleEditImageChange(p.id, index, e.target.value)}
                                className="flex-1 border rounded px-2 py-1 text-xs"
                            />
                            {/* Only show remove button if there are fields to remove */}
                            {(p.images || []).length > 0 && (p.images || []).length > 1 && (
                                <button
                                    onClick={() => handleEditImageRemove(p.id, index)}
                                    className="bg-red-500 text-white px-2 rounded hover:bg-red-600 text-xs"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={() => handleEditImageAdd(p.id)}
                        className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 text-xs mt-1"
                    >
                        + Add Image
                    </button>
                  </td>

                  <td className="p-2 border-b">
                    <textarea value={p.description || ""} onChange={e => handleProductChange(p.id, "description", e.target.value)} className="w-full border rounded px-2 py-1 h-20" />
                  </td>

                  <td className="p-2 border-b flex flex-col gap-2">
                    <button onClick={() => handleSaveProduct(p.id)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                      Save
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm">
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