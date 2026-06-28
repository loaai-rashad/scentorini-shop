import React from "react";
import { Truck, BadgeCheck, Sparkles, FlaskConical } from "lucide-react";

// Thin strip of trust signals shown just under the hero.
const ITEMS = [
  { icon: Truck, title: "Fast Delivery", text: "Shipping across Egypt" },
  { icon: BadgeCheck, title: "Authentic Scents", text: "100% genuine fragrances" },
  { icon: Sparkles, title: "Long-Lasting", text: "Scents that stay all day" },
  { icon: FlaskConical, title: "Discovery Sets", text: "Try before you commit" },
];

export default function TrustBar() {
  return (
    <section className="border-y border-gray-100 bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-7 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center justify-center lg:justify-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-full bg-[#1C3C85]/10 text-[#1C3C85]">
              <Icon className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-xs md:text-sm font-archivo font-black uppercase tracking-tight text-gray-800">
                {title}
              </p>
              <p className="text-[11px] md:text-xs text-gray-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
