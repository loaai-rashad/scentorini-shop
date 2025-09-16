import React, { useState } from "react";
import { Menu, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useCart } from "../context/CartContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cart } = useCart(); 

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Calculate total items in cart
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

  return (
<header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-200">
  <div className="container mx-auto px-4 py-4 flex justify-between items-center">

    <div className="flex-1">
      <Link to="/">
        <img
          src="/images/scentorinilogoo.jpeg" 
          alt="Scentorini Logo"
          className="h-9 w-auto object-contain"
        />
      </Link>
    </div>

    {/* Desktop Navigation Menu */}
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

    {/* Mobile Menu Button */}
    <div className="flex items-center space-x-4 flex-1 justify-end">
      <Link to="/cart" className="relative lg:hidden">
        <ShoppingCart className="h-6 w-6 text-gray-700" />
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs">
            {totalItems}
          </span>
        )}
      </Link>

      <Button
        onClick={toggleMenu}
        className="lg:hidden"
        variant="outline"
        size="icon"
        aria-label="Toggle navigation"
      >
        <Menu className="h-6 w-6" />
      </Button>
    </div>
  </div>

  {/* Mobile Menu */}
  <nav
    className={`lg:hidden transition-all duration-300 ease-in-out ${
      isMenuOpen
        ? "max-h-96 opacity-100"
        : "max-h-0 opacity-0 overflow-hidden"
    }`}
  >
    <ul className="flex flex-col items-center py-4 space-y-2">
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
</header>

  );
};

export default Header;
