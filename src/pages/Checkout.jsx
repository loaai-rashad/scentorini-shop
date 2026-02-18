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
import ReactGA from 'react-ga4'; // <-- NEW: GA4 Import


const EMAILJS_SERVICE_ID = 'service_gl98ck9';
const EMAILJS_TEMPLATE_ID = 'template_y2k0ghw';
const EMAILJS_PUBLIC_KEY = 'jbKrDobPuQ9Eoy-Wl'; 

export default function Checkout() {
  const { cart = [], clearCart } = useCart();
  const navigate = useNavigate();

  // --- NEW STATE: Separating Name Fields ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // The 'name' field in the form state will be assembled at submission time.
  const [form, setForm] = useState({
    // name: "", // Removed from initial state
    phone: "",
    governorate: "",
    address: "",
    email: "", 
  });
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  
  const [paymentMethod, setPaymentMethod] = useState("InstaPay");
  // State to capture the user's mobile number used for their InstaPay transfer
  const [instapayPhone, setInstapayPhone] = useState(""); 

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

  // Apply promo code (Retained)
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

  // Totals calculation (Retained)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Assuming shipping is 65 EGP, or 0 for Ismailia
  const shippingCost = form.governorate === "Ismailia" ? 0 : 75; 
  const discountAmount = appliedPromo ? (appliedPromo.discount / 100) * subtotal : 0;
  const total = subtotal - discountAmount + shippingCost; 
  
  // --- GA4: Phase 2.1 - BEGIN CHECKOUT EVENT ---
  useEffect(() => {
    // Only fire if the cart has items
    if (cart.length > 0) {
        // Map cart items into the GA4 Enhanced E-commerce format
        const ga4Items = cart.map(item => ({
            item_id: item.id,
            item_name: item.title,
            price: item.price,
            quantity: item.quantity,
        }));

        ReactGA.event('begin_checkout', {
            currency: "EGP",
            value: subtotal, 
            items: ga4Items
        });
    }
  }, [cart, subtotal]); // Dependencies ensure it re-fires if cart changes, which is safe.
  // ---------------------------------------------


  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- FORM VALIDATION UPDATE ---
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (!firstName.trim() || !lastName.trim() || !form.phone || !form.governorate || !form.address || !form.email) {
      return alert("Please fill in all required fields (First Name, Last Name, Phone, Email, Governorate, Address) before confirming.");
    }
    if (!cart.length) return alert("Your cart is empty.");

    if (paymentMethod === "InstaPay" && !instapayPhone.trim()) {
      return alert("Please enter the mobile number you used for the InstaPay transfer.");
    }

    setLoading(true);

    // --- START: STOCK VALIDATION AND DECREMENT SETUP ---
    // Use a batch for atomic stock updates (all or nothing)
    const batch = writeBatch(db);
    let validationFailed = false;

    try {
      // 1. VALIDATION LOOP (Combined Check)
      for (const item of cart) {
        
        if (item.isCustomSet) {
          // A. CUSTOM SET VALIDATION: Check individual sample stock from 'samples' collection
          
          if (!item.selectedSamples || item.quantity !== 1) {
            alert(`Error: Invalid Discovery Set item structure.`);
            validationFailed = true;
            break;
          }

          for (const sample of item.selectedSamples) {
            const sampleRef = doc(db, "samples", sample.docId);
            const sampleSnap = await getDoc(sampleRef);

            if (!sampleSnap.exists()) {
              alert(`Sample for "${sample.title}" not found in database.`);
              validationFailed = true;
              break;
            }
            
            const sampleData = sampleSnap.data();
            // We check if stock is less than the quantity requested (which is 1 per sample)
            if (sampleData.stock < 1) { 
              alert(`Not enough stock for Discovery Sample: "${sample.title}".`);
              validationFailed = true;
              break;
            }
          }
          if (validationFailed) break;

        } else {
          // B. STANDARD PRODUCT VALIDATION: Check main 'products' collection
          const productRef = doc(db, "products", item.id);
          const productSnap = await getDoc(productRef);

          if (!productSnap.exists()) {
            alert(`Product ${item.title} not found.`);
            validationFailed = true;
            break;
          }
          const productData = productSnap.data();
          if (productData.stock < item.quantity) {
            alert(
              `Not enough stock for "${item.title}". Available: ${productData.stock}, Requested: ${item.quantity}`
            );
            validationFailed = true;
            break;
          }
        }
      }

      if (validationFailed) {
        setLoading(false);
        return;
      }
      
      // 2. STOCK DECREMENT SETUP (Prepare the Batch)
      for (const item of cart) {
        if (item.isCustomSet) {
          // A. CUSTOM SET DECREMENT: Decrement stock from 'samples' collection
          for (const sample of item.selectedSamples) {
            const sampleRef = doc(db, "samples", sample.docId);
            // Decrement by 1 for each unique sample used in the set
            batch.update(sampleRef, { stock: increment(-1) }); 
          }
        } else {
          // B. STANDARD PRODUCT DECREMENT: Decrement stock from 'products' collection
          const productRef = doc(db, "products", item.id);
          // Decrement by the item's quantity
          batch.update(productRef, { stock: increment(-item.quantity) }); 
        }
      }


      // 3. EXECUTE THE BATCH WRITE (COMMIT STOCK CHANGES)
      await batch.commit();

      // --- END: STOCK VALIDATION AND DECREMENT SETUP ---


      // Prepare order data (Map custom set data cleanly for the final order record)
      const orderItems = cart.map(item => {
        if (item.isCustomSet) {
          // For the final 'orders' collection, we include the custom set selections
          return {
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            isCustomSet: true,
            // Only include essential details for the order record
            selectedSamples: item.selectedSamples.map(s => s.title), 
            priceDetails: item.priceDetails,
          };
        }
        // Standard product item structure
        return {
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        };
      });


      // Prepare final order document
      const orderData = {
        // --- BACKEND FIX: Use the combined full name ---
        customerName: fullName, 
        // ----------------------------------------------
        phoneNumber: form.phone,
        governorate: form.governorate,
        email: form.email,
        address: form.address,
        items: orderItems, // Use the new clean orderItems array
        subtotal,
        shipping: shippingCost,
        discount: discountAmount,
        total,
        promoCode: appliedPromo?.code || null,
        paymentMethod: paymentMethod, 
        instapayPhone: paymentMethod === "InstaPay" ? instapayPhone.trim() : null,
        createdAt: serverTimestamp(),
        status: "New",
      };

      // 4. SAVE ORDER AND RETRIEVE THE DOCUMENT REFERENCE
      const docRef = await addDoc(collection(db, "orders"), orderData);
      const orderId = docRef.id;

      // ******************************************************
      // *** START: CRITICAL GA4 PURCHASE EVENT (Phase 2.2) ***
      // ******************************************************
      
      // Prepare the items array for the GA4 purchase event
      const ga4Items = orderItems.map(item => ({
          item_id: item.id,
          item_name: item.title,
          price: item.price,
          quantity: item.quantity,
      }));

      ReactGA.event('purchase', {
          transaction_id: orderId, // The unique Firestore ID
          affiliation: "Online Store",
          value: total, // Final total paid by customer (including shipping, as it's the transactional value)
          shipping: shippingCost,
          currency: "EGP", 
          coupon: appliedPromo?.code || undefined, // Send promo code if used
          items: ga4Items
      });

      // ******************************************************
      // *** END: CRITICAL GA4 PURCHASE EVENT ***
      // ******************************************************


      // 5. PREPARE EMAILJS PARAMETERS
      const templateParams = {
        // --- BACKEND FIX: Use the combined full name ---
        customer_name: fullName, 
        // ----------------------------------------------
        customer_email: form.email, 
        order_id: orderId, 
        total: total.toFixed(2),
        subtotal: subtotal.toFixed(2),
        shipping_cost: shippingCost.toFixed(2),
        discount: discountAmount.toFixed(2),
        payment_method: paymentMethod,
        governorate: form.governorate,
        address: form.address,
        // Format items for the email body
        order_details: orderItems.map(item => {
            if (item.isCustomSet) {
                return `${item.title} (EGP ${item.price.toFixed(2)}): Samples: ${item.selectedSamples.join(', ')}`;
            }
            return `${item.title} x ${item.quantity} (EGP ${item.price.toFixed(2)})`;
        }).join('\n'), 
      };
      
      // 6. SEND CONFIRMATION EMAIL
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
        console.log('SUCCESS! Email sent to customer.');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      // 7. Clear cart and navigate
      clearCart();
      navigate("/confirmation", { state: { ...orderData, orderId, form: { ...form, name: fullName } } });
      
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("There was an error processing your order. Please try again. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  // Check for empty cart
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

        {/* Customer Information Section */}
        <div className="flex gap-4">
            {/* First Name Field */}
            <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-1/2 border p-2 rounded"
                required
            />
            {/* Last Name Field */}
            <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-1/2 border p-2 rounded"
                required
            />
        </div>

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <select
          name="governorate"
          value={form.governorate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Select Governorate</option>
          {governorates.map(gov => (
            <option key={gov} value={gov}>{gov}</option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Shipping is 75 EGP all over Egypt, free in Ismailia.
        </p>

        <textarea
          name="address"
          placeholder="Detailed Address"
          value={form.address}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        
        {/* Promo Code Section */}
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
        
        {/* --- PAYMENT OPTIONS UI --- */}
        <div className="border border-gray-200 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-bold">Payment</h3>

          {/* Option 1: InstaPay */}
          <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition duration-150 ease-in-out ${paymentMethod === "InstaPay" ? 'border-purple-600 ring-2 ring-purple-300 bg-purple-50' : 'hover:bg-gray-50'}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="InstaPay"
              checked={paymentMethod === "InstaPay"}
              onChange={() => setPaymentMethod("InstaPay")}
              className="form-radio h-4 w-4 text-[#1C3C85] border-gray-300 focus:ring-[#1C3C85]"
            />
            <div className="ml-3 flex-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-purple-700">InstaPay</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-sm text-gray-500">
                Pay your full order amount instantly.
              </p>
            </div>
          </label>

          {/* InstaPay Details (Conditionally Rendered) */}
          {paymentMethod === "InstaPay" && (
            <div className="p-4 bg-purple-50 rounded-lg space-y-3">
              <p className="font-medium">Step 1: Open InstaPay & Send to Mobile number</p>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="01000775276" // Static mobile number
                  className="w-full border p-3 rounded-lg bg-white font-mono text-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText("01000775276")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-600 hover:text-purple-800"
                  aria-label="Copy mobile number"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v4m8-4v4m-12 4h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              
              <p className="text-sm text-gray-600">
                Total to send: <span className="font-bold text-lg">{total.toFixed(2)} EGP</span>
              </p>

              <p className="font-medium">Step 2: Enter Your Mobile Number (Used for Transfer)</p>
              <input
                type="tel"
                name="instapay_phone"
                placeholder="e.g. 01xxxxxxxxx"
                value={instapayPhone}
                onChange={(e) => setInstapayPhone(e.target.value)}
                className="w-full border p-3 rounded-lg"
                required={paymentMethod === "InstaPay"}
              />
              
            </div>
          )}

          {/* Option 2: Cash on Delivery (COD) */}
          <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition duration-150 ease-in-out ${paymentMethod === "COD" ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50' : 'hover:bg-gray-50'}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="COD"
              checked={paymentMethod === "COD"}
              onChange={() => setPaymentMethod("COD")}
              className="form-radio h-4 w-4 text-[#1C3C85] border-gray-300 focus:ring-[#1C3C85]"
            />
            <div className="ml-3 flex-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Cash on Delivery (COD)</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m4 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm2-9a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V7z" /></svg>
              </div>
              <p className="text-sm text-gray-500">
                Shipping & Service: {shippingCost.toFixed(2)} EGP
              </p>
            </div>
          </label>
        </div>

        {/* Price Summary */}
        <div className="bg-gray-100 p-4 rounded space-y-1 mt-2">
          <p>Subtotal: {subtotal.toFixed(2)} EGP</p>
          {appliedPromo && <p>Discount: -{discountAmount.toFixed(2)} EGP</p>}
          <p>Shipping: {shippingCost.toFixed(2)} EGP</p>
          <p className="font-bold">Total: {total.toFixed(2)} EGP</p>
        </div>

        {/* Confirm Button */}
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