import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { Gift, ChevronDown, ExternalLink, ImagePlus, Loader2, Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { db } from "../../firebase";
import { uploadImage } from "../../lib/uploadImage";
import { toast, confirmDialog } from "./ui/notify";
import {
  BUNDLES,
  BUNDLE_SETTINGS_DOC,
  DEFAULT_HEADING,
  PRESETS,
  SLOT_TYPES,
  useBundles,
  useBundleHeading,
  poolFor,
  bundlePrice,
  offerLine,
} from "../../lib/bundles";

const inputCls = "w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none";
const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1";

const toForm = (b) => ({
  title: b.title || "",
  badge: b.badge || "",
  tagline: b.tagline || "",
  description: b.description || "",
  image: b.image || "",
  discountPercent: String(b.discountPercent ?? 0),
  order: String(b.order ?? 0),
  slots: (b.slots || []).map((s) => ({ type: s.type || "perfume", label: s.label || "", free: !!s.free })),
});

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-emerald-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

// Typical price with average in-stock prices, so the admin sees roughly what customers pay.
function typicalPrice(form, data) {
  if (!data) return null;
  const avg = (type) => {
    const list = poolFor(type, data).filter((o) => o.stock > 0 && o.price > 0);
    return list.length ? list.reduce((s, o) => s + o.price, 0) / list.length : 0;
  };
  const picks = form.slots.map((s) => ({ price: Math.round(avg(s.type)) }));
  return bundlePrice({ slots: form.slots, discountPercent: Number(form.discountPercent) || 0 }, picks);
}

function BundleEditor({ bundle, data }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => toForm(bundle));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Re-sync when the saved bundle changes and there are no unsaved edits.
  const saved = JSON.stringify(toForm(bundle));
  const dirty = JSON.stringify(form) !== saved;
  useEffect(() => {
    if (!dirty) setForm(toForm(bundle));
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSlot = (i, k, v) => setForm((f) => ({ ...f, slots: f.slots.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const moveSlot = (i, d) =>
    setForm((f) => {
      const slots = [...f.slots];
      const j = i + d;
      if (j < 0 || j >= slots.length) return f;
      [slots[i], slots[j]] = [slots[j], slots[i]];
      return { ...f, slots };
    });

  const save = async () => {
    const discount = Number(form.discountPercent);
    if (!form.title.trim()) return toast.error("Give the bundle a title.");
    if (!form.slots.length) return toast.error("Add at least one item box.");
    if (!Number.isFinite(discount) || discount < 0 || discount > 90) return toast.error("Discount must be between 0 and 90%.");
    if (form.slots.every((s) => s.free)) return toast.error("At least one item must be paid.");
    setSaving(true);
    try {
      await updateDoc(doc(db, BUNDLES, bundle.id), {
        title: form.title.trim(),
        badge: form.badge.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        image: form.image,
        discountPercent: discount,
        order: Number(form.order) || 0,
        slots: form.slots.map((s, i) => ({
          type: s.type,
          label: s.label.trim() || `${SLOT_TYPES.find((t) => t.value === s.type)?.label || "Item"} ${i + 1}`,
          free: !!s.free,
        })),
        updatedAt: new Date(),
      });
      toast.success("Bundle saved.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save the bundle.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (next) => {
    if (next) {
      if (dirty) return toast.error("Save your changes first.");
      const ok = await confirmDialog({
        title: "Publish this bundle?",
        message: "It will appear at the top of the homepage and the products page right away.",
        confirmText: "Publish",
      });
      if (!ok) return;
    }
    try {
      await updateDoc(doc(db, BUNDLES, bundle.id), { published: next });
      toast.success(next ? "Bundle is live on the site." : "Bundle hidden from the site.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update the bundle.");
    }
  };

  const remove = async () => {
    if (!(await confirmDialog({ title: "Delete bundle?", message: `Delete "${bundle.title}"? Past orders keep their details.`, confirmText: "Delete" }))) return;
    try {
      await deleteDoc(doc(db, BUNDLES, bundle.id));
      toast.success("Bundle deleted.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete the bundle.");
    }
  };

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      set("image", await uploadImage(file));
      toast.info("Photo uploaded — press Save to keep it.");
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const typical = typicalPrice(form, data);

  return (
    <div className={`rounded-2xl border bg-white ${bundle.published ? "border-emerald-200" : "border-gray-200"}`}>
      <div className="flex items-center gap-3 p-3 md:p-4">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-[#1C3C85] to-[#3E63B8] flex items-center justify-center flex-shrink-0">
          {bundle.image ? <img src={bundle.image} alt="" className="w-full h-full object-cover" /> : <Gift className="w-6 h-6 text-white/70" />}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="flex-1 min-w-0 text-left">
          <p className="font-black text-sm uppercase tracking-tight text-gray-900 truncate">{bundle.title || "Untitled bundle"}</p>
          <p className="text-xs text-gray-500 truncate">
            <span className={`font-bold ${bundle.published ? "text-emerald-600" : "text-gray-500"}`}>{bundle.published ? "Published" : "Unpublished"}</span>
            {offerLine(bundle) && ` · ${offerLine(bundle)}`}
          </p>
        </button>
        <a
          href={`/bundles/${bundle.id}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
          title="Preview"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Preview
        </a>
        <Switch checked={!!bundle.published} onChange={togglePublished} label="Published" />
        <button onClick={() => setOpen((o) => !o)} className="p-1.5 text-gray-400" aria-label={open ? "Collapse" : "Edit"}>
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="border-t p-4 md:p-5 space-y-5">
          <div className="grid md:grid-cols-[200px_1fr] gap-5">
            {/* Cover photo */}
            <div>
              <label className={labelCls}>Cover photo</label>
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-[#0F2557] to-[#3E63B8] flex items-center justify-center">
                {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : <Gift className="w-8 h-8 text-white/50" />}
                {form.image && (
                  <button onClick={() => set("image", "")} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white" aria-label="Remove photo">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <label className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:border-[#1C3C85] cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {uploading ? "Uploading…" : form.image ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" onChange={onImage} className="hidden" disabled={uploading} />
              </label>
              <p className="text-[10px] text-gray-400 mt-1">Landscape works best (16:10). Without a photo the card shows a designed placeholder.</p>
            </div>

            {/* Text */}
            <div className="space-y-3">
              <div className="grid sm:grid-cols-[1fr_140px] gap-3">
                <div>
                  <label className={labelCls}>Title</label>
                  <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls + " font-bold"} />
                </div>
                <div>
                  <label className={labelCls}>Badge</label>
                  <input value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="BEST VALUE" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Short line (on the card)</label>
                <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Explanation (on the bundle page)</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className={inputCls} />
                <p className="text-[10px] text-gray-400 mt-1">Leave an empty line between paragraphs.</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Item boxes</label>
              <button
                onClick={() => setForm((f) => ({ ...f, slots: [...f.slots, { type: "perfume", label: "", free: false }] }))}
                className="flex items-center gap-1 text-xs font-bold text-[#1C3C85]"
              >
                <Plus className="w-3.5 h-3.5" /> Add box
              </button>
            </div>
            <ul className="space-y-2">
              {form.slots.map((s, i) => (
                <li key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <select value={s.type} onChange={(e) => setSlot(i, "type", e.target.value)} className={inputCls + " sm:w-32"}>
                    {SLOT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input value={s.label} onChange={(e) => setSlot(i, "label", e.target.value)} placeholder="Box label, e.g. Perfume 1" className={inputCls + " flex-1 min-w-[140px]"} />
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 px-2 whitespace-nowrap">
                    <input type="checkbox" checked={s.free} onChange={(e) => setSlot(i, "free", e.target.checked)} className="w-4 h-4 accent-[#D4A84F]" /> Free
                  </label>
                  <div className="flex">
                    <button onClick={() => moveSlot(i, -1)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-label="Move up">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveSlot(i, 1)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-label="Move down">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => setForm((f) => ({ ...f, slots: f.slots.filter((_, j) => j !== i) }))} className="p-1.5 text-gray-400 hover:text-red-600" aria-label="Remove box">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-gray-400 mt-1.5">Perfume boxes list your "Perfumes" categories, Oil boxes the "Oils" category, Musk boxes the "Musk" category (main size), and Tester boxes the Discovery Set samples.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className={labelCls}>Discount on paid items (%)</label>
              <input type="number" min="0" max="90" value={form.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Display order</label>
              <input type="number" value={form.order} onChange={(e) => set("order", e.target.value)} className={inputCls} />
            </div>
            {typical && typical.original > 0 && (
              <div className="rounded-xl bg-[#1C3C85]/5 border border-[#1C3C85]/10 p-2.5 text-xs text-[#1C3C85]">
                Typical: <b>EGP {typical.price.toLocaleString()}</b> <span className="text-gray-500">instead of {typical.original.toLocaleString()} (save ~{Math.round((typical.saving / typical.original) * 100)}%)</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-between border-t pt-4">
            <button onClick={remove} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete bundle
            </button>
            <div className="flex gap-2">
              {dirty && (
                <button onClick={() => setForm(toForm(bundle))} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">
                  Discard
                </button>
              )}
              <button onClick={save} disabled={!dirty || saving} className="px-5 py-2 rounded-lg text-sm font-bold bg-[#1C3C85] text-white hover:bg-blue-800 disabled:opacity-40">
                {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "Bundles" section shown at the top of the admin Products tab.
export default function AdminBundles() {
  const bundles = useBundles();
  const savedHeading = useBundleHeading();
  const [heading, setHeading] = useState(null);
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, c, s] = await Promise.all(["products", "categories", "samples"].map((n) => getDocs(collection(db, n))));
        const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setData({ products: rows(p), categories: rows(c), samples: rows(s) });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const liveCount = useMemo(() => (bundles || []).filter((b) => b.published).length, [bundles]);
  const headingValue = heading ?? savedHeading;

  const create = async (presetKeys) => {
    setAdding(true);
    try {
      const start = (bundles || []).length;
      for (const [i, key] of presetKeys.entries()) {
        const preset = key ? PRESETS[key] : { title: "New bundle", badge: "", tagline: "", description: "", discountPercent: 10, slots: [{ type: "perfume", label: "Perfume", free: false }] };
        await addDoc(collection(db, BUNDLES), { ...preset, image: "", published: false, order: start + i + 1, createdAt: new Date() });
      }
      toast.success(presetKeys.length > 1 ? "Bundles created — unpublished until you switch them on." : "Bundle created (unpublished).");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the bundle.");
    } finally {
      setAdding(false);
    }
  };

  const saveHeading = async () => {
    try {
      await setDoc(BUNDLE_SETTINGS_DOC, { heading: headingValue.trim() || DEFAULT_HEADING }, { merge: true });
      setHeading(null);
      toast.success("Section title saved.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save the title.");
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-[#D4A84F]/40 bg-[#FFFBF2] p-4 md:p-5 font-archivo">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-[#1C3C85] flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#D4A84F]" /> Bundles
          </h2>
          <p className="text-xs text-gray-500">
            {liveCount ? `${liveCount} published — shown above all products on the homepage and products page.` : "Nothing is published — customers don't see any bundles."}
          </p>
        </div>
        {(bundles || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => create(["A"])} disabled={adding} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
              + Perfume, Oil, Tester
            </button>
            <button onClick={() => create(["B"])} disabled={adding} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
              + 2 Perfumes, free extras
            </button>
            <button onClick={() => create([null])} disabled={adding} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
              + Blank
            </button>
          </div>
        )}
      </div>

      {bundles === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : bundles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D4A84F]/60 bg-white p-6 text-center">
          <p className="font-bold text-gray-800">No bundles yet</p>
          <p className="text-sm text-gray-500 mt-1">Create the two Black Friday bundles. They start unpublished, so nothing changes on the site until you switch them on.</p>
          <button onClick={() => create(["B", "A"])} disabled={adding} className="mt-4 px-5 py-2.5 rounded-xl bg-[#1C3C85] text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50">
            {adding ? "Creating…" : "Create the Black Friday bundles"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end mb-4">
            <div className="flex-1">
              <label className={labelCls}>Section title (above the bundle cards)</label>
              <input value={headingValue} onChange={(e) => setHeading(e.target.value)} className={inputCls} />
            </div>
            {heading !== null && heading !== savedHeading && (
              <button onClick={saveHeading} className="px-4 py-2.5 rounded-lg bg-[#1C3C85] text-white text-sm font-bold">
                Save title
              </button>
            )}
          </div>
          <div className="space-y-3">
            {bundles.map((b) => (
              <BundleEditor key={b.id} bundle={b} data={data} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
