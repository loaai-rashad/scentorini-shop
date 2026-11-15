import React from "react";
import { Link } from "react-router-dom";
import { Gift, ArrowRight } from "lucide-react";
import { useBundles, useBundleHeading, offerLine, SLOT_TYPES } from "../../lib/bundles";

// What's inside, as chips: "Perfume ×2 · Oil (free) · Tester (free)".
function contents(bundle) {
  const groups = [];
  for (const s of bundle.slots || []) {
    const label = SLOT_TYPES.find((t) => t.value === s.type)?.label || s.label;
    const g = groups.find((x) => x.label === label && x.free === !!s.free);
    if (g) g.count += 1;
    else groups.push({ label, free: !!s.free, count: 1 });
  }
  return groups;
}

export function BundleCard({ bundle, featured = false }) {
  return (
    <Link
      to={`/bundles/${bundle.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white transition-all hover:-translate-y-1 hover:shadow-xl ${
        featured ? "border-[#D4A84F] ring-2 ring-[#D4A84F]/30" : "border-gray-200"
      }`}
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-[#0F2557] via-[#1C3C85] to-[#3E63B8] overflow-hidden">
        {bundle.image ? (
          <img src={bundle.image} alt={bundle.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          // Designed placeholder until a cover photo is uploaded in the admin.
          <div className="absolute inset-0 flex items-center justify-center gap-3 px-6">
            {(bundle.slots || []).map((s, i) => (
              <div
                key={i}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed ${s.free ? "border-[#D4A84F] text-[#D4A84F]" : "border-white/50 text-white"} w-16 h-20 md:w-20 md:h-24`}
              >
                <Gift className="w-5 h-5 opacity-80" />
                <span className="mt-1 text-[9px] font-black uppercase tracking-widest">{s.free ? "Free" : SLOT_TYPES.find((t) => t.value === s.type)?.label}</span>
              </div>
            ))}
          </div>
        )}
        {bundle.badge && (
          <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow ${featured ? "bg-[#D4A84F] text-white" : "bg-white text-[#1C3C85]"}`}>
            {bundle.badge}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 md:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D4A84F]">{offerLine(bundle)}</p>
        <h3 className="mt-1 text-xl md:text-2xl font-archivo font-black uppercase tracking-tight text-[#1C3C85] leading-tight">{bundle.title}</h3>
        {bundle.tagline && <p className="mt-2 text-sm text-gray-600">{bundle.tagline}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {contents(bundle).map((g) => (
            <span
              key={g.label + g.free}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${g.free ? "bg-[#D4A84F]/10 border-[#D4A84F]/40 text-[#8A6420]" : "bg-gray-50 border-gray-200 text-gray-600"}`}
            >
              {g.label}
              {g.count > 1 ? ` ×${g.count}` : ""}
              {g.free ? " · free" : ""}
            </span>
          ))}
        </div>
        <span className="mt-5 inline-flex items-center justify-center gap-2 self-start px-6 py-3 rounded-full bg-[#1C3C85] text-white text-xs font-black uppercase tracking-widest group-hover:bg-[#142d63]">
          Build your bundle <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

// Section shown at the top of the homepage and the products page.
// Renders nothing until at least one bundle is published in the admin.
export default function BundlesShowcase({ className = "" }) {
  const bundles = useBundles();
  const heading = useBundleHeading();
  const live = (bundles || []).filter((b) => b.published);
  if (!live.length) return null;
  // The bundle with free items is the "best value" one: show it first and highlighted.
  const featuredId = live.find((b) => (b.slots || []).some((s) => s.free))?.id;
  const ordered = featuredId ? [live.find((b) => b.id === featuredId), ...live.filter((b) => b.id !== featuredId)] : live;

  return (
    <section className={`max-w-7xl mx-auto ${className}`}>
      <div className="text-center mb-6 md:mb-8">
        <span className="block text-[11px] md:text-xs font-archivo font-bold uppercase tracking-[0.3em] text-[#D4A84F] mb-2">Limited-time offer</span>
        <h2 className="text-3xl md:text-4xl font-archivo font-black uppercase tracking-tight text-[#1C3C85]">{heading}</h2>
      </div>
      <div className={`grid gap-5 md:gap-6 ${ordered.length > 1 ? "md:grid-cols-2" : "max-w-xl mx-auto"}`}>
        {ordered.map((b) => (
          <BundleCard key={b.id} bundle={b} featured={b.id === featuredId && ordered.length > 1} />
        ))}
      </div>
    </section>
  );
}
