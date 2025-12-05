
import React from "react";
import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Carousel from "./components/Carousel";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Footer from "./components/Footer";
import ProductsList from "./components/ProductsList"; 
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home"; 

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

          <Route
            path="/"
            element={
              <div>
                <Carousel />
                <ProductsList />
              </div>
            }
          />


          <Route path="/about" element={<About />} />


          <Route path="/products/:id" element={<ProductPage />} />


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
