import React from "react";
import { useNavigate } from "react-router-dom"; 

export default function HeroBanner() {
  const navigate = useNavigate(); 
  
  const imagePath = "/images/eid.jpeg"; 

  const handleFilterNavigation = (gender) => {
    navigate(`/products?gender=${gender}`); 
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[450px] overflow-hidden rounded-2xl shadow-xl mb-8">

        {/* The Background Image */}
        <img
            src={imagePath} 
            alt="Scentorini Featured Collection - Eid Mubarak"
            className="
                w-full 
                h-full 
                object-cover 
                lg:object-contain 
                object-center 
                transition-opacity duration-700
            "
        />

        {/* The Content Overlay */}
        <div 
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.15)', 
            }}
        >
            {/* We use justify-center to keep them in the middle, 
                then use mt-24 (Margin Top) or translate-y to nudge them down.
                Adjust mt-20 to mt-32 to find your "sweet spot".
            */}
            <div className="flex space-x-4 md:space-x-8 mt-24 md:mt-32">
                <button
                    onClick={() => handleFilterNavigation('Her')}
                    className="px-8 py-3 text-sm md:text-lg font-bold uppercase tracking-widest text-[#2e1f88] bg-white rounded-full shadow-2xl hover:bg-gray-100 transition duration-300 transform hover:scale-105 active:scale-95"
                >
                    For Her
                </button>
                <button
                    onClick={() => handleFilterNavigation('Him')}
                    className="px-8 py-3 text-sm md:text-lg font-bold uppercase tracking-widest text-white bg-[#1C3C85] rounded-full shadow-2xl hover:bg-[#2e1f88] transition duration-300 transform hover:scale-105 active:scale-95 border border-white/20"
                >
                    For Him
                </button>
            </div>
        </div>
        
    </div>
  );
}