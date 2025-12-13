// src/pages/Home.js

import React from 'react';
import Carousel from "../components/Carousel";
import HomeProductFetcher from "../components/HomeProductFetcher"; 
import ProductCard from "../components/ProductCard"; 

// --- REMOVED THE CONSTANT: const DISCOVERY_SET_PRODUCT_ID = 'YOUR_DISCOVERY_SET_PRODUCT_ID'; ---


const Home = () => {
  return (
    <div className="home-page-layout">
      
      {/* 1. Carousel Section */}
      <Carousel />
      
      {/* 2. Main Products List Section (Renders "Scentorini Collection" and slider) */}
      <HomeProductFetcher />
      
      {/* 3. NEW SECTION: Discovery Set Builder */}
      <section className="p-8 max-w-7xl mx-auto my-12">
          {/* Header for the Discovery Set Section */}
          <h2 className="text-3xl font-serif font-bold text-[#1C3C85] text-center mb-6">
              Design Your Experience
          </h2>
          <p className="text-center text-gray-600 mb-10">
              Create your personalized Discovery Set with 3 to 6 custom samples.
          </p>

          <div className="flex justify-center">
              {/* Product Card for the Discovery Set Builder */}
              <ProductCard
                  // We use a descriptive string ID here. 
                  // Because 'for="tester"' is set, the ProductCard will IGNORE this ID for routing.
                  id="discovery-set-main-product" 
                  
                  // You MUST ensure the link here matches the image link used in DiscoverySetPage.jsx
                  image="/images/discovery-set-box.png" 
                  
                  title="Discovery Set Builder"
                  subtitle="Custom 3-6 Sample Set"
                  price={0.00} 
                  stock={9999} 
                  for="tester" // CRITICAL: This ensures the link is /testers/builder
                  className="w-full max-w-sm"
              />
          </div>
      </section>
      {/* ------------------------------------------------ */}

    </div>
  );
};

export default Home;