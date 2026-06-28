import React from "react";
import { motion } from "framer-motion";

// Reusable, consistent heading used across landing-page sections.
// eyebrow  -> small uppercase label above the title
// title    -> the main heading
// subtitle -> optional supporting line below
export default function SectionHeading({ eyebrow, title, subtitle, align = "center" }) {
  const isCenter = align === "center";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`${isCenter ? "text-center mx-auto" : "text-left"} max-w-2xl mb-10 md:mb-14`}
    >
      {eyebrow && (
        <span className="block text-[11px] md:text-xs font-archivo font-bold uppercase tracking-[0.3em] text-[#1C3C85]/60 mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-archivo font-black uppercase tracking-tight text-[#1C3C85]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-gray-500 text-sm md:text-base leading-relaxed">
          {subtitle}
        </p>
      )}
      {isCenter && (
        <span className="block mx-auto mt-6 h-[3px] w-14 rounded-full bg-[#1C3C85]/30" />
      )}
    </motion.div>
  );
}
