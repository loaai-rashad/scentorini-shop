import React from "react";

export default function About() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-gray-50">


      <div className="max-w-4xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-[#1C3C85]">
          🌊 About Scentorini
        </h1>

        <p className="text-gray-700 text-lg md:text-xl leading-relaxed">
          At Scentorini, we believe a fragrance is more than just a scent – it is a journey.
          Inspired by the timeless beauty of Santorini, our brand captures the essence of 
          white-washed domes, the endless blue of the Aegean Sea, and the serenity of island sunsets.
        </p>

        <p className="text-gray-700 text-lg md:text-xl leading-relaxed">
          Each perfume is carefully crafted to reflect the harmony between elegance and nature, 
          blending modern sophistication with the soul of the Mediterranean.
        </p>

        <p className="text-gray-700 text-lg md:text-xl leading-relaxed">
          With every bottle, we invite you to escape the ordinary and embrace a story that is 
          uniquely yours – told through the language of scent.
        </p>

        <p className="text-[#1C3C85] text-xl md:text-2xl font-semibold">
          Scentorini – Not just a perfume, a destination.
        </p>
      </div>
    </div>
  );
}
