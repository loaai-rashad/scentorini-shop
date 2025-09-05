"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [

  "/images/slide2.jpeg",
  "/images/slide3.jpeg",
  "/images/slide4.jpeg",
  "/images/slide5.jpeg",

];

export default function Carousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 2000); // change slide every 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-2xl shadow-lg mb-8">
  <AnimatePresence>
    <motion.img
      key={index}
      src={images[index]}
      alt={`Slide ${index + 1}`}
      className="absolute w-full h-full object-cover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    />
  </AnimatePresence>

  {/* Dots navigation */}
  <div className="absolute bottom-4 w-full flex justify-center space-x-2">
    {images.map((_, i) => (
      <button
        key={i}
        onClick={() => setIndex(i)}
        className={`w-3 h-3 rounded-full ${
          i === index ? "bg-white" : "bg-gray-400"
        }`}
      />
    ))}
  </div>
</div>

  );
}