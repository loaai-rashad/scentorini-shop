import React, { useState, useEffect } from "react";
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
  writeBatch, 
} from "firebase/firestore";
import { db } from "../firebase";
import emailjs from '@emailjs/browser';
import ReactGA from 'react-ga4';

const EMAILJS_SERVICE_ID = 'service_gl98ck9';
const EMAILJS_TEMPLATE_ID = 'template_y2k0ghw';
const EMAILJS_PUBLIC_KEY = 'jbKrDobPuQ9Eoy-Wl'; 

export default function Checkout() {
  const { cart = [], clearCart } = useCart();
  const navigate = useNavigate();

  // --- FORM STATE ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [form, setForm] = useState({
    phone: "",
    governorate: "",
    address: "",
    email: "", 
  });

  // --- SHIPPING STATE ---
  const [shippingRates, setShippingRates] = useState([]); 
  const [currentShippingCost, setCurrentShippingCost] = useState(0);
  const [fetchingRates, setFetchingRates] = useState(true);

  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("InstaPay");
  const [instapayPhone, setInstapayPhone] = useState(""); 

  // --- 1. FETCH DYNAMIC SHIPPING RATES ---
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "shippingRates"));
        const rates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setShippingRates(rates.sort((a, b) => a.governorate.localeCompare(b.governorate)));
      } catch (error) {
        console.error("Error fetching rates:", error);
      } finally {
        setFetchingRates(false);
      }
    };
    fetchRates();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "governorate") {
        const selected = shippingRates.find(r => r.governorate === e.target.value);
        setCurrentShippingCost(selected ? selected.price : 0);
    }
  };

  // --- FIXED PROMO LOGIC FOR RANDOM IDs ---
  const handleApplyPromo = async () => {
    setPromoError("");
    const input = promoInput.trim();
    if (!input) return;

    try {
      // Searching field 'code' inside collection 'promocodes'
      // Checks for exact, lowercase, and uppercase variations
      const q = query(
        collection(db, "promocodes"), 
        where("code", "in", [input, input.toLowerCase(), input.toUpperCase()])
      );
      
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

      setAppliedPromo({ code: promoDoc.code, discount: Number(promoDoc.discount) });
      setPromoInput("");
    } catch (error) {
      console.error("Error applying promo:", error);
      setPromoError("Failed to apply promo code.");
    }
  };

  // --- TOTALS ---
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedPromo ? (appliedPromo.discount / 100) * subtotal : 0;
  const total = subtotal - discountAmount + currentShippingCost; 
  
  // --- GA4 BEGIN CHECKOUT ---
  useEffect(() => {
    if (cart.length > 0) {
        ReactGA.event('begin_checkout', {
            currency: "EGP",
            value: subtotal, 
            items: cart.map(item => ({
                item_id: item.id,
                item_name: item.title,
                price: item.price,
                quantity: item.quantity,
            }))
        });
    }
  }, [cart, subtotal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (!firstName.trim() || !lastName.trim() || !form.phone || !form.governorate || !form.address || !form.email) {
      return alert("Please fill in all required fields.");
    }
    if (!cart.length) return alert("Your cart is empty.");
    if (paymentMethod === "InstaPay" && !instapayPhone.trim()) {
      return alert("Please enter your InstaPay mobile number.");
    }

    setLoading(true);
    const batch = writeBatch(db);
    let validationFailed = false;

    try {
      // --- STOCK VALIDATION ---
      for (const item of cart) {
        if (item.isCustomSet) {
          for (const sample of item.selectedSamples) {
            const sampleRef = doc(db, "samples", sample.docId);
            const sampleSnap = await getDoc(sampleRef);
            if (!sampleSnap.exists() || sampleSnap.data().stock < 1) {
              alert(`Not enough stock for Discovery Sample: "${sample.title}".`);
              validationFailed = true;
              break;
            }
          }
        } else {
          const productRef = doc(db, "products", item.id);
          const productSnap = await getDoc(productRef);
          if (!productSnap.exists() || productSnap.data().stock < item.quantity) {
            alert(`Not enough stock for "${item.title}".`);
            validationFailed = true;
            break;
          }
        }
        if (validationFailed) break;
      }

      if (validationFailed) { setLoading(false); return; }
      
      // --- STOCK DECREMENT ---
      for (const item of cart) {
        if (item.isCustomSet) {
          for (const sample of item.selectedSamples) {
            batch.update(doc(db, "samples", sample.docId), { stock: increment(-1) }); 
          }
        } else {
          batch.update(doc(db, "products", item.id), { stock: increment(-item.quantity) }); 
        }
      }
      await batch.commit();

      const orderItems = cart.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        ...(item.isCustomSet && { 
            isCustomSet: true, 
            selectedSamples: item.selectedSamples.map(s => s.title),
            priceDetails: item.priceDetails 
        })
      }));

      const orderData = {
        customerName: fullName, 
        phoneNumber: form.phone,
        governorate: form.governorate,
        email: form.email,
        address: form.address,
        items: orderItems,
        subtotal,
        shipping: currentShippingCost,
        discount: discountAmount,
        total,
        promoCode: appliedPromo?.code || null,
        paymentMethod: paymentMethod, 
        instapayPhone: paymentMethod === "InstaPay" ? instapayPhone.trim() : null,
        createdAt: serverTimestamp(),
        status: "New",
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);
      const orderId = docRef.id;

      // --- GA4 PURCHASE ---
      ReactGA.event('purchase', {
          transaction_id: orderId,
          value: total,
          shipping: currentShippingCost,
          currency: "EGP", 
          coupon: appliedPromo?.code || undefined,
          items: orderItems.map(item => ({ item_id: item.id, item_name: item.title, price: item.price, quantity: item.quantity }))
      });

      // --- EMAILJS ---
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        customer_name: fullName, 
        customer_email: form.email, 
        order_id: orderId, 
        total: total.toFixed(2),
        subtotal: subtotal.toFixed(2),
        shipping_cost: currentShippingCost.toFixed(2),
        payment_method: paymentMethod,
        governorate: form.governorate,
        address: form.address,
        order_details: orderItems.map(item => item.isCustomSet ? `${item.title}: ${item.selectedSamples.join(', ')}` : `${item.title} x ${item.quantity}`).join('\n'), 
      }, EMAILJS_PUBLIC_KEY);

      clearCart();
      navigate("/confirmation", { state: { ...orderData, orderId, form: { ...form, name: fullName } } });
      
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("Order processing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto font-archivo">
      <h2 className="text-2xl font-bold mb-6 text-[#1C3C85] uppercase italic tracking-tighter">Confirm Your Order</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="flex gap-4">
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-1/2 border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none" required />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-1/2 border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none" required />
        </div>
        <input type="email" name="email" placeholder="Email Address" value={form.email} onChange={handleChange} className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none" required />
        <input type="tel" name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none" required />

        <select
          name="governorate"
          value={form.governorate}
          onChange={handleChange}
          className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
          required
        >
          <option value="">{fetchingRates ? "Loading Shipping Rates..." : "Select Destination"}</option>
          {shippingRates.map(rate => (
            <option key={rate.id} value={rate.governorate}>
              {rate.governorate} — {rate.price} EGP
            </option>
          ))}
        </select>

        <textarea name="address" placeholder="Detailed Address" value={form.address} onChange={handleChange} className="w-full border p-3 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-100 outline-none min-h-[100px]" required />
        
        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border">
          <input type="text" placeholder="Promo code" value={promoInput} onChange={e => setPromoInput(e.target.value)} className="flex-1 bg-transparent p-2 outline-none text-sm" />
          <button type="button" onClick={handleApplyPromo} className="bg-[#1C3C85] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Apply</button>
        </div>
        {promoError && <p className="text-red-500 text-[10px] font-bold uppercase ml-2">{promoError}</p>}
        {appliedPromo && <p className="text-green-600 text-[10px] font-bold uppercase ml-2">Code Applied!</p>}
        
        <div className="border border-gray-200 p-4 rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Payment Method</h3>

          <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === "InstaPay" ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-100' : 'hover:bg-gray-50'}`}>
            <input type="radio" checked={paymentMethod === "InstaPay"} onChange={() => setPaymentMethod("InstaPay")} className="hidden" />
            <div className="flex-1">
              <span className="font-bold text-purple-700 block text-sm">InstaPay</span>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Instant Transfer</p>
            </div>
          </label>

          {paymentMethod === "InstaPay" && (
  <div className="p-4 bg-purple-100/50 rounded-xl space-y-3">
    <div className="flex flex-col gap-1">
      <p className="text-xs font-bold text-purple-800 uppercase tracking-tighter">1. Send to Mobile:</p>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-black text-purple-900">01000775276</span>
        <button 
          type="button"
          onClick={() => navigator.clipboard.writeText("01000775276")}
          className="text-[10px] font-bold text-purple-600 underline uppercase tracking-widest"
        >
          Copy
        </button>
      </div>
    </div>
    
    <p className="text-xs font-bold text-purple-800 uppercase tracking-tighter pt-2">2. Your Transfer Number:</p>
    <input type="tel" placeholder="01xxxxxxxxx" value={instapayPhone} onChange={(e) => setInstapayPhone(e.target.value)} className="w-full border p-3 rounded-lg bg-white outline-none" required />
  </div>
)}

<label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === "COD" ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'hover:bg-gray-50'}`}>
  {/* REMOVED "hidden" so the circle shows up */}
  <input 
    type="radio" 
    checked={paymentMethod === "COD"} 
    onChange={() => setPaymentMethod("COD")} 
    className="w-4 h-4 accent-blue-600" 
  />
  <div className="flex-1">
    <span className="font-bold text-blue-700 block text-sm">Cash on Delivery (COD)</span>
    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pay at doorstep</p>
  </div>
</label>
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl space-y-2 border border-gray-200">
          <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Subtotal</span><span>{subtotal.toFixed(2)} EGP</span></div>
          <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Shipping</span><span>{currentShippingCost.toFixed(2)} EGP</span></div>
          {appliedPromo && <div className="flex justify-between text-xs font-bold text-green-600 uppercase"><span>Discount</span><span>-{discountAmount.toFixed(2)} EGP</span></div>}
          <div className="flex justify-between text-xl font-black text-[#1C3C85] border-t pt-2 mt-2 italic tracking-tighter"><span>TOTAL</span><span>{total.toFixed(2)} EGP</span></div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[#1C3C85] text-white py-4 rounded-full font-black uppercase tracking-widest shadow-lg hover:bg-blue-800 transition-all disabled:opacity-50">
          {loading ? "Processing..." : "Confirm Order"}
        </button>
      </form>
    </div>
  );
}