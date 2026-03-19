import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion'; // 1. Import motion

export default function ReviewSlider({ title = "Customer Stories", reviews }) {
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
      <h2 className={`text-2xl font-archivo font-black uppercase text-center mb-6 tracking-tighter text-[#1C3C85] pb-4 ${PADDING_CLASSES}`}>
        {title}
      </h2>

      <div className="overflow-x-scroll no-scrollbar" style={{ scrollbarWidth: 'none' }}>
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
    </motion.section>
  );
}