import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion'; // 1. Import motion

export default function ReviewSlider({ title = null, reviews }) {
  const trackRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Enables/disables the arrows depending on where the track is scrolled.
  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [reviews, updateArrows]);

  // Arrow buttons move by roughly one screen of cards.
  const scrollByPage = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Click-and-drag scrolling for mouse users (touch keeps its native swipe).
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, startScroll: trackRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      setDragging(true);
      trackRef.current.setPointerCapture(e.pointerId);
    }
    if (d.moved) trackRef.current.scrollLeft = d.startScroll - dx;
  };
  const endDrag = (e) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    if (trackRef.current.hasPointerCapture?.(e.pointerId)) trackRef.current.releasePointerCapture(e.pointerId);
  };

  if (!reviews || reviews.length === 0) return null;
  const PADDING_CLASSES = "px-4 sm:px-8 lg:px-12";

  // Animation variants for the container and children
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1, // Each review card will pop up 0.1s after the previous one
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <motion.section 
      className="my-10"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {title && (
        <h2 className={`text-2xl font-archivo font-black uppercase text-center mb-6 tracking-tighter text-[#1C3C85] pb-4 ${PADDING_CLASSES}`}>
          {title}
        </h2>
      )}

      <div className="relative group">
      <div
        ref={trackRef}
        onScroll={updateArrows}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        className={`overflow-x-scroll no-scrollbar select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollbarWidth: 'none' }}
      >
        <motion.div className={`flex ${PADDING_CLASSES} space-x-6 pb-6`}>
          {reviews.map((rev) => (
            <motion.div 
              key={rev.id} 
              variants={cardVariants}
              className="flex-none w-72 md:w-80 bg-white border border-stone-100 p-6 rounded-2xl shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < rev.rating ? "#1C3C85" : "none"} color="#1C3C85" />
                    ))}
                    </div>
                    
                    {rev.productName && (
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-1 rounded-md border border-stone-100">
                            {rev.productName}
                        </span>
                    )}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed font-medium italic mb-4">"{rev.comment}"</p>
              </div>
              <div className="flex items-center gap-3 border-t border-stone-50 pt-4">
                <div className="w-10 h-10 rounded-full bg-[#1C3C85] text-white flex items-center justify-center font-black text-xs">
                  {rev.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{rev.name}</h4>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Verified Buyer</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Arrows — hidden on small screens where swiping is natural */}
      {[
        { dir: -1, enabled: canPrev, Icon: ChevronLeft, pos: 'left-2 lg:left-4', label: 'Previous reviews' },
        { dir: 1, enabled: canNext, Icon: ChevronRight, pos: 'right-2 lg:right-4', label: 'Next reviews' },
      ].map(({ dir, enabled, Icon, pos, label }) => (
        <button
          key={dir}
          type="button"
          onClick={() => scrollByPage(dir)}
          disabled={!enabled}
          aria-label={label}
          className={`hidden md:flex absolute top-1/2 -translate-y-1/2 -mt-3 ${pos} w-11 h-11 items-center justify-center rounded-full bg-white border border-stone-200 text-[#1C3C85] shadow-md hover:bg-[#1C3C85] hover:text-white transition-all disabled:opacity-0 disabled:pointer-events-none`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
      </div>
    </motion.section>
  );
}