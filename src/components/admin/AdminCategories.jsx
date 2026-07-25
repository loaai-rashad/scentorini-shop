// src/components/admin/AdminCategories.jsx
// Manage the category menu shown in the header + mobile drawer.
// Create a category (e.g. "Oils"), pick which products belong to it,
// toggle visibility, reorder, and delete. Lives in the Site Settings tab.

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast, confirmDialog } from "./ui/notify";
import { Search, ChevronDown, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ExternalLink } from "lucide-react";

// Turns "Perfume Oils!" into a URL-safe "perfume-oils".
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "category";

export default function AdminCategories({ products = [] }) {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  // Live categories, ordered by their `order` field.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setCategories(data);
    });
    return () => unsub();
  }, []);

  // --- Create ---
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return toast.error("Enter a category name.");
    if (categories.some((c) => c.slug === slugify(name)))
      return toast.error("A category with this name already exists.");
    try {
      await addDoc(collection(db, "categories"), {
        name,
        slug: slugify(name),
        productIds: [],
        order: categories.length,
        visible: true,
      });
      setNewName("");
      toast.success(`Category "${name}" created.`);
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category.");
    }
  };

  // --- Local edits (mutate the in-memory copy; persisted on Save) ---
  const updateLocal = (id, field, value) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const toggleProduct = (id, productId) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const ids = Array.isArray(c.productIds) ? c.productIds : [];
        return {
          ...c,
          productIds: ids.includes(productId)
            ? ids.filter((p) => p !== productId)
            : [...ids, productId],
        };
      })
    );
  };

  // --- Persist ---
  const handleSave = async (cat) => {
    const name = String(cat.name || "").trim();
    if (!name) return toast.error("Category name can't be empty.");
    try {
      await updateDoc(doc(db, "categories", cat.id), {
        name,
        slug: slugify(name),
        productIds: cat.productIds || [],
        visible: cat.visible !== false,
        order: cat.order ?? 0,
      });
      toast.success("Category saved.");
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category.");
    }
  };

  const handleToggleVisible = async (cat) => {
    try {
      await updateDoc(doc(db, "categories", cat.id), { visible: !(cat.visible !== false) });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to update visibility.");
    }
  };

  const handleDelete = async (cat) => {
    if (!(await confirmDialog({ title: "Delete category", message: `Remove "${cat.name}" from the menu? Products are not deleted.`, confirmText: "Delete" }))) return;
    try {
      await deleteDoc(doc(db, "categories", cat.id));
      toast.success("Category deleted.");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category.");
    }
  };

  // Swap the `order` of two neighbouring categories.
  const handleMove = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const a = categories[index];
    const b = categories[target];
    try {
      await Promise.all([
        updateDoc(doc(db, "categories", a.id), { order: b.order ?? target }),
        updateDoc(doc(db, "categories", b.id), { order: a.order ?? index }),
      ]);
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to reorder.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-black uppercase text-[#1C3C85]">Menu Categories</h3>
        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase">
          {categories.length} {categories.length === 1 ? "Category" : "Categories"}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 font-medium mb-6">
        These appear in the header and mobile menu. Each links to a page showing the products you pick.
      </p>

      {/* Create new */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl mb-6 border border-gray-100">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">New Category Name</label>
          <input
            type="text"
            placeholder="e.g. Oils"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full p-3 border rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleCreate}
            className="bg-[#1C3C85] text-white px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all active:scale-95 shadow-md"
          >
            Add Category
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {categories.length === 0 && (
          <p className="p-8 text-center text-gray-400 font-bold uppercase text-xs italic">
            No categories yet. Create one above.
          </p>
        )}

        {categories.map((cat, index) => {
          const isOpen = expandedId === cat.id;
          const selected = Array.isArray(cat.productIds) ? cat.productIds : [];
          return (
            <div key={cat.id} className="border rounded-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
                {/* Reorder */}
                <div className="flex flex-col">
                  <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-[#1C3C85] disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleMove(index, 1)} disabled={index === categories.length - 1} className="text-gray-400 hover:text-[#1C3C85] disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Name */}
                <input
                  type="text"
                  value={cat.name || ""}
                  onChange={(e) => updateLocal(cat.id, "name", e.target.value)}
                  className="flex-1 min-w-0 p-2 border rounded-lg font-black text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                />

                <span className="hidden sm:inline bg-white border text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full">
                  {selected.length} items
                </span>

                {/* Visible toggle */}
                <button
                  onClick={() => handleToggleVisible(cat)}
                  title={cat.visible !== false ? "Visible in menu" : "Hidden from menu"}
                  className={`p-2 rounded-lg transition-colors ${cat.visible !== false ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
                >
                  {cat.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Expand */}
                <button
                  onClick={() => { setExpandedId(isOpen ? null : cat.id); setProductSearch(""); }}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Delete */}
                <button onClick={() => handleDelete(cat)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Card body — product picker */}
              {isOpen && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <a
                      href={`/category/${cat.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#1C3C85] hover:underline"
                    >
                      /category/{cat.slug} <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => handleSave(cat)}
                      className="bg-[#1C3C85] text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-colors shadow"
                    >
                      Save Changes
                    </button>
                  </div>

                  {/* Search products */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products to add…"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <ProductPicker
                    products={products}
                    selected={selected}
                    search={productSearch}
                    onToggle={(pid) => toggleProduct(cat.id, pid)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Scrollable checkbox list of products with thumbnails; selected float to the top.
function ProductPicker({ products, selected, search, onToggle }) {
  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? products.filter((p) =>
          [p.title, p.subtitle, p.inspiredBy, p.for]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(term))
        )
      : products;
    const sel = new Set(selected);
    // Selected first, then alphabetical.
    return [...filtered].sort((a, b) => {
      const as = sel.has(a.id) ? 0 : 1;
      const bs = sel.has(b.id) ? 0 : 1;
      if (as !== bs) return as - bs;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [products, selected, search]);

  if (products.length === 0) {
    return <p className="text-center text-gray-400 text-xs italic py-6">No products found.</p>;
  }

  return (
    <div className="max-h-[320px] overflow-y-auto border rounded-xl divide-y">
      {list.map((p) => {
        const isSel = selected.includes(p.id);
        const thumb = (p.images && p.images[0]) || p.image;
        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${isSel ? "bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <input
              type="checkbox"
              checked={isSel}
              readOnly
              className="w-4 h-4 accent-[#1C3C85] pointer-events-none"
            />
            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
              {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-gray-800 truncate">{p.title || "Untitled"}</p>
              <p className="text-[11px] text-gray-400 font-medium truncate">
                {[p.for, p.price ? `EGP ${p.price}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          </button>
        );
      })}
      {list.length === 0 && (
        <p className="text-center text-gray-400 text-xs italic py-6">No products match your search.</p>
      )}
    </div>
  );
}
