import React, { useState, useEffect } from "react";
import { Menu, ShoppingCart, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useCart } from "../context/CartContext";
// Import your auth functions
import { auth, googleProvider } from "../firebase"; 
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const { cart } = useCart();
  const navigate = useNavigate();

  // Listen for Auth changes
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
    navigate("/"); // Redirect home after logout
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const NavItem = ({ to, children }) => (
    <li className="flex items-center">
      <Link
        to={to}
        className="py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 text-lg font-medium"
      >
        {children}
      </Link>
    </li>
  );

  // Updated Login/User UI component linked to /account
  const AuthUI = ({ isMobile = false }) => (
    <div className={`flex items-center ${isMobile ? "flex-col space-y-2 w-full" : "space-x-4"}`}>
      {user ? (
        <div className={`flex items-center gap-3 ${isMobile ? "flex-col" : ""}`}>
          <Link to="/account" className="flex items-center gap-2 group">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="h-8 w-8 rounded-full border-2 border-transparent group-hover:border-[#1C3C85] transition-all duration-200 shadow-sm"
            />
            {!isMobile && (
              <span className="text-sm font-bold text-gray-600 hidden xl:block group-hover:text-[#1C3C85] transition-colors">
                {user.displayName.split(' ')[0]}
              </span>
            )}
          </Link>
          
          <button 
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button 
          onClick={handleLogin}
          variant="ghost" 
          className="text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-full px-4"
        >
          Login
        </Button>
      )}
    </div>
  );

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-200 font-archivo">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        
        {/* Logo Section */}
        <div className="flex-1">
          <Link to="/">
            <img
              src="/images/scentorinilogoo.jpeg"
              alt="Scentorini Logo"
              className="h-9 w-auto object-contain transform scale-110"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 justify-center">
          <ul className="flex space-x-8 items-center">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/cart">
              Cart
              {totalItems > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full px-2 text-sm">
                  {totalItems}
                </span>
              )}
            </NavItem>
            <NavItem to="/about">About</NavItem>
          </ul>
        </nav>

        {/* Right Actions (Desktop Auth + Mobile Cart/Menu) */}
        <div className="flex items-center space-x-4 flex-1 justify-end">
          
          {/* Desktop Auth */}
          <div className="hidden lg:block">
            <AuthUI />
          </div>

          {/* Mobile Cart Icon */}
          <Link to="/cart" className="relative lg:hidden">
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            onClick={toggleMenu}
            className="lg:hidden"
            variant="outline"
            size="icon"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu Content */}
      <nav
        className={`lg:hidden transition-all duration-300 ease-in-out border-t border-gray-100 ${
          isMenuOpen ? "max-h-[500px] opacity-100 py-6" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <ul className="flex flex-col items-center space-y-4">
          <NavItem to="/">Home</NavItem>
          <NavItem to="/cart">Cart ({totalItems})</NavItem>
          <NavItem to="/about">About</NavItem>
          <hr className="w-1/2 border-gray-100" />
          <AuthUI isMobile />
        </ul>
      </nav>
    </header>
  );
};

export default Header;