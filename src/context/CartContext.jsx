// src/context/CartContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import ReactGA from 'react-ga4';
import { pixelTrack } from "../lib/metaPixel";

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

    // --- Meta Pixel: AddToCart ---
    pixelTrack('AddToCart', {
        content_ids: [product.id],
        content_name: product.title,
        content_type: 'product',
        value: Number(product.price) || 0,
        currency: 'EGP',
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

  // Helper: a cart line is uniquely identified by id + size (same product, different sizes are separate lines)
  const sameLine = (item, id, size) => item.id === id && item.size === size;

  // Remove from cart (size-aware)
  const removeFromCart = (id, size = null) => {
    setCart((prevCart) => prevCart.filter((item) => !sameLine(item, id, size)));
  };

  // Update quantity directly (respects stock, size-aware)
  const updateQuantity = (id, quantity, size = null) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        sameLine(item, id, size)
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item
      )
    );
  };

  // Increment quantity with stock check (size-aware)
  const incrementQuantity = (id, size = null) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        sameLine(item, id, size)
          ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
          : item
      )
    );
  };

  // Decrement quantity (min 1, size-aware)
  const decrementQuantity = (id, size = null) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        sameLine(item, id, size) ? { ...item, quantity: Math.max(item.quantity - 1, 1) } : item
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