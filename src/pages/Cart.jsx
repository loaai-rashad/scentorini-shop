import React from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";

// isOpen and onClose will be passed from your Navbar or App.js
export default function Cart({ isOpen, onClose }) {
  const { cart, removeFromCart, clearCart, incrementQuantity, decrementQuantity } = useCart();
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[999] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 2. Side Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-[400px] bg-white shadow-2xl z-[1000] transform transition-transform duration-500 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-[#1C3C85] text-white">
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} className="italic" />
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Your Bag</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
              <ShoppingBag size={60} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="font-bold uppercase text-xs tracking-widest">Scentorini bag is empty</p>
              <button 
                onClick={onClose}
                className="mt-4 text-[#1C3C85] font-black text-xs uppercase underline underline-offset-4"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.map((item) => (
                <li key={item.id} className="p-6 flex gap-4 animate-fadeIn">
                  {/* PRODUCT IMAGE */}
                  <div className="w-24 h-28 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-black uppercase text-sm leading-tight tracking-tight ${item.isCustomSet ? 'text-purple-700' : 'text-gray-900'}`}>
                          {item.title}
                        </h3>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {item.isCustomSet && item.selections && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 leading-relaxed">
                          {item.selections.join(" • ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity Controls */}
                      {!item.isCustomSet ? (
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                          <button 
                            className="p-1 px-3 text-gray-500 hover:text-[#1C3C85] transition-colors"
                            onClick={() => decrementQuantity(item.id)}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-1 text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                          <button 
                            className="p-1 px-3 text-gray-500 hover:text-[#1C3C85] transition-colors"
                            onClick={() => incrementQuantity(item.id)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded">1 DISCOVERY SET</span>
                      )}

                      <span className="font-black text-base text-[#1C3C85] italic">
                        EGP {item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sticky Footer */}
        {cart.length > 0 && (
          <div className="p-6 border-t bg-gray-50 space-y-4">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                <span className="text-3xl font-black text-[#1C3C85] italic tracking-tighter">
                    EGP {total.toFixed(0)}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase pb-1">Taxes & Shipping calculated at checkout</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-[#1C3C85] text-white py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-blue-800 shadow-xl transition-all active:scale-[0.98]"
                onClick={() => {
                  onClose();
                  navigate("/checkout");
                }}
              >
                Proceed to Checkout
              </button>
              <button
                className="w-full text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
                onClick={clearCart}
              >
                Empty Bag
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}