// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });
  const navigate = useNavigate();

  const statuses = ["New", "Packed", "Shipped", "Delivered"];
  const statusColors = {
    New: "bg-white text-gray-800 border border-gray-300",
    Packed: "bg-yellow-200 text-yellow-800",
    Shipped: "bg-blue-200 text-blue-800",
    Delivered: "bg-green-200 text-green-800",
  };

  // Protect dashboard
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) navigate("/admin-login");
  }, [navigate]);

  // Fetch promo codes once
  useEffect(() => {
    const fetchPromoCodes = async () => {
      try {
        const promoRef = collection(db, "promocodes");
        const promoSnap = await getDocs(promoRef);
        const promoData = promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPromoCodes(promoData);
      } catch (error) {
        console.error("Error fetching promo codes:", error);
      }
    };
    fetchPromoCodes();
  }, []);

  // Real-time orders fetching
  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          status: doc.data().status || "New",
          ...doc.data(),
        }));
        setOrders(ordersData);
        setLoading(false);
      },
      error => {
        console.error("Error fetching orders:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  // Update order status
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOpenDropdown(null);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  // Update promo code on order
  const handlePromoChange = async (orderId, promoCode) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { promoCode });
      setOpenDropdown(null);
    } catch (error) {
      console.error("Error updating promo code:", error);
      alert("Failed to update promo code.");
    }
  };

  // Create new promo
  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.discount) return alert("Enter code and discount");
    try {
      await addDoc(collection(db, "promocodes"), {
        code: newPromo.code,
        discount: parseFloat(newPromo.discount),
        active: true,
      });
      setNewPromo({ code: "", discount: "" });
      const promoSnap = await getDocs(collection(db, "promocodes"));
      setPromoCodes(promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error creating promo:", error);
      alert("Failed to create promo code");
    }
  };

  const togglePromoActive = async promo => {
    try {
      const promoRef = doc(db, "promocodes", promo.id);
      await updateDoc(promoRef, { active: !promo.active });
      setPromoCodes(prev =>
        prev.map(p => (p.id === promo.id ? { ...p, active: !p.active } : p))
      );
    } catch (error) {
      console.error("Error toggling promo:", error);
      alert("Failed to toggle promo code");
    }
  };

  // Quick stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status || "New"] = (acc[order.status || "New"] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Promo Code Management */}
      <div className="mb-6 p-4 bg-gray-100 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Manage Promo Codes</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Code"
            value={newPromo.code}
            onChange={e => setNewPromo(prev => ({ ...prev, code: e.target.value }))}
            className="px-2 py-1 border rounded w-32"
          />
          <input
            type="number"
            placeholder="Discount %"
            value={newPromo.discount}
            onChange={e => setNewPromo(prev => ({ ...prev, discount: e.target.value }))}
            className="px-2 py-1 border rounded w-24"
          />
          <button
            onClick={handleCreatePromo}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Add Promo
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {promoCodes.map(p => (
            <div
              key={p.id}
              className={`px-3 py-1 rounded border flex items-center justify-between gap-2 ${
                p.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
              }`}
            >
              <span>{p.code} ({p.discount}%)</span>
              <button
                onClick={() => togglePromoActive(p)}
                className="px-2 py-0.5 rounded bg-gray-300 hover:bg-gray-400 text-sm"
              >
                {p.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500 text-sm">Total Orders</h2>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500 text-sm">Total Revenue</h2>
          <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
        </div>
        {statuses.map(status => (
          <div key={status} className={`p-4 shadow rounded ${statusColors[status]}`}>
            <h2 className="text-gray-500 text-sm">{status} Orders</h2>
            <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
          </div>
        ))}
      </div>

      {/* Orders Table */}
<div className="overflow-x-auto">
  <table className="min-w-full border border-gray-200">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-3 text-left border-b">Order ID</th>
        <th className="p-3 text-left border-b">Customer</th>
        <th className="p-3 text-left border-b">Phone</th>
        <th className="p-3 text-left border-b">Governorate</th>
        <th className="p-3 text-left border-b">Address</th>
        <th className="p-3 text-left border-b">Items</th>
        <th className="p-3 text-left border-b">Total</th>
        <th className="p-3 text-left border-b">Status</th>
        <th className="p-3 text-left border-b">Promo Code</th>
      </tr>
    </thead>
    <tbody>
      {orders.map(order => {
        const currentStatus = order.status || "New";
        return (
          <tr key={order.id} className="hover:bg-gray-50">
            <td className="p-3 border-b">{order.id}</td>
            <td className="p-3 border-b">{order.customerName || "—"}</td>
            <td className="p-3 border-b">{order.phoneNumber || "—"}</td>
            <td className="p-3 border-b">{order.governorate || "—"}</td>
            <td className="p-3 border-b">{order.address || "—"}</td>
            <td className="p-3 border-b">
              {order.items?.map(item => (
                <div key={item.id} className="mb-1">
                  {item.title} x {item.quantity} (${item.price.toFixed(2)})
                </div>
              )) || "—"}
            </td>
            <td className="p-3 border-b font-semibold">${order.total?.toFixed(2) || "0.00"}</td>

            {/* Status Dropdown */}
            <td className="p-3 border-b relative">
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === `status-${order.id}` ? null : `status-${order.id}`)
                }
                className={`flex items-center justify-between w-32 px-3 py-1 rounded font-medium text-sm ${statusColors[currentStatus]} focus:outline-none`}
              >
                {currentStatus} <ChevronDown className="ml-2 h-4 w-4" />
              </button>
              {openDropdown === `status-${order.id}` && (
                <div className="absolute mt-1 w-32 bg-white border rounded shadow-lg z-10 animate-slide-down">
                  {statuses.map(status => (
                    <div
                      key={status}
                      onClick={() => handleStatusChange(order.id, status)}
                      className="px-3 py-1 text-sm hover:bg-gray-100 cursor-pointer"
                    >
                      {status}
                    </div>
                  ))}
                </div>
              )}
            </td>

            {/* Promo Code (plain text) */}
            <td className="p-3 border-b">{order.promoCode || "None"}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>


      <style>{`
        @keyframes slideDown {
          from {opacity:0; transform: translateY(-10px);}
          to {opacity:1; transform: translateY(0);}
        }
        .animate-slide-down {
          animation: slideDown 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
