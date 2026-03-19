import React, { useEffect, useState } from "react"; 
import { Routes, Route, useLocation } from "react-router-dom"; 
import ReactGA from 'react-ga4'; 
import { collection, query, getDocs, orderBy, onSnapshot } from "firebase/firestore"; 
import { db } from './firebase'; 

// Standard Imports
import Header from "./components/Header";
import Carousel from "./components/Carousel";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

// Component Imports
import ProductsList from "./components/ProductsList";             
import ProductPage from "./pages/ProductPage";                   
import DiscoverySetPage from "./pages/DiscoverySetPage";         
import DiscoveryCardFetcher from "./components/DiscoveryCardFetcher"; 
import CustomProductSection from "./components/CustomProductSection"; 
import AnnouncementBar from "./components/AnnouncementBar.jsx"
// --- REVIEW COMPONENTS ---
import ReviewSlider from "./components/ReviewSlider";
import ReviewModal from "./components/ReviewModal";

// Page Imports
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// --- GA4 CONFIGURATION ---
const TRACKING_ID = "G-4RETXH072M";
ReactGA.initialize(TRACKING_ID); 

function PageViewTracker() {
    const location = useLocation();
    useEffect(() => {
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }, [location]);
    return null; 
}

function App() {
  const [customSections, setCustomSections] = useState([]); 
  const [reviews, setReviews] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 1. Fetch Dynamic Admin Sections
    const fetchSections = async () => {
        try {
            const sectionsRef = collection(db, "customizableSections");
            const q = query(sectionsRef, orderBy("order", "asc")); 
            const snapshot = await getDocs(q);
            const sectionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                productIds: doc.data().productIds || [], 
            }));
            setCustomSections(sectionsData);
        } catch (error) {
            console.error("Error fetching homepage sections:", error);
        }
    };

    // 2. Fetch All Reviews
    const qReviews = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setReviews(reviewsData);
    });

    fetchSections();
    return () => unsubscribeReviews();
  }, []); 
    
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <AnnouncementBar />
      <ScrollToTop />
      <PageViewTracker /> 

      <div className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Carousel />
                
                {/* --- 1. DYNAMIC ADMIN SECTIONS --- */}
                {/* These are the sections you manage in Admin > Custom Sections */}
                {customSections.map(section => (
                    <CustomProductSection key={section.id} sectionConfig={section} />
                ))}
                
                {/* --- 2. DISCOVERY SET BUILDER --- */}
                {/* This stays fixed because it is a core feature */}
                <section className="p-4 max-w-7xl mx-auto my-12">
                    <h2 className="text-3xl font-montserrat font-bold text-[#1C3C85] text-center mb-6">
                        Design Your Experience
                    </h2>
                    <p className="text-center text-gray-600 mb-10">
                        Create your personalized Discovery Set with 3 to 6 custom samples.
                    </p>
                    <div className="flex justify-center">
                        <DiscoveryCardFetcher />
                    </div>
                </section>

                {/* --- 3. REVIEWS SECTION --- */}
                <ReviewSlider title="Customer Stories" reviews={reviews} />
                <div className="flex justify-center mb-20">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-8 py-3 border-2 border-[#1C3C85] text-[#1C3C85] font-archivo font-black uppercase tracking-widest rounded-full hover:bg-[#1C3C85] hover:text-white transition-all transform hover:-translate-y-1"
                    >
                        Write a Review
                    </button>
                </div>

                <ReviewModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    productId="general"
                    productTitle=""
                />
              </>
            }
          />
          
          {/* Other Routes Remain Untouched */}
          <Route path="/products" element={<ProductsList />} />
          <Route path="/testers/builder" element={<DiscoverySetPage />} /> 
          <Route path="/products/:id" element={<ProductPage />} />
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