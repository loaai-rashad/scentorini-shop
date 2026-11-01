import React from "react";
import { Link } from "react-router-dom";
import { useGiveawaySettings } from "../../lib/giveaway";
import Countdown from "./Countdown";

// Homepage teaser for the lucky-wheel giveaway. Renders nothing unless the
// giveaway is switched on in the admin dashboard.
export default function GiveawayBanner() {
  const settings = useGiveawaySettings();
  if (!settings?.visible) return null;

  return (
    <section className="px-4 md:px-8 pt-10 md:pt-14 max-w-7xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-[#0F2557] via-[#1C3C85] to-[#3E63B8] text-white px-6 md:px-12 py-8 md:py-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
        <div className="flex-1">
          <span className="block text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-[#D4A84F] mb-2">Lucky Wheel Giveaway</span>
          <h2 className="text-2xl md:text-4xl font-archivo font-black uppercase tracking-tight leading-tight">{settings.title || "Scentorini Giveaway"}</h2>
          {settings.prizeText && <p className="mt-2 text-white/85 text-sm md:text-base max-w-lg">{settings.prizeText}</p>}
        </div>
        <div className="flex flex-col items-center gap-4">
          {settings.drawAt && <Countdown target={settings.drawAt} compact doneLabel="Live draw now!" />}
          <Link
            to="/lucky-wheel"
            className="px-8 py-3 bg-white text-[#1C3C85] font-archivo font-black uppercase tracking-widest text-xs md:text-sm rounded-full shadow-lg hover:bg-[#D4A84F] hover:text-white transition-all"
          >
            Join the giveaway
          </Link>
        </div>
      </div>
    </section>
  );
}
