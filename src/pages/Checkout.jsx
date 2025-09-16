import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    governorate: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  const governorates = [
    "Alexandria","Assiut","Aswan","Beheira","Bani Suef","Cairo",
    "Daqahliya","Damietta","Fayyoum","Gharbiya","Giza","Helwan",
    "Ismailia","Kafr El Sheikh","Luxor","Marsa Matrouh","Minya",
    "Monofiya","New Valley","North Sinai","Port Said","Qalioubiya",
    "Qena","Red Sea","Sharqiya","Sohag","South Sinai","Suez","Tanta",
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.governorate || !form.address) {
      alert("Please fill in all fields before confirming.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setLoading(true);

    try {
      // 🔎 Step 1: Validate stock for each product
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          alert(`Product ${item.title} not found.`);
          setLoading(false);
          return;
        }

        const productData = productSnap.data();
        if (productData.stock < item.quantity) {
          alert(
            `Not enough stock for "${item.title}". Available: ${productData.stock}, Requested: ${item.quantity}`
          );
          setLoading(false);
          return;
        }
      }

      // 🔢 Step 2: Calculate shipping and totals
      const shippingCost = form.governorate === "Ismailia" ? 0 : 65;
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const total = subtotal + shippingCost;

      const orderData = {
        customerName: form.name,
        phoneNumber: form.phone,
        governorate: form.governorate,
        address: form.address,
        items: cart.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        shipping: shippingCost,
        total,
        createdAt: serverTimestamp(),
      };

      // 🔽 Step 3: Create order in Firestore
      await addDoc(collection(db, "orders"), orderData);

      // 🔽 Step 4: Decrease stock in Firestore
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        await updateDoc(productRef, {
          stock: increment(-item.quantity),
        });
      }

      // 🧹 Step 5: Clear cart and navigate
      clearCart();
      navigate("/confirmation", { state: { form, subtotal, shipping: shippingCost, total } });
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("There was an error processing your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Your cart is empty.
        <br />
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-[#1C3C85] text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Go back to products
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Confirm Your Order</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
        <select
          name="governorate"
          value={form.governorate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="">Select Governorate</option>
          {governorates.map((gov) => (
            <option key={gov} value={gov}>
              {gov}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Shipping is 65 EGP all over Egypt, free in Ismailia.
        </p>
        <textarea
          name="address"
          placeholder="Detailed Address"
          value={form.address}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          className={`w-full bg-[#1C3C85] text-white py-2 rounded hover:bg-blue-700 transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? "Processing..." : "Confirm Order"}
        </button>
      </form>
    </div>
  );
}
