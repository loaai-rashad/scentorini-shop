// src/pages/BundlePage.jsx — build a bundle at /bundles/:id.
// Unpublished bundles redirect to /products; admins can preview them with ?preview=1.

import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { Plus, X, Check, Search, Gift, ShoppingBag, RefreshCw } from "lucide-react";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { setPageMeta } from "../lib/seo";
import { BUNDLES, poolFor, bundlePrice, stockNeeds, offerLine, SLOT_TYPES } from "../lib/bundles";
import LoadingScreen from "../components/LoadingScreen";

const egp = (n) => `EGP ${Math.round(n || 0).toLocaleString()}`;

function Thumb({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#E9EEF8] to-[#C9D6F2] text-[#1C3C85] ${className}`}>
        <Gift className="w-6 h-6 opacity-60" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

function Picker({ slot, options, used, current, onPick, onClose }) {
  const [q, setQ] = useState("");
  const list = q ? options.filter((o) => `${o.title} ${o.subtitle}`.toLowerCase().includes(q.toLowerCase())) : options;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1500] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Choose ${slot.label}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Choose your</p>
            <h3 className="text-lg font-archivo font-black uppercase tracking-tight text-[#1C3C85]">
              {slot.label} {slot.free && <span className="ml-1 text-xs text-[#D4A84F]">· free</span>}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {options.length > 6 && (
          <div className="px-5 pt-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full pl-9 pr-3 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-[#1C3C85]/20" />
            </div>
          </div>
        )}
        <ul className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
          {list.map((o) => {
            // Stock left after this item's other picks in the bundle (same perfume twice is allowed).
            const left = o.stock - (used[o.key] || 0) + (current?.key === o.key ? 1 : 0);
            const disabled = left <= 0;
            const selected = current?.key === o.key;
            return (
              <li key={o.key}>
                <button
                  onClick={() => !disabled && onPick(o)}
                  disabled={disabled}
                  className={`w-full text-left rounded-2xl border-2 overflow-hidden transition ${
                    selected ? "border-[#1C3C85] ring-2 ring-[#1C3C85]/20" : "border-gray-100 hover:border-[#1C3C85]/50"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Thumb src={o.image} alt={o.title} className="w-full aspect-square" />
                  <div className="p-2.5">
                    <p className="font-black text-xs uppercase tracking-tight text-gray-900 leading-tight">{o.title}</p>
                    {o.subtitle && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{o.subtitle}</p>}
                    <p className="mt-1 text-xs font-black">
                      {slot.free ? (
                        <>
                          <span className="text-[#D4A84F]">FREE</span> <span className="text-gray-400 line-through font-bold">{egp(o.price)}</span>
                        </>
                      ) : (
                        <span className="text-[#1C3C85]">{egp(o.price)}</span>
                      )}
                    </p>
                    {disabled ? (
                      <p className="text-[10px] font-bold text-red-600 uppercase">Sold out</p>
                    ) : left <= 3 ? (
                      <p className="text-[10px] font-bold text-amber-600">Only {left} left</p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="col-span-full text-center text-sm text-gray-500 py-8">Nothing available right now.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function BundlePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const isAdmin = (() => {
    try {
      return localStorage.getItem("isAdmin") === "true";
    } catch {
      return false;
    }
  })();
  const preview = isAdmin && params.get("preview") === "1";

  const [bundle, setBundle] = useState(undefined); // undefined = loading, null = missing
  const [data, setData] = useState(null); // { products, categories, samples }
  const [picks, setPicks] = useState([]);
  const [openSlot, setOpenSlot] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        doc(db, BUNDLES, id),
        (snap) => setBundle(snap.exists() ? { id: snap.id, ...snap.data() } : null),
        () => setBundle(null)
      ),
    [id]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c, s] = await Promise.all(["products", "categories", "samples"].map((name) => getDocs(collection(db, name))));
        const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!cancelled) setData({ products: rows(p), categories: rows(c), samples: rows(s) });
      } catch (e) {
        console.error("Bundle data:", e);
        if (!cancelled) setData({ products: [], categories: [], samples: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slots = bundle?.slots || [];
  // Keep picks aligned with the slots if the admin edits the bundle while it's open.
  useEffect(() => setPicks((prev) => slots.map((_, i) => prev[i] || null)), [slots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bundle) setPageMeta({ title: `${bundle.title} | Scentorini`, description: bundle.tagline || offerLine(bundle) });
  }, [bundle]);

  const pools = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(SLOT_TYPES.map((t) => [t.value, poolFor(t.value, data)]));
  }, [data]);

  if (bundle === undefined || !data) return <LoadingScreen />;
  if (!bundle || (!bundle.published && !preview)) return <Navigate to="/products" replace />;

  const used = stockNeeds(picks);
  const complete = slots.length > 0 && picks.length === slots.length && picks.every(Boolean);
  const { original, price, saving } = bundlePrice(bundle, picks);
  const paragraphs = String(bundle.description || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const pick = (option) => {
    setPicks((prev) => prev.map((p, i) => (i === openSlot ? option : p)));
    setOpenSlot(null);
    setAdded(false);
  };

  const addBundle = () => {
    if (!complete) return;
    const firstImage = picks.find((p) => p.image)?.image || "";
    addToCart({
      // Unique per add: two identical bundles are two cart lines, each quantity 1.
      id: `bundle_${bundle.id}_${Date.now().toString(36)}`,
      isBundle: true,
      bundleId: bundle.id,
      title: bundle.title,
      price,
      originalPrice: original,
      stock: 1,
      image: bundle.image || firstImage,
      components: picks.map((p, i) => ({
        kind: p.kind, // "product" | "sample"
        id: p.id,
        title: p.size ? `${p.title} (${p.size})` : p.title, // orders show e.g. "Musk Powder (0.25 tola - 3 gm)"
        price: p.price,
        free: !!slots[i].free,
        slot: slots[i].label,
        image: p.image || "",
      })),
    });
    setAdded(true);
    setPicks(slots.map(() => null));
  };

  return (
    <div className="font-archivo bg-gray-50 min-h-screen pb-16">
      {preview && !bundle.published && (
        <div className="bg-amber-100 text-amber-800 text-center text-xs font-bold uppercase tracking-widest py-2 px-4">
          Preview — this bundle is hidden from customers until you publish it in the dashboard
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr] items-start">
        {/* Explanation */}
        <section>
          <div className="relative rounded-3xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-[#0F2557] via-[#1C3C85] to-[#3E63B8]">
            {bundle.image ? (
              <img src={bundle.image} alt={bundle.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Gift className="w-16 h-16 text-white/40" />
              </div>
            )}
            {bundle.badge && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#D4A84F] text-white text-[10px] font-black uppercase tracking-widest shadow">{bundle.badge}</span>
            )}
          </div>
          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#D4A84F]">{offerLine(bundle)}</p>
          <h1 className="mt-1 text-3xl md:text-4xl font-black uppercase tracking-tight text-[#1C3C85] leading-tight">{bundle.title}</h1>
          {bundle.tagline && <p className="mt-3 text-gray-600">{bundle.tagline}</p>}
          <div className="mt-5 space-y-3 text-sm text-gray-700 leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex gap-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" /> Mix and match — the same perfume twice is fine.
            </li>
            <li className="flex gap-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" /> Testers are single bottles from our Discovery Set.
            </li>
            <li className="flex gap-2 text-gray-500">
              <Check className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /> Bundle prices can't be combined with promo codes.
            </li>
          </ul>
        </section>

        {/* Builder */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 md:p-7 lg:sticky lg:top-28">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#1C3C85]">Build your bundle</h2>
          <p className="text-xs text-gray-500 mt-1">Tap a box to choose.</p>

          <div className={`mt-4 grid gap-3 ${slots.length > 3 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
            {slots.map((slot, i) => {
              const p = picks[i];
              return (
                <button
                  key={i}
                  onClick={() => setOpenSlot(i)}
                  className={`relative text-left rounded-2xl border-2 p-3 transition min-h-[132px] flex flex-col ${
                    p ? "border-[#1C3C85] bg-[#1C3C85]/[0.03]" : "border-dashed border-gray-300 hover:border-[#1C3C85] bg-gray-50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{slot.label}</span>
                    {slot.free && <span className="px-2 py-0.5 rounded-full bg-[#D4A84F] text-white text-[9px] font-black uppercase tracking-widest">Free</span>}
                  </span>
                  {p ? (
                    <span className="mt-2 flex gap-3 items-center">
                      <Thumb src={p.image} alt={p.title} className="w-14 h-14 rounded-xl flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-black text-sm uppercase tracking-tight text-gray-900 leading-tight">{p.title}</span>
                        <span className="block text-xs font-bold mt-0.5">
                          {slot.free ? (
                            <>
                              <span className="text-[#D4A84F]">FREE</span> <span className="text-gray-400 line-through">{egp(p.price)}</span>
                            </>
                          ) : (
                            <span className="text-[#1C3C85]">{egp(p.price)}</span>
                          )}
                        </span>
                        <span className="block text-[10px] text-gray-400 font-bold uppercase mt-1 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Change
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <Plus className="w-7 h-7" />
                      <span className="text-[11px] font-bold mt-1">Choose {SLOT_TYPES.find((t) => t.value === slot.type)?.label.toLowerCase() || "item"}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Price */}
          <div className="mt-6 border-t pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Items' regular price</span>
              <span className={saving > 0 ? "line-through" : ""}>{egp(original)}</span>
            </div>
            {saving > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>You save</span>
                <span>−{egp(saving)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-black uppercase text-gray-800">Bundle price</span>
              <span className="text-3xl font-black text-[#1C3C85]">{egp(price)}</span>
            </div>
          </div>

          <button
            onClick={addBundle}
            disabled={!complete}
            className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#1C3C85] text-white font-black uppercase tracking-widest text-sm hover:bg-[#142d63] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            {complete ? `Add bundle · ${egp(price)}` : `Choose ${picks.filter((p) => !p).length || slots.length} more`}
          </button>

          {added && (
            <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              <p className="font-bold flex items-center gap-2">
                <Check className="w-4 h-4" /> Bundle added to your bag!
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => navigate("/checkout")} className="px-4 py-2 rounded-full bg-[#1C3C85] text-white text-xs font-black uppercase tracking-widest">
                  Checkout
                </button>
                <Link to="/products" className="px-4 py-2 rounded-full border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-widest">
                  Keep shopping
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      {openSlot !== null && slots[openSlot] && (
        <Picker
          slot={slots[openSlot]}
          options={pools[slots[openSlot].type] || []}
          used={used}
          current={picks[openSlot]}
          onPick={pick}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}
