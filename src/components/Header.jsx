import React, { useState, useEffect } from "react";
import { Menu, ShoppingCart, LogOut, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useCart } from "../context/CartContext";
import Cart from "../pages/Cart"; // Import your new Cart popup
import { auth, googleProvider } from "../firebase"; 
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsCartOpen(false);
  }, [location]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    navigate("/");
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper to close menu when clicking a link
  const NavItem = ({ to, children, onClick }) => (
    <li className="flex items-center">
      <Link
        to={to}
        onClick={onClick}
        className="py-2 text-gray-700 hover:text-[#1C3C85] transition-colors duration-200 text-lg lg:text-sm font-black uppercase tracking-tight"
      >
        {children}
      </Link>
    </li>
  );

  const AuthUI = ({ isMobile = false }) => (
    <div className={`flex items-center ${isMobile ? "flex-col space-y-4 w-full" : "space-x-4"}`}>
      {user ? (
        <div className={`flex items-center gap-3 ${isMobile ? "flex-col" : ""}`}>
          <Link to="/account" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 group">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="h-8 w-8 rounded-full border-2 border-transparent group-hover:border-[#1C3C85] transition-all duration-200 shadow-sm"
            />
            {!isMobile && (
              <span className="text-xs font-black uppercase tracking-widest text-gray-600 hidden xl:block group-hover:text-[#1C3C85]">
                {user.displayName.split(' ')[0]}
              </span>
            )}
          </Link>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button 
          onClick={handleLogin}
          variant="ghost" 
          className="text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-full px-6 py-5 hover:bg-gray-50"
        >
          Login
        </Button>
      )}
    </div>
  );

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100 font-archivo">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        
        {/* Logo */}
        <div className="flex-1">
          <Link to="/" onClick={() => setIsMenuOpen(false)}>
            <img
              src="/images/scentorinilogoo.jpeg"
              alt="Scentorini Logo"
              className="h-8 w-auto object-contain transition-transform hover:scale-105"
            />
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex flex-1 justify-center">
          <ul className="flex space-x-10 items-center">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/about">About</NavItem>
            {/* Cart Trigger */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative py-2 text-gray-700 hover:text-[#1C3C85] text-sm font-black uppercase tracking-tight flex items-center gap-2"
            >
              Cart
              {totalItems > 0 && (
                <span className="bg-[#1C3C85] text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black italic">
                  {totalItems}
                </span>
              )}
            </button>
          </ul>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <div className="hidden lg:block">
            <AuthUI />
          </div>

          {/* Mobile Cart Trigger */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative lg:hidden p-2 text-gray-700 active:scale-90 transition-transform"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-black">
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <Button
            onClick={toggleMenu}
            className="lg:hidden p-2"
            variant="ghost"
            size="icon"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar/Menu */}
      <div
        className={`lg:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 transition-all duration-500 ease-in-out z-40 ${
          isMenuOpen ? "translate-y-0 opacity-100 shadow-xl" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <ul className="flex flex-col items-center py-10 space-y-6 bg-white">
          <NavItem to="/" onClick={toggleMenu}>Home</NavItem>
          <NavItem to="/about" onClick={toggleMenu}>About</NavItem>
          <button 
            onClick={() => { toggleMenu(); setIsCartOpen(true); }}
            className="text-lg font-black uppercase tracking-tight text-gray-700"
          >
            Cart ({totalItems})
          </button>
          <div className="w-12 h-[2px] bg-gray-100" />
          <AuthUI isMobile />
        </ul>
      </div>

      {/* THE CART POPUP */}
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
};

export default Header;