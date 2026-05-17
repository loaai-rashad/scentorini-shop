import React, { useState } from 'react';
import { supabase } from "../../supabase"; // Added an extra '../' to jump out of 'components' too // Make sure this path correctly points to your supabase.js file

export default function AdminProducts({ 
    products, 
    newProduct, 
    setNewProduct, 
    handleProductChange, 
    handleSaveProduct, 
    handleAddProduct, 
    handleDeleteProduct 
}) {
    const [uploading, setUploading] = useState(false);
    const [editUploadingId, setEditUploadingId] = useState(null);

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string' || url.length < 5) return false;
        return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:image/');
    };
    
    const getMainImageUrl = (product) => {
        const validImages = (product.images || []).filter(url => isValidImageUrl(url));
        return validImages.length > 0 ? validImages[0] : (product.image || "/perfume.jpeg");
    };

    // --- AUTOMATED SUPABASE UPLOAD CORE HANDLER ---
    const uploadImageToSupabase = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('product-images') // Matches your public Supabase bucket name
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

        return data.publicUrl;
    };

    const handleNewProductImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const publicUrl = await uploadImageToSupabase(file);
            setNewProduct(prev => ({
                ...prev,
                images: [...(prev.images || []), publicUrl]
            }));
        } catch (error) {
            console.error('Error uploading image:', error.message);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEditProductImageUpload = async (e, productId) => {
        const file = e.target.files[0];
        if (!file) return;

        setEditUploadingId(productId);
        try {
            const publicUrl = await uploadImageToSupabase(file);
            const product = products.find(p => p.id === productId);
            const currentImages = product.images || [];
            handleProductChange(productId, "images", [...currentImages, publicUrl]);
        } catch (error) {
            console.error('Error uploading image:', error.message);
            alert('Upload failed: ' + error.message);
        } finally {
            setEditUploadingId(null);
        }
    };

    // --- SIZE & PRICE HANDLERS ---
    const handleAddSizeOption = (isNew, productId = null) => {
        const emptySize = { size: '', price: '' };
        if (isNew) {
            setNewProduct(prev => ({
                ...prev,
                sizeOptions: [...(prev.sizeOptions || []), emptySize]
            }));
        } else {
            const product = products.find(p => p.id === productId);
            const updatedOptions = [...(product.sizeOptions || []), emptySize];
            handleProductChange(productId, "sizeOptions", updatedOptions);
        }
    };

    const handleSizeValueChange = (isNew, productId, index, field, value) => {
        if (isNew) {
            setNewProduct(prev => {
                const updated = [...(prev.sizeOptions || [])];
                updated[index][field] = value;
                const mainPrice = field === 'price' && index === 0 ? value : prev.price;
                return { ...prev, sizeOptions: updated, price: mainPrice };
            });
        } else {
            const product = products.find(p => p.id === productId);
            const updated = [...(product.sizeOptions || [])];
            updated[index][field] = value;
            handleProductChange(productId, "sizeOptions", updated);
            if (index === 0 && field === 'price') {
                handleProductChange(productId, "price", value);
            }
        }
    };

  return (
    <div className="p-4 bg-white rounded shadow text-sm">
        <h2 className="text-xl font-semibold mb-4 text-[#1C3C85]">Manage Scentorini Products</h2>

        {/* ADD PRODUCT SECTION */}
        <div className="mb-8 border-2 border-dashed border-gray-200 p-4 rounded-xl bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input type="text" placeholder="Product Title" value={newProduct.title} onChange={e => setNewProduct(prev => ({ ...prev, title: e.target.value }))} className="p-2 border rounded" />
            <input type="text" placeholder="Subtitle" value={newProduct.subtitle} onChange={e => setNewProduct(prev => ({ ...prev, subtitle: e.target.value }))} className="p-2 border rounded" />
            <input type="text" placeholder="For (Him/Her)" value={newProduct.for} onChange={e => setNewProduct(prev => ({ ...prev, for: e.target.value }))} className="p-2 border rounded" />
            <input type="number" placeholder="Default Price" value={newProduct.price} onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))} className="p-2 border rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Supabase Upload Input for New Product */}
            <div className="bg-white p-3 rounded border">
                <h4 className="font-bold mb-1 text-gray-700">Upload Product Images</h4>
                <p className="text-[11px] text-gray-400 mb-2">Upload multiple pictures to build your gallery</p>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleNewProductImageUpload} 
                    disabled={uploading}
                    className="w-full text-xs"
                />
                {uploading && <p className="text-xs text-blue-600 font-bold mt-1 animate-pulse">Uploading asset to Supabase...</p>}
                
                {newProduct.images && newProduct.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3 pt-2 border-t">
                        {newProduct.images.map((url, i) => (
                            <img key={i} src={url} className="w-10 h-10 object-cover rounded border" alt="Preview" />
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white p-3 rounded border">
                <h4 className="font-bold mb-2 text-gray-700">Sizes & Prices (Optional)</h4>
                {(newProduct.sizeOptions || []).map((opt, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                        <input type="text" placeholder="Size (e.g. 50ml)" value={opt.size} onChange={e => handleSizeValueChange(true, null, idx, 'size', e.target.value)} className="flex-1 p-2 border rounded" />
                        <input type="number" placeholder="Price (EGP)" value={opt.price} onChange={e => handleSizeValueChange(true, null, idx, 'price', e.target.value)} className="w-32 p-2 border rounded" />
                    </div>
                ))}
                <button onClick={() => handleAddSizeOption(true)} className="text-blue-600 font-bold hover:underline text-xs uppercase">+ Add Size Option</button>
            </div>
          </div>

          <button onClick={handleAddProduct} className="w-full bg-[#1C3C85] text-white py-2 rounded-lg font-bold hover:bg-[#2e1f88]">
            Save New Product to Collection
          </button>
        </div>
        
        {/* PRODUCT TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full border bg-white">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3 border-b">Product Info</th>
                <th className="p-3 border-b">Details & Price</th>
                <th className="p-3 border-b">Sizes & Prices</th>
                <th className="p-3 border-b">Inventory</th>
                <th className="p-3 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 border-b align-top">
                  {/* Column 1: Image, Basic Info & Supabase File Upload Container */}
                  <td className="p-3 w-64">
                    <div className="flex gap-3 mb-3">
                        <img src={getMainImageUrl(p)} className="w-12 h-12 object-cover rounded shadow-sm" alt="" />
                        <div className="flex flex-col gap-1 flex-1">
                            <input type="text" value={p.title} onChange={e => handleProductChange(p.id, "title", e.target.value)} className="font-bold border rounded p-1 w-full" />
                            <input type="text" value={p.subtitle} onChange={e => handleProductChange(p.id, "subtitle", e.target.value)} className="text-gray-500 text-xs border rounded p-1 w-full" />
                        </div>
                    </div>
                    
                    <div className="bg-stone-50 p-2 rounded border border-gray-200 mb-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Upload New Image File</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleEditProductImageUpload(e, p.id)}
                            disabled={editUploadingId === p.id}
                            className="w-full text-[10px]"
                        />
                        {editUploadingId === p.id && (
                            <p className="text-[10px] text-blue-600 font-bold mt-1 animate-pulse">Syncing image...</p>
                        )}
                    </div>

                    <label className="text-[10px] font-bold text-gray-400 uppercase">Image URLs (one per line)</label>
                    <textarea 
                        value={(p.images || []).join('\n')} 
                        onChange={e => handleProductChange(p.id, "images", e.target.value.split('\n'))}
                        className="w-full h-16 border rounded p-1 text-[10px] mt-1"
                    />
                  </td>
                  
                  {/* Column 2: Price, InspiredBy, Description */}
                  <td className="p-3 w-64">
                    <div className="flex flex-col gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Base Price</label>
                            <input type="number" value={p.price} onChange={e => handleProductChange(p.id, "price", e.target.value)} className="w-full border rounded p-1 font-bold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Inspired By</label>
                            <input type="text" value={p.inspiredBy || ""} onChange={e => handleProductChange(p.id, "inspiredBy", e.target.value)} className="w-full border rounded p-1" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                            <textarea value={p.description} onChange={e => handleProductChange(p.id, "description", e.target.value)} className="w-full h-16 border rounded p-1 text-[10px]" />
                        </div>
                    </div>
                  </td>

                  {/* Column 3: Multi-Size Options */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                        {(p.sizeOptions || []).map((opt, idx) => (
                            <div key={idx} className="flex gap-1">
                                <input type="text" value={opt.size} onChange={e => handleSizeValueChange(false, p.id, idx, 'size', e.target.value)} className="w-16 p-1 border rounded text-[10px]" placeholder="Size" />
                                <input type="number" value={opt.price} onChange={e => handleSizeValueChange(false, p.id, idx, 'price', e.target.value)} className="w-20 p-1 border rounded text-[10px]" placeholder="Price" />
                            </div>
                        ))}
                        <button onClick={() => handleAddSizeOption(false, p.id)} className="text-[10px] text-blue-500 font-bold uppercase mt-1 text-left">+ Add Size</button>
                    </div>
                  </td>

                  {/* Column 4: Stock & Category */}
                  <td className="p-3 w-32">
                    <div className="flex flex-col gap-2">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Stock</label>
                            <input type="number" value={p.stock} onChange={e => handleProductChange(p.id, "stock", e.target.value)} className="w-full border rounded p-1" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">For</label>
                            <input type="text" value={p.for} onChange={e => handleProductChange(p.id, "for", e.target.value)} className="w-full border rounded p-1" />
                        </div>
                    </div>
                  </td>

                  {/* Column 5: Actions */}
                  <td className="p-3 text-right">
                    <div className="flex flex-col gap-2">
                        <button onClick={() => handleSaveProduct(p.id)} className="bg-green-600 text-white px-3 py-2 rounded text-xs font-bold uppercase">Save Changes</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  );
}