import React, { useEffect } from "react"; 
import { Routes, Route, useLocation } from "react-router-dom"; 
import ReactGA from 'react-ga4'; 

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
import DiscoveryCardFetcher from "./components/DiscoveryCardFetcher"; 

// Assuming these are imported correctly from your pages directory
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// --- GA4 CONFIGURATION (Production Ready) ---
const TRACKING_ID = "G-4RETXH072M"; // Your GA4 Measurement ID
ReactGA.initialize(TRACKING_ID); // <-- DEBUG MODE REMOVED for deployment!
// -------------------------------------


// Helper component to track page views on route changes (Phase 1.3)
function PageViewTracker() {
    const location = useLocation();

    useEffect(() => {
        // Send a pageview event whenever the 'location' object changes (i.e., a route change)
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }, [location]);

    return null; // This component doesn't render anything visible
}


function App() {
  return (
    <div className="flex flex-col min-h-screen">

      <Header />
      <ScrollToTop />
      
      {/* The PageViewTracker component must be rendered within the router context */}
      <PageViewTracker /> 

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
                <section className="p-8 max-w-7xl mx-auto my-12">
                    <h2 className="text-3xl font-montserrat bold font-bold text-[#1C3C85] text-center mb-6">
                        Design Your Experience
                    </h2>
                    <p className="text-center text-gray-600 mb-10">
                        Create your personalized Discovery Set with 3 to 6 custom samples.
                    </p>

                    <div className="flex justify-center">
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