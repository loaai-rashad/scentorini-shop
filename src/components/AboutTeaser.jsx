import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// Brand-story teaser shown near the bottom of the landing page,
// giving the page a narrative close before the footer.
export default function AboutTeaser() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center"
      >
        {/* Image */}
        <div className="relative overflow-hidden rounded-3xl shadow-lg order-1 md:order-none">
          <img
            src="/images/About.jpeg"
            alt="The Scentorini story"
            loading="lazy"
            className="w-full h-64 md:h-[420px] object-cover transition-transform duration-700 hover:scale-105"
          />
        </div>

        {/* Text */}
        <div className="text-center md:text-left">
          <span className="block text-[11px] md:text-xs font-archivo font-bold uppercase tracking-[0.3em] text-[#1C3C85]/60 mb-3">
            Our Story
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-archivo font-black uppercase tracking-tight text-[#1C3C85] leading-[1.05]">
            Inspired by Santorini
          </h2>
          <p className="mt-5 text-gray-600 text-base md:text-lg leading-relaxed">
            A fragrance is more than a scent — it is a journey. Inspired by white-washed
            domes, the endless blue of the Aegean, and the serenity of island sunsets,
            every Scentorini bottle invites you to escape the ordinary.
          </p>
          <p className="mt-4 text-[#1C3C85] text-lg md:text-xl font-semibold italic">
            Not just a perfume, a destination.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-[#1C3C85] text-white font-archivo font-black uppercase tracking-widest text-xs md:text-sm rounded-full shadow-lg hover:bg-[#142d63] transition-all transform hover:-translate-y-0.5"
          >
            Learn More
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
