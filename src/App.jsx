import React, { useEffect, useState } from "react"; 
import { Routes, Route, useLocation, Link } from "react-router-dom";
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
import TrustBar from "./components/TrustBar";
import AboutTeaser from "./components/AboutTeaser";
import SectionHeading from "./components/SectionHeading";
import WhatsAppButton from "./components/WhatsAppButton";
// --- REVIEW COMPONENTS ---
import ReviewSlider from "./components/ReviewSlider";
import ReviewModal from "./components/ReviewModal";

// Page Imports
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import About from "./pages/About";
import Account from "./pages/Account"; // IMPORTED ACCOUNT PAGE
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

                {/* --- TRUST / VALUE BAR --- */}
                <TrustBar />

                {/* --- 1. DYNAMIC ADMIN SECTIONS --- */}
                {/* These are the sections you manage in Admin > Custom Sections */}
                {customSections.map(section => (
                    <CustomProductSection key={section.id} sectionConfig={section} />
                ))}
                
                {/* --- 2. DISCOVERY SET BUILDER (feature banner) --- */}
                <section className="px-4 md:px-8 py-14 md:py-20 max-w-7xl mx-auto">
                  <div className="rounded-3xl bg-[#1C3C85]/5 border border-[#1C3C85]/10 px-6 md:px-12 py-10 md:py-14 grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Text + CTA */}
                    <div className="text-center md:text-left order-2 md:order-none">
                      <span className="block text-[11px] md:text-xs font-archivo font-bold uppercase tracking-[0.3em] text-[#1C3C85]/60 mb-3">
                        Build Your Own
                      </span>
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-archivo font-black uppercase tracking-tight text-[#1C3C85] leading-[1.05]">
                        Design Your Experience
                      </h2>
                      <p className="mt-4 text-gray-600 text-base md:text-lg leading-relaxed max-w-md mx-auto md:mx-0">
                        Create your personalized Discovery Set with 3 to 6 custom
                        samples — and find the scent that feels like you.
                      </p>
                      <Link
                        to="/testers/builder"
                        className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-[#1C3C85] text-white font-archivo font-black uppercase tracking-widest text-xs md:text-sm rounded-full shadow-lg hover:bg-[#142d63] transition-all transform hover:-translate-y-0.5"
                      >
                        Build Your Set
                      </Link>
                    </div>

                    {/* Discovery card */}
                    <div className="flex justify-center md:justify-end items-center w-full order-1 md:order-none">
                      <DiscoveryCardFetcher />
                    </div>
                  </div>
                </section>

                {/* --- 3. REVIEWS SECTION --- */}
                <section className="py-14 md:py-20">
                  <SectionHeading
                    eyebrow="Loved by our customers"
                    title="Customer Stories"
                  />
                  <ReviewSlider reviews={reviews} />
                  <div className="flex justify-center mt-12">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-8 py-3 border-2 border-[#1C3C85] text-[#1C3C85] font-archivo font-black uppercase tracking-widest rounded-full hover:bg-[#1C3C85] hover:text-white transition-all transform hover:-translate-y-1"
                    >
                      Write a Review
                    </button>
                  </div>
                </section>

                {/* --- 4. BRAND STORY TEASER --- */}
                <AboutTeaser />

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
          <Route path="/account" element={<Account />} /> {/* NEW ACCOUNT ROUTE */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;