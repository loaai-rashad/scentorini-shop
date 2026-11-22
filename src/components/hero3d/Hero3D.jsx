// Homepage hero with the interactive 3D bottle.
// Text and buttons render immediately; the 3D scene (three.js) loads in its own
// chunk afterwards. Devices without WebGL get the product photo instead, and the
// scene pauses while the hero is scrolled out of view.

import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Hand } from "lucide-react";
import { HERO_SCENTS } from "./heroScents";

const BottleScene = lazy(() => import("./BottleScene"));
const CYCLE_MS = 6500;

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

// Phones with few cores / little memory start on the lighter glass.
function startQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  return cores <= 4 || mem <= 3 ? "low" : "high";
}

function Fallback({ scent }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img src={scent.photo} alt={scent.name} className="h-[85%] w-auto max-w-[85%] object-contain rounded-3xl shadow-xl" />
    </div>
  );
}

export default function Hero3D() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [canRender] = useState(() => typeof window !== "undefined" && supportsWebGL());
  // ?hero3dq=high|low pins the quality (handy for checking either look on any device).
  const [forcedQuality] = useState(() => {
    const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("hero3dq") : null;
    return q === "high" || q === "low" ? q : null;
  });
  const [quality] = useState(() => forcedQuality || (typeof navigator !== "undefined" ? startQuality() : "high"));
  const [reducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  const sectionRef = useRef(null);

  // Pause rendering when the hero is off screen (battery + smooth scrolling).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Cycle through the scents; a drag or a tap on a scent pauses it for a while.
  useEffect(() => {
    if (paused || !visible || reducedMotion) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % HERO_SCENTS.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [paused, visible, reducedMotion]);
  useEffect(() => {
    if (!paused) return undefined;
    const t = setTimeout(() => setPaused(false), 15000);
    return () => clearTimeout(t);
  }, [paused]);

  const scent = HERO_SCENTS[index];

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-[#e8e8ea] md:h-[80vh] md:min-h-[560px] md:max-h-[860px]"
    >
      <div className="max-w-7xl mx-auto h-full grid md:grid-cols-[1fr_1.1fr] items-center">
        {/* 3D bottle (first on phones) */}
        <div
          className="relative order-1 md:order-2 h-[56vh] min-h-[360px] md:h-full touch-pan-y"
          onPointerDown={() => setPaused(true)}
          aria-label={`3D ${scent.name} bottle — drag to turn it`}
          role="img"
        >
          {canRender ? (
            <Suspense fallback={<Fallback scent={scent} />}>
              <BottleScene scentIndex={index} active={visible} reducedMotion={reducedMotion} initialQuality={quality} lockQuality={!!forcedQuality} onReady={() => setReady(true)} />
            </Suspense>
          ) : (
            <Fallback scent={scent} />
          )}
          {canRender && ready && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-archivo font-bold uppercase tracking-[0.25em] text-[#1C3C85]/60">
              <Hand className="w-3.5 h-3.5" /> Drag to explore
            </span>
          )}
        </div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="order-2 md:order-1 px-6 md:pl-12 lg:pl-16 pb-10 md:pb-0 text-center md:text-left"
        >
          <span className="block text-[11px] md:text-sm font-archivo font-bold uppercase tracking-[0.35em] text-[#1C3C85]/60 mb-3 md:mb-4">
            Santorini-Inspired Fragrances
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-archivo font-black uppercase tracking-tight text-[#1C3C85] leading-[0.95]">
            Find Your
            <br />
            Signature Scent
          </h1>
          <p className="mt-4 md:mt-5 text-base md:text-xl text-gray-600 font-light">Not just a perfume, a destination.</p>

          {/* Current scent */}
          <div className="mt-6 md:mt-8 inline-flex flex-col items-center md:items-start gap-3">
            <div className="flex gap-2" role="tablist" aria-label="Choose a scent">
              {HERO_SCENTS.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === index}
                  onClick={() => {
                    setIndex(i);
                    setPaused(true);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-archivo font-black uppercase tracking-widest border transition ${
                    i === index ? "bg-[#1C3C85] text-white border-[#1C3C85]" : "bg-white/70 text-[#1C3C85] border-[#1C3C85]/20 hover:border-[#1C3C85]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 max-w-sm">{scent.notes}</p>
            <Link
              to={`/products/${scent.id}`}
              className="inline-flex items-center gap-2 text-sm font-archivo font-black uppercase tracking-widest text-[#1C3C85] hover:gap-3 transition-all"
            >
              Shop {scent.name} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 mt-7 md:mt-9">
            <button
              onClick={() => navigate("/products?gender=Her")}
              className="px-8 md:px-10 py-3 md:py-4 text-sm md:text-base font-archivo font-black uppercase tracking-widest text-white bg-[#1C3C85] rounded-full shadow-xl hover:bg-[#142d63] transition duration-300 hover:scale-105 active:scale-95"
            >
              For Her
            </button>
            <button
              onClick={() => navigate("/products?gender=Him")}
              className="px-8 md:px-10 py-3 md:py-4 text-sm md:text-base font-archivo font-black uppercase tracking-widest text-[#1C3C85] bg-white rounded-full shadow-xl hover:bg-gray-50 transition duration-300 hover:scale-105 active:scale-95 border border-[#1C3C85]/20"
            >
              For Him
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
