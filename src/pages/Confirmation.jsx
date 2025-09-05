import React from "react";
import { useLocation, Link } from "react-router-dom";

export default function Confirmation() {
  const { state } = useLocation();

  if (!state) {
    return (
      <div className="p-8 text-center text-gray-500">
        No order data found.
        <br />
        <Link
          to="/"
          className="mt-4 inline-block bg-[#1C3C85] text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const { form, total } = state;

  return (
    <div className="p-8 max-w-3xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-4">
        Thank you for your order, {form.name}!
      </h2>
      <p className="mb-2">Total Paid: EGP{total.toFixed(2)}</p>
      <p className="mb-2">
        Delivery to: {form.address}, {form.governorate}
      </p>
      <p className="mb-4">We will contact you at {form.phone} if needed.</p>
      <Link
        to="/"
        className="bg-[#1C3C85] text-white py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
