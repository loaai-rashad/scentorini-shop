import React from "react";
import { useCountdown, splitDuration } from "../../lib/giveaway";

// Days / hours / minutes / seconds to `target`. Renders `doneLabel` once it passes,
// and nothing when no target is set.
export default function Countdown({ target, doneLabel = "The live draw is on!", compact = false }) {
  const remaining = useCountdown(target);
  if (remaining === null) return null;
  if (remaining <= 0) {
    return <p className={`font-archivo font-black uppercase tracking-widest text-[#D4A84F] ${compact ? "text-sm" : "text-lg md:text-xl"}`}>{doneLabel}</p>;
  }
  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const parts = [
    ["Days", days],
    ["Hours", hours],
    ["Min", minutes],
    ["Sec", seconds],
  ];
  return (
    <div className={`flex ${compact ? "gap-1.5" : "gap-2 md:gap-3"}`} role="timer" aria-live="off">
      {parts.map(([label, value]) => (
        <div
          key={label}
          className={`flex flex-col items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white ${compact ? "w-12 py-1.5" : "w-16 md:w-20 py-2 md:py-3"}`}
        >
          <span className={`font-archivo font-black tabular-nums leading-none ${compact ? "text-lg" : "text-2xl md:text-4xl"}`}>{String(value).padStart(2, "0")}</span>
          <span className={`uppercase tracking-widest text-white/70 font-bold mt-1 ${compact ? "text-[8px]" : "text-[9px] md:text-[10px]"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}
