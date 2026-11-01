import React, { memo, useEffect, useRef } from "react";
import { IDLE_DEG_PER_SEC } from "../../lib/giveaway";

// Brand-led palette; alternates so neighbouring slices never share a colour.
const COLORS = ["#1C3C85", "#E9EEF8", "#3E63B8", "#F6E7C8", "#0F2557", "#C9D6F2", "#D4A84F", "#FFFFFF"];
const TEXT_ON = { "#1C3C85": "#fff", "#3E63B8": "#fff", "#0F2557": "#fff", "#D4A84F": "#1b1b1b" };

const R = 200; // radius in viewBox units
const C = 210; // centre (viewBox is 420×420 to leave room for the rim)

const point = (deg, r) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
};

function slicePath(i, count) {
  if (count === 1) return null; // full circle drawn separately
  const a = 360 / count;
  const [x1, y1] = point(i * a, R);
  const [x2, y2] = point((i + 1) * a, R);
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The giveaway wheel. Slice i covers [i·360/n, (i+1)·360/n] clockwise from the top,
 * matching angleFor() in lib/giveaway.js.
 *
 * Motion is applied straight to the DOM (no React re-render per frame):
 *  - `idle`: turns slowly on its own.
 *  - `spinCmd` { id, angle, ms }: from wherever it is now, spins forward and stops
 *    at `angle` (mod 360) — so every screen lands on the same slice. ms = 0 jumps there.
 */
function Wheel({ names = [], spinCmd = null, idle = false, highlightKey = null }) {
  const gRef = useRef(null);
  const rot = useRef(0);

  const apply = (deg, transition) => {
    rot.current = deg;
    if (!gRef.current) return;
    gRef.current.style.transition = transition;
    gRef.current.style.transform = `rotate(${deg}deg)`;
  };

  // Live spin (or jump to a finished one).
  useEffect(() => {
    if (!spinCmd) return;
    const cur = rot.current;
    const delta = (((spinCmd.angle - (cur % 360)) % 360) + 360) % 360;
    if (spinCmd.ms > 0) {
      apply(cur + delta + 8 * 360, `transform ${spinCmd.ms}ms cubic-bezier(0.12, 0.7, 0.08, 1)`);
    } else {
      apply(cur + delta, "none");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinCmd?.id]);

  // Gentle idle rotation.
  useEffect(() => {
    if (!idle || reducedMotion()) return undefined;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(100, now - last); // don't jump after a background tab
      last = now;
      apply(rot.current + (IDLE_DEG_PER_SEC * dt) / 1000, "none");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [idle]);

  const count = names.length;
  const a = count ? 360 / count : 360;
  // Room for a label = arc width at 70% radius; below ~7 units text is unreadable.
  const labelRoom = count ? (2 * Math.PI * R * 0.7) / count : 0;
  const showLabels = count > 0 && labelRoom >= 7;
  const fontSize = Math.max(7, Math.min(17, labelRoom * 0.75));
  const maxChars = count > 40 ? 12 : count > 16 ? 16 : 20;

  return (
    <div className="relative w-full max-w-[520px] aspect-square mx-auto select-none">
      {/* Pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 drop-shadow-md" aria-hidden="true">
        <svg width="34" height="40" viewBox="0 0 34 40">
          <path d="M17 40 L2 6 Q17 -4 32 6 Z" fill="#D4A84F" stroke="#fff" strokeWidth="2.5" />
        </svg>
      </div>

      <svg viewBox="0 0 420 420" className="w-full h-full" role="img" aria-label={`Giveaway wheel with ${count} names`}>
        <circle cx={C} cy={C} r={R + 8} fill="#0F2557" />
        {/* rotation is set only by apply() above, never by React, so re-renders can't interrupt a spin */}
        <g ref={gRef} style={{ transformOrigin: `${C}px ${C}px` }}>
          {count === 0 && <circle cx={C} cy={C} r={R} fill="#E9EEF8" />}
          {count === 1 && <circle cx={C} cy={C} r={R} fill={COLORS[0]} />}
          {count > 1 &&
            names.map((n, i) => {
              // With an odd count the last slice would touch the first in the same colour.
              const color = COLORS[(i === count - 1 && count % COLORS.length === 1 ? i + 1 : i) % COLORS.length];
              return (
                <path
                  key={n.key}
                  d={slicePath(i, count)}
                  fill={color}
                  stroke={n.key === highlightKey ? "#D4A84F" : "#ffffff"}
                  strokeWidth={n.key === highlightKey ? 4 : count > 120 ? 0.3 : 1}
                />
              );
            })}
          {showLabels &&
            names.map((n, i) => {
              const color = count === 1 ? COLORS[0] : COLORS[(i === count - 1 && count % COLORS.length === 1 ? i + 1 : i) % COLORS.length];
              const label = n.name.length > maxChars ? n.name.slice(0, maxChars - 1) + "…" : n.name;
              return (
                <g key={`t-${n.key}`} transform={`rotate(${count === 1 ? 0 : (i + 0.5) * a} ${C} ${C})`}>
                  <text
                    x={C}
                    y={C - R + 14}
                    transform={`rotate(90 ${C} ${C - R + 14})`}
                    fill={TEXT_ON[color] || "#1C3C85"}
                    fontSize={fontSize}
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    dominantBaseline="middle"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
        </g>
        {/* Hub */}
        <circle cx={C} cy={C} r={34} fill="#fff" stroke="#D4A84F" strokeWidth="4" />
        <text x={C} y={C + 1} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="900" fill="#1C3C85" fontFamily="system-ui, sans-serif" letterSpacing="1">
          {count || "–"}
        </text>
        {count === 0 && (
          <text x={C} y={C + 70} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1C3C85" fontFamily="system-ui, sans-serif">
            Be the first to join
          </text>
        )}
      </svg>
    </div>
  );
}

export default memo(Wheel);
