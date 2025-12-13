
import { useNavigate } from "react-router-dom"; 

export default function HeroBanner() {
  const navigate = useNavigate(); 
  

  const imagePath = "/images/background.jpeg"; 

  const handleFilterNavigation = (gender) => {
    navigate(`/products?gender=${gender}`); 
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[400px] overflow-hidden rounded-2xl shadow-xl mb-8">

        <img
            src={imagePath} 
            alt="Scentorini Featured Collection - Discover Your Signature Scent"
            
            className="
                w-full 
                h-full 
                
                object-cover 
                lg:object-contain /* This critical line remains exactly as you found it */
                
                object-center 
                transition-opacity duration-700
            "
        />


        <div 
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            }}
        >
            
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-8 drop-shadow-lg text-center">
                Find Your Signature Scent
            </h2>
            
            <div className="flex space-x-4">
                <button
                    onClick={() => handleFilterNavigation('Her')}
                    className="px-8 py-3 text-lg font-semibold text-[#4B0082] bg-white rounded-full shadow-xl hover:bg-gray-100 transition duration-300 transform hover:scale-105"
                >
                    For Her
                </button>
                <button
                    onClick={() => handleFilterNavigation('Him')}
                    className="px-8 py-3 text-lg font-semibold text-white bg-[#4B0082] rounded-full shadow-xl hover:bg-[#6A0DAD] transition duration-300 transform hover:scale-105"
                >
                    For Him
                </button>
            </div>
        </div>
        
    </div>
  );
}