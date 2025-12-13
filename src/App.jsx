import React from "react";
import { Routes, Route } from "react-router-dom";

// Standard Imports
import Header from "./components/Header";
import Carousel from "./components/Carousel";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

// Page/Component Imports
import ProductsList from "./components/ProductsList";             
import HomeProductFetcher from "./components/HomeProductFetcher"; 
import ProductPage from "./pages/ProductPage";                   
import DiscoverySetPage from "./pages/DiscoverySetPage";         
// import ProductCard from "./components/ProductCard"; // <-- No longer needed here, as it's used inside DiscoveryCardFetcher
import DiscoveryCardFetcher from "./components/DiscoveryCardFetcher"; // <-- NEW: Component to fetch the Discovery Set data

// Assuming these are imported correctly from your pages directory
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";


function App() {
  return (
    <div className="flex flex-col min-h-screen">

      <Header />
      <ScrollToTop />

      <div className="flex-1">
        <Routes>

          {/* 1. HOMEPAGE Route */}
          <Route
            path="/"
            element={
              <>
                <Carousel />
                
                {/* 1. Renders the main product collection slider (Discovery Set is now filtered OUT here) */}
                <HomeProductFetcher /> 
                
                {/* --- NEW SECTION: Discovery Set Builder --- */}
                {/* The card is now rendered by a separate, data-driven component */}
                <section className="p-8 max-w-7xl mx-auto my-12">
                    <h2 className="text-3xl font-serif font-bold text-[#1C3C85] text-center mb-6">
                        Design Your Experience
                    </h2>
                    <p className="text-center text-gray-600 mb-10">
                        Create your personalized Discovery Set with 3 to 6 custom samples.
                    </p>

                    <div className="flex justify-center">
                        {/* This component fetches the image/title from Firestore 
                            and renders the ProductCard, just like a regular product. */}
                        <DiscoveryCardFetcher />
                    </div>
                </section>
                {/* ------------------------------------------ */}
              </>
            }
          />
          
          {/* 2. FILTERED PRODUCTS PAGE Route */}
          <Route path="/products" element={<ProductsList />} />
          
          {/* 3. DISCOVERY SET BUILDER Route */}
          <Route path="/testers/builder" element={<DiscoverySetPage />} /> 

          {/* 4. INDIVIDUAL PRODUCT PAGE Route */}
          <Route path="/products/:id" element={<ProductPage />} />

          {/* 5. Other Routes */}
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

export default App;