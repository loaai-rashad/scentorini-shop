import React from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const { cart, removeFromCart, clearCart, incrementQuantity, decrementQuantity } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0)
    return (
      <div className="p-8 text-center text-gray-500">
        Your cart is empty
      </div>
    );

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Your Cart</h2>
      <ul className="space-y-4">
        {cart.map((item) => (
          <li
            key={item.id}
            className="flex justify-between items-center border-b pb-2"
          >
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <button
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => decrementQuantity(item.id)}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => incrementQuantity(item.id)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>EGP{(item.price * item.quantity).toFixed(2)}</span>
              <button
                className="text-red-500 hover:underline"
                onClick={() => removeFromCart(item.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <span className="text-xl font-bold">Total: EGP{total.toFixed(2)}</span>
        <div className="text-gray-600 text-sm">
          * Shipping: 65 EGP all over Egypt, but free in Ismailia.
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          className="bg-[#1C3C85] text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          onClick={clearCart}
        >
          Clear Cart
        </button>
        <button
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition"
          onClick={() => navigate("/checkout")}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
