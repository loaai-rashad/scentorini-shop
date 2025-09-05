// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Components
import Header from "./components/Header";
import Carousel from "./components/Carousel";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Footer from "./components/Footer";
import ProductsList from "./components/ProductsList"; // Firestore fetch component

// Pages
import About from "./pages/About";

// Admin Pages
import AdminLogin from "./pages/AdminLogin"; // <-- make sure this exists
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header always visible */}
      <Header />

      {/* Main content grows to fill space */}
      <div className="flex-1">
        <Routes>
          {/* Home / Products Grid */}
          <Route
            path="/"
            element={
              <div>
                <Carousel />
                <ProductsList />
              </div>
            }
          />

          {/* About Page */}
          <Route path="/about" element={<About />} />

          {/* Product Details Page */}
          <Route path="/products/:id" element={<ProductPage />} />

          {/* Cart Page */}
          <Route path="/cart" element={<Cart />} />

          {/* Checkout Page */}
          <Route path="/checkout" element={<Checkout />} />

          {/* Order Confirmation Page */}
          <Route path="/confirmation" element={<Confirmation />} />

          {/* Admin Login */}
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>

      {/* Footer always at bottom */}
      <Footer />
    </div>
  );
}

export default App;
