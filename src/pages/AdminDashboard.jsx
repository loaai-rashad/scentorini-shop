// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, DollarSign, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔒 Protect dashboard
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      navigate("/admin-login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  if (loading) {
    return <div className="p-8 text-center">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <p>No orders found.</p>
        <button
          onClick={handleLogout}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
<div className="p-8">
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold">Admin Dashboard - Orders</h1>
    <button
      onClick={handleLogout}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Logout
    </button>
  </div>

  {/* 🔽 Quick Stats */}
<div className="mb-6 flex gap-6 flex-wrap">
  {/* Total Orders */}
  <div className="bg-blue-500 text-white shadow rounded p-4 w-48 flex items-center justify-between">
    <div>
      <p className="text-sm opacity-90">Total Orders</p>
      <p className="text-2xl font-bold">{orders.length}</p>
    </div>
    <ShoppingCart className="w-8 h-8 opacity-80" />
  </div>

  {/* Grand Total */}
  <div className="bg-green-500 text-white shadow rounded p-4 w-48 flex items-center justify-between">
    <div>
      <p className="text-sm opacity-90">Grand Total</p>
      <p className="text-2xl font-bold">
        EGP
        {orders
          .reduce((sum, order) => sum + (order.total || 0), 0)
          .toFixed(2)}
      </p>
    </div>
    <DollarSign className="w-8 h-8 opacity-80" />
  </div>

  {/* Average Order Value */}
  <div className="bg-purple-500 text-white shadow rounded p-4 w-48 flex items-center justify-between">
    <div>
      <p className="text-sm opacity-90">Avg. Order Value</p>
      <p className="text-2xl font-bold">
        EGP
        {orders.length > 0
          ? (
              orders.reduce((sum, order) => sum + (order.total || 0), 0) /
              orders.length
            ).toFixed(2)
          : "0.00"}
      </p>
    </div>
    <BarChart3 className="w-8 h-8 opacity-80" />
  </div>
</div>


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
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="hover:bg-gray-50">
            <td className="p-3 border-b">{order.id}</td>
            <td className="p-3 border-b">{order.customerName || "—"}</td>
            <td className="p-3 border-b">{order.phoneNumber || "—"}</td>
            <td className="p-3 border-b">{order.governorate || "—"}</td>
            <td className="p-3 border-b">{order.address || "—"}</td>
            <td className="p-3 border-b">
              {order.items?.map((item) => (
                <div key={item.id} className="mb-1">
                  {item.title} x {item.quantity} (EGP{item.price.toFixed(2)})
                </div>
              )) || "—"}
            </td>
            <td className="p-3 border-b font-semibold">
              EGP{order.total?.toFixed(2) || "0.00"}
            </td>
          </tr>
        ))}

        {/* 🔽 Summary Row */}
        <tr className="bg-gray-100 font-bold">
          <td colSpan="6" className="p-3 text-right border-t">
            Grand Total:
          </td>
          <td className="p-3 border-t">
            EGP
            {orders
              .reduce((sum, order) => sum + (order.total || 0), 0)
              .toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>


  );
}
