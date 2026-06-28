import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "framer-motion";

export default function HeroBanner() {
  const navigate = useNavigate();

  // State for the dynamic hero data
  // Default is your local image in case Firebase is loading
  const [heroData, setHeroData] = useState({ imageUrl: "/images/eid.jpeg" });
  const [imgLoaded, setImgLoaded] = useState(false);

  // Listen to Firebase "siteSettings/hero" document in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "siteSettings", "hero"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Only swap the image if a real URL was saved, otherwise keep the default
        if (data.imageUrl) {
          setHeroData(data);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleFilterNavigation = (gender) => {
    navigate(`/products?gender=${gender}`);
  };

  return (
    <section className="relative w-full h-[78vh] min-h-[520px] max-h-[820px] overflow-hidden bg-[#1C3C85]">
      {/* The Dynamic Background Image from Dashboard */}
      <img
        src={heroData.imageUrl}
        alt="Scentorini Featured Collection"
        fetchPriority="high"
        onLoad={() => setImgLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
          imgLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Gradient overlay — keeps the image bright while making text pop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <span className="block text-[11px] md:text-sm font-archivo font-bold uppercase tracking-[0.35em] text-white/80 mb-4">
            Santorini-Inspired Fragrances
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-archivo font-black uppercase tracking-tight text-white leading-[0.95] drop-shadow-lg">
            Find Your
            <br />
            Signature Scent
          </h1>

          <p className="mt-5 text-base md:text-xl text-white/90 font-light max-w-xl mx-auto drop-shadow">
            Not just a perfume, a destination.
          </p>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-9">
            <button
              onClick={() => handleFilterNavigation("Her")}
              className="px-8 md:px-10 py-3 md:py-4 text-sm md:text-base font-archivo font-black uppercase tracking-widest text-[#1C3C85] bg-white rounded-full shadow-2xl hover:bg-gray-100 transition duration-300 transform hover:scale-105 active:scale-95"
            >
              For Her
            </button>
            <button
              onClick={() => handleFilterNavigation("Him")}
              className="px-8 md:px-10 py-3 md:py-4 text-sm md:text-base font-archivo font-black uppercase tracking-widest text-white bg-[#1C3C85] rounded-full shadow-2xl hover:bg-[#2e1f88] transition duration-300 transform hover:scale-105 active:scale-95 border border-white/30"
            >
              For Him
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-white/70">
        <span className="text-[10px] font-archivo uppercase tracking-[0.3em]">Scroll</span>
        <span className="h-9 w-[1.5px] bg-white/50 animate-pulse" />
      </div>
    </section>
  );
}
