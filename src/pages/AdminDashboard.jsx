// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null); // track which order dropdown is open
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

  // Fetch orders
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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setOpenDropdown(null); // close dropdown after selection
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  const totalSubtotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  if (loading) return <div className="p-8 text-center">Loading orders...</div>;
  if (orders.length === 0)
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
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const currentStatus = order.status || "New";

              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{order.id}</td>
                  <td className="p-3 border-b">{order.customerName || "—"}</td>
                  <td className="p-3 border-b">{order.phoneNumber || "—"}</td>
                  <td className="p-3 border-b">{order.governorate || "—"}</td>
                  <td className="p-3 border-b">{order.address || "—"}</td>
                  <td className="p-3 border-b">
                    {order.items?.map((item) => (
                      <div key={item.id} className="mb-1">
                        {item.title} x {item.quantity} (${item.price.toFixed(2)})
                      </div>
                    )) || "—"}
                  </td>
                  <td className="p-3 border-b font-semibold">
                    ${order.total?.toFixed(2) || "0.00"}
                  </td>
                  <td className="p-3 border-b relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(openDropdown === order.id ? null : order.id)
                      }
                      className={`flex items-center justify-between w-32 px-3 py-1 rounded font-medium text-sm ${statusColors[currentStatus]} focus:outline-none`}
                    >
                      {currentStatus}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </button>

                    {openDropdown === order.id && (
                      <div className="absolute mt-1 w-32 bg-white border rounded shadow-lg z-10 animate-slide-down">
                        {statuses.map((status) => (
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
                </tr>
              );
            })}

            {/* Subtotal row */}
            <tr className="bg-gray-100 font-bold">
              <td className="p-3 border-b" colSpan={6}>
                Total Subtotal
              </td>
              <td className="p-3 border-b" colSpan={2}>
                ${totalSubtotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tailwind animation */}
      <style>
        {`
          @keyframes slideDown {
            from {opacity:0; transform: translateY(-10px);}
            to {opacity:1; transform: translateY(0);}
          }
          .animate-slide-down {
            animation: slideDown 0.2s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
}
