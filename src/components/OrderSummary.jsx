import React from "react";

export default function OrderSummary({ cart, total }) {
  return (
    <div className="border p-4 rounded shadow-md">
      <h3 className="text-xl font-bold mb-4">Order Summary</h3>
      <ul className="space-y-2">
        {cart.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>{item.title} x {item.quantity}</span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
