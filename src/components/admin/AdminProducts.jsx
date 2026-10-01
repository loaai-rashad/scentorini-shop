import React, { useState, useMemo } from 'react';
import { uploadImage } from "../../lib/uploadImage";
import { toast } from './ui/notify';
import { Plus, Trash2, X, Search, ImagePlus, PackagePlus, ChevronDown, Loader2, Tag } from 'lucide-react';
import { getPriceInfo, formatEGP, DISCOUNT_TYPES } from "../../lib/pricing";

const SALE = "#C2104A";

/**
 * Discount controls for one product (new or existing).
 * `onChange(field, value)` writes straight onto the product being edited, so the
 * same block serves the "New Product" panel and every product card.
 */
function DiscountEditor({ product, onChange, inputCls, labelCls }) {
    const active = !!product.discountActive;
    const type = product.discountType || "percent";
    const info = getPriceInfo(product, product.price);

    return (
        <div className={`mt-3 rounded-xl border p-4 transition-colors ${active ? "border-[#C2104A]/30 bg-[#C2104A]/[0.04]" : "border-gray-100 bg-gray-50"}`}>
            <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <Tag className="w-3.5 h-3.5" style={active ? { color: SALE } : undefined} />
                    Discount
                </span>

                {/* On/off switch — nothing shows on the storefront while this is off */}
                <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    onClick={() => onChange("discountActive", !active)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${active ? "bg-[#C2104A]" : "bg-gray-300"}`}
                >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? "translate-x-5" : ""}`} />
                </button>
            </div>

            {active && (
                <>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                            <label className={labelCls}>Type</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={e => onChange("discountType", e.target.value)}
                                    className={inputCls + " appearance-none pr-8"}
                                >
                                    {DISCOUNT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>{type === "fixed" ? "Amount Off (EGP)" : "Percent Off (%)"}</label>
                            <input
                                type="number"
                                min="0"
                                max={type === "fixed" ? undefined : 99}
                                value={product.discountValue ?? ""}
                                onChange={e => onChange("discountValue", e.target.value)}
                                placeholder={type === "fixed" ? "150" : "20"}
                                className={inputCls + " font-bold"}
                            />
                        </div>
                    </div>

                    <div className="mt-3">
                        <label className={labelCls}>Offer Label (optional)</label>
                        <input
                            type="text"
                            value={product.discountLabel || ""}
                            onChange={e => onChange("discountLabel", e.target.value)}
                            placeholder="e.g. Summer Sale"
                            className={inputCls}
                        />
                    </div>

                    {/* Live preview of exactly what the customer will see */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        {info.hasDiscount ? (
                            <>
                                <span className="text-gray-400 line-through">{formatEGP(info.original)}</span>
                                <span className="font-black" style={{ color: SALE }}>{formatEGP(info.price)}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: SALE }}>
                                    {info.badge}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    Saves {formatEGP(info.amountOff)}
                                </span>
                            </>
                        ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                Enter a value above 0 to apply the offer.
                            </span>
                        )}
                    </div>

                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                        Applies to the base price and every size option of this product.
                    </p>
                </>
            )}
        </div>
    );
}

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
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState("");

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string' || url.length < 5) return false;
        return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:image/');
    };

    const getMainImageUrl = (product) => {
        const validImages = (product.images || []).filter(url => isValidImageUrl(url));
        return validImages.length > 0 ? validImages[0] : (product.image || "/perfume.jpeg");
    };

    // --- IMAGE UPLOAD (compress + Cloudinary) ---
    const handleNewProductImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            setNewProduct(prev => ({ ...prev, images: [...(prev.images || []), url] }));
            toast.success("Image uploaded.");
        } catch (error) {
            console.error('Error uploading image:', error.message);
            toast.error('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleEditProductImageUpload = async (e, productId) => {
        const file = e.target.files[0];
        if (!file) return;
        setEditUploadingId(productId);
        try {
            const url = await uploadImage(file);
            const product = products.find(p => p.id === productId);
            handleProductChange(productId, "images", [...(product.images || []), url]);
            toast.success("Image uploaded.");
        } catch (error) {
            console.error('Error uploading image:', error.message);
            toast.error('Upload failed: ' + error.message);
        } finally {
            setEditUploadingId(null);
            e.target.value = "";
        }
    };

    // --- IMAGE REMOVE ---
    const removeNewImage = (index) =>
        setNewProduct(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
    const removeProductImage = (productId, index) => {
        const product = products.find(p => p.id === productId);
        handleProductChange(productId, "images", (product.images || []).filter((_, i) => i !== index));
    };

    // --- SIZE & PRICE HANDLERS ---
    const handleAddSizeOption = (isNew, productId = null) => {
        const emptySize = { size: '', price: '' };
        if (isNew) {
            setNewProduct(prev => ({ ...prev, sizeOptions: [...(prev.sizeOptions || []), emptySize] }));
        } else {
            const product = products.find(p => p.id === productId);
            handleProductChange(productId, "sizeOptions", [...(product.sizeOptions || []), emptySize]);
        }
    };

    const removeSizeOption = (isNew, productId, index) => {
        if (isNew) {
            setNewProduct(prev => ({ ...prev, sizeOptions: (prev.sizeOptions || []).filter((_, i) => i !== index) }));
        } else {
            const product = products.find(p => p.id === productId);
            handleProductChange(productId, "sizeOptions", (product.sizeOptions || []).filter((_, i) => i !== index));
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
            if (index === 0 && field === 'price') handleProductChange(productId, "price", value);
        }
    };

    // --- SEARCH ---
    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return products;
        return products.filter(p =>
            [p.title, p.subtitle, p.inspiredBy, p.for].filter(Boolean)
                .some(f => String(f).toLowerCase().includes(term))
        );
    }, [products, search]);

    const inputCls = "w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none";
    const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1";

    return (
        <div className="font-archivo">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-xl font-black uppercase tracking-tight text-[#1C3C85]">
                    Products <span className="text-gray-300">·</span> <span className="text-gray-400 text-base">{products.length}</span>
                </h2>
                <button
                    onClick={() => setShowAdd(s => !s)}
                    className="flex items-center gap-2 bg-[#1C3C85] text-white px-5 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 shadow-sm transition"
                >
                    <PackagePlus className="w-4 h-4" /> {showAdd ? "Close" : "Add Product"}
                </button>
            </div>

            {/* ADD PRODUCT PANEL */}
            {showAdd && (
                <div className="mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                    <h3 className="text-sm font-black uppercase tracking-tight text-[#1C3C85] mb-4">New Product</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div><label className={labelCls}>Title</label><input type="text" placeholder="Product title" value={newProduct.title} onChange={e => setNewProduct(prev => ({ ...prev, title: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Subtitle</label><input type="text" placeholder="Subtitle" value={newProduct.subtitle} onChange={e => setNewProduct(prev => ({ ...prev, subtitle: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>For</label><input type="text" placeholder="Him / Her / Unisex / Oil" value={newProduct.for} onChange={e => setNewProduct(prev => ({ ...prev, for: e.target.value }))} className={inputCls} /></div>
                        <div><label className={labelCls}>Default Price</label><input type="number" placeholder="EGP" value={newProduct.price} onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))} className={inputCls} /></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        {/* Upload */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className={labelCls}>Product Images</label>
                            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest cursor-pointer transition ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-white border border-[#1C3C85] text-[#1C3C85] hover:bg-[#1C3C85] hover:text-white'}`}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                {uploading ? "Uploading…" : "Upload Image"}
                                <input type="file" accept="image/*" onChange={handleNewProductImageUpload} disabled={uploading} className="hidden" />
                            </label>
                            {newProduct.images && newProduct.images.length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-3">
                                    {newProduct.images.map((url, i) => (
                                        <div key={i} className="relative group">
                                            <img src={url} className="w-14 h-14 object-cover rounded-lg border" alt="Preview" />
                                            <button onClick={() => removeNewImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sizes */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className={labelCls}>Sizes & Prices (optional)</label>
                            {(newProduct.sizeOptions || []).map((opt, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input type="text" placeholder="Size (50ml)" value={opt.size} onChange={e => handleSizeValueChange(true, null, idx, 'size', e.target.value)} className="flex-1 p-2 border border-gray-200 rounded-lg text-sm" />
                                    <input type="number" placeholder="EGP" value={opt.price} onChange={e => handleSizeValueChange(true, null, idx, 'price', e.target.value)} className="w-24 p-2 border border-gray-200 rounded-lg text-sm" />
                                    <button onClick={() => removeSizeOption(true, null, idx)} className="text-gray-300 hover:text-red-500 px-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button onClick={() => handleAddSizeOption(true)} className="flex items-center gap-1 text-[#1C3C85] font-black text-[11px] uppercase tracking-widest mt-1"><Plus className="w-3.5 h-3.5" /> Add Size</button>
                        </div>
                    </div>

                    <DiscountEditor
                        product={newProduct}
                        onChange={(field, value) => setNewProduct(prev => ({ ...prev, [field]: value }))}
                        inputCls={inputCls}
                        labelCls={labelCls}
                    />

                    <button onClick={handleAddProduct} className="w-full mt-4 bg-[#1C3C85] text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-800 transition shadow-sm">
                        Save New Product
                    </button>
                </div>
            )}

            {/* SEARCH */}
            <div className="relative mb-5 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none" />
            </div>

            {/* PRODUCT CARDS */}
            {filteredProducts.length === 0 ? (
                <p className="text-center text-gray-400 py-16 font-bold uppercase text-xs tracking-widest">
                    {search ? `No products match "${search}".` : "No products yet."}
                </p>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {filteredProducts.map(p => {
                        const stock = Number(p.stock) || 0;
                        const stockTone = stock <= 0 ? "bg-red-100 text-red-700" : stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                        const offer = getPriceInfo(p, p.price);
                        return (
                            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                                {/* Top: image + title/subtitle + stock badge */}
                                <div className="flex gap-3">
                                    <img src={getMainImageUrl(p)} className="w-16 h-20 object-cover rounded-xl border flex-shrink-0" alt="" />
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <input type="text" value={p.title} onChange={e => handleProductChange(p.id, "title", e.target.value)} className="font-bold border border-gray-200 rounded-lg p-1.5 w-full text-sm" />
                                        <input type="text" value={p.subtitle} onChange={e => handleProductChange(p.id, "subtitle", e.target.value)} placeholder="Subtitle" className="text-gray-500 text-xs border border-gray-200 rounded-lg p-1.5 w-full" />
                                    </div>
                                    <div className="self-start flex flex-col items-end gap-1.5">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${stockTone}`}>
                                            {stock <= 0 ? "Out" : `${stock} left`}
                                        </span>
                                        {/* Lets admins spot live offers while scanning the list */}
                                        {offer.hasDiscount && (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap" style={{ backgroundColor: SALE }}>
                                                {offer.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Gallery thumbnails with remove + upload */}
                                <div className="mt-3">
                                    <label className={labelCls}>Images</label>
                                    <div className="flex gap-2 flex-wrap items-center">
                                        {(p.images || []).filter(isValidImageUrl).map((url, i) => (
                                            <div key={i} className="relative group">
                                                <img src={url} className="w-12 h-12 object-cover rounded-lg border" alt="" />
                                                <button onClick={() => removeProductImage(p.id, i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                        <label className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed cursor-pointer transition ${editUploadingId === p.id ? 'border-gray-200 text-gray-300' : 'border-gray-300 text-gray-400 hover:border-[#1C3C85] hover:text-[#1C3C85]'}`}>
                                            {editUploadingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                            <input type="file" accept="image/*" onChange={(e) => handleEditProductImageUpload(e, p.id)} disabled={editUploadingId === p.id} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                {/* Fields grid */}
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div><label className={labelCls}>Base Price</label><input type="number" value={p.price} onChange={e => handleProductChange(p.id, "price", e.target.value)} className={inputCls + " font-bold"} /></div>
                                    <div><label className={labelCls}>Stock</label><input type="number" value={p.stock} onChange={e => handleProductChange(p.id, "stock", e.target.value)} className={inputCls} /></div>
                                    <div><label className={labelCls}>For</label><input type="text" value={p.for} onChange={e => handleProductChange(p.id, "for", e.target.value)} className={inputCls} /></div>
                                    <div><label className={labelCls}>Inspired By</label><input type="text" value={p.inspiredBy || ""} onChange={e => handleProductChange(p.id, "inspiredBy", e.target.value)} className={inputCls} /></div>
                                </div>

                                <div className="mt-3">
                                    <label className={labelCls}>Description</label>
                                    <textarea value={p.description} onChange={e => handleProductChange(p.id, "description", e.target.value)} className="w-full h-16 border border-gray-200 rounded-lg p-2 text-xs resize-none" />
                                </div>

                                {/* Sizes */}
                                <div className="mt-3">
                                    <label className={labelCls}>Sizes & Prices</label>
                                    {(p.sizeOptions || []).map((opt, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2">
                                            <input type="text" value={opt.size} onChange={e => handleSizeValueChange(false, p.id, idx, 'size', e.target.value)} className="flex-1 p-2 border border-gray-200 rounded-lg text-xs" placeholder="Size" />
                                            <input type="number" value={opt.price} onChange={e => handleSizeValueChange(false, p.id, idx, 'price', e.target.value)} className="w-24 p-2 border border-gray-200 rounded-lg text-xs" placeholder="EGP" />
                                            <button onClick={() => removeSizeOption(false, p.id, idx)} className="text-gray-300 hover:text-red-500 px-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddSizeOption(false, p.id)} className="flex items-center gap-1 text-[#1C3C85] font-black text-[11px] uppercase tracking-widest"><Plus className="w-3.5 h-3.5" /> Add Size</button>
                                </div>

                                {/* Discount */}
                                <DiscountEditor
                                    product={p}
                                    onChange={(field, value) => handleProductChange(p.id, field, value)}
                                    inputCls={inputCls}
                                    labelCls={labelCls}
                                />

                                {/* Actions */}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                    <button onClick={() => handleSaveProduct(p.id)} className="flex-1 bg-[#1C3C85] text-white py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-800 transition">Save Changes</button>
                                    <button onClick={() => handleDeleteProduct(p.id)} className="px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
