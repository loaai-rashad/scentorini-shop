import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

// Floating "Check Reviews" pill for the landing page — scrolls to the reviews section.
// Sits bottom-right (WhatsApp is bottom-left) and hides while the reviews are on screen.
export default function ReviewsButton({ targetId = "customer-stories" }) {
  const [targetVisible, setTargetVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setTargetVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const scrollToReviews = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={scrollToReviews}
      aria-label="Check customer reviews"
      className={`fixed z-30 bottom-6 right-6 flex items-center gap-2 h-14 px-5 rounded-full bg-[#1C3C85] text-white font-archivo font-black uppercase tracking-widest text-xs shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 ${
        targetVisible ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
      }`}
    >
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
      Check Reviews
    </button>
  );
}
