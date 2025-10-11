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
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Checkout() {
  const { cart = [], clearCart } = useCart(); // fallback if cart undefined
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    governorate: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");

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

  // Apply promo code
  const handleApplyPromo = async () => {
    setPromoError("");
    if (!promoInput.trim()) return;

    try {
      const promoRef = collection(db, "promocodes");
      const q = query(promoRef, where("code", "==", promoInput.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setPromoError("Promo code not found.");
        setAppliedPromo(null);
        return;
      }

      const promoDoc = snapshot.docs[0].data();
      if (!promoDoc.active) {
        setPromoError("Promo code is inactive.");
        setAppliedPromo(null);
        return;
      }

      setAppliedPromo({ code: promoDoc.code, discount: promoDoc.discount });
    } catch (error) {
      console.error("Error applying promo:", error);
      setPromoError("Failed to apply promo code.");
    }
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = form.governorate === "Ismailia" ? 0 : 65;
  const discountAmount = appliedPromo ? (appliedPromo.discount / 100) * subtotal : 0;
  const total = subtotal - discountAmount + shippingCost;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.governorate || !form.address) {
      return alert("Please fill in all fields before confirming.");
    }
    if (!cart.length) return alert("Your cart is empty.");

    setLoading(true);

    try {
      // Validate stock
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

      // Prepare order
      const orderData = {
        customerName: form.name,
        phoneNumber: form.phone,
        governorate: form.governorate,
        address: form.address,
        items: cart.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        shipping: shippingCost,
        discount: discountAmount,
        total,
        promoCode: appliedPromo?.code || null,
        createdAt: serverTimestamp(),
        status: "New",
      };

      // Save order
      await addDoc(collection(db, "orders"), orderData);

      // Reduce stock
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        await updateDoc(productRef, { stock: increment(-item.quantity) });
      }

      // Clear cart and navigate
      clearCart();
      navigate("/confirmation", { state: { ...orderData, form } });
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("There was an error processing your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!cart.length) {
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

        {/* Governorate dropdown restored */}
        <select
          name="governorate"
          value={form.governorate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="">Select Governorate</option>
          {governorates.map(gov => (
            <option key={gov} value={gov}>{gov}</option>
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

        {/* Promo */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Enter promo code"
            value={promoInput}
            onChange={e => setPromoInput(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Apply
          </button>
        </div>
        {appliedPromo && <p className="text-green-700 text-sm">
          Applied: {appliedPromo.code} ({appliedPromo.discount}% off)
        </p>}
        {promoError && <p className="text-red-600 text-sm">{promoError}</p>}

        <div className="bg-gray-100 p-4 rounded space-y-1 mt-2">
          <p>Subtotal: {subtotal.toFixed(2)} EGP</p>
          {appliedPromo && <p>Discount: -{discountAmount.toFixed(2)} EGP</p>}
          <p>Shipping: {shippingCost.toFixed(2)} EGP</p>
          <p className="font-bold">Total: {total.toFixed(2)} EGP</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-[#1C3C85] text-white py-2 rounded hover:bg-blue-700 transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Processing..." : "Confirm Order"}
        </button>
      </form>
    </div>
  );
}
