// src/context/CartContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import ReactGA from 'react-ga4'; 

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const storedCart = localStorage.getItem("cart");
    return storedCart ? JSON.parse(storedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Add to cart - UPDATED TO HANDLE SIZE
  const addToCart = (product, selectedSize = null) => {
    
    // --- GA4: Phase 3.1 - ADD TO CART EVENT ---
    const ga4Item = {
        item_id: product.id,
        item_name: product.title,
        price: product.price,
        quantity: 1,
        variant: selectedSize // Added size as variant for GA4
    };

    ReactGA.event('add_to_cart', {
        currency: "EGP",
        value: product.price, 
        items: [ga4Item]
    });
    // -------------------------------------------
    
    setCart((prevCart) => {
      // Check for existing item with SAME ID and SAME SIZE
      const existingItem = prevCart.find(
        (item) => item.id === product.id && item.size === selectedSize
      );

      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map((item) =>
            (item.id === product.id && item.size === selectedSize)
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return prevCart;
      }
      // Add as a new item line including the size
      return [...prevCart, { ...product, quantity: 1, size: selectedSize }];
    });
  };

  // Remove from cart
  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Update quantity directly (respects stock)
  const updateQuantity = (id, quantity) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      )
    );
  };

  // Increment quantity with stock check
  const incrementQuantity = (id) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
          : item
      )
    );
  };

  // Decrement quantity (min 1)
  const decrementQuantity = (id) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(item.quantity - 1, 1) } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}