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
  deleteDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [products, setProducts] = useState([]);
  // --- NEW STATE FOR SAMPLES ---
  const [samples, setSamples] = useState([]);
  const [newSample, setNewSample] = useState({
    title: "",
    price: "",
    stock: "",
  });
  // -----------------------------
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });
  const [newProduct, setNewProduct] = useState({
    title: "",
    subtitle: "",
    price: "",
    stock: "",
    image: "",
    description: "",
  });

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
        const promoData = promoSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
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

  // Real-time products fetching
  useEffect(() => {
    const productsRef = collection(db, "products");
    const unsubscribe = onSnapshot(productsRef, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);
  
  // --- REAL-TIME SAMPLES FETCHING ---
  useEffect(() => {
    const samplesRef = collection(db, "samples");
    const unsubscribe = onSnapshot(samplesRef, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSamples(data);
    });
    return () => unsubscribe();
  }, []);
  // ------------------------------------


  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  // Order Management
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

  const handleDeleteOrder = async id => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await deleteDoc(doc(db, "orders", id));
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Failed to delete order. Please try again.");
    }
  };

  // Promo Management (unchanged)
  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.discount)
      return alert("Enter code and discount");
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

  // Product Management (unchanged logic)
  const handleProductChange = (id, field, value) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveProduct = async id => {
    try {
      const productRef = doc(db, "products", id);
      const product = products.find(p => p.id === id);
      await updateDoc(productRef, {
        title: product.title,
        subtitle: product.subtitle,
        price: parseFloat(product.price),
        stock: parseInt(product.stock),
        image: product.image,
        description: product.description,
      });
      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.title || !newProduct.price)
      return alert("Title and price are required.");
    try {
      await addDoc(collection(db, "products"), {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
      });
      setNewProduct({
        title: "",
        subtitle: "",
        price: "",
        stock: "",
        image: "",
        description: "",
      });
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product.");
    }
  };

  const handleDeleteProduct = async id => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    }
  };

  // --- SAMPLE MANAGEMENT FUNCTIONS ---
  const handleSampleChange = (id, field, value) => {
    setSamples(prev =>
      prev.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveSample = async id => {
    try {
      const sampleRef = doc(db, "samples", id);
      const sample = samples.find(s => s.id === id);
      await updateDoc(sampleRef, {
        title: sample.title,
        price: parseFloat(sample.price),
        stock: parseInt(sample.stock),
      });
      alert("Sample updated successfully!");
    } catch (error) {
      console.error("Error updating sample:", error);
      alert("Failed to update sample.");
    }
  };

  const handleAddSample = async () => {
    if (!newSample.title || !newSample.price)
      return alert("Title and price are required.");
      
    try {
      // Check for uniqueness before adding
      const q = query(collection(db, "samples"), where("title", "==", newSample.title.trim()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return alert("A sample with this title already exists.");
      }

      await addDoc(collection(db, "samples"), {
        title: newSample.title.trim(),
        price: parseFloat(newSample.price) || 0,
        stock: parseInt(newSample.stock) || 0,
      });
      setNewSample({ title: "", price: "", stock: "" });
    } catch (error) {
      console.error("Error adding sample:", error);
      alert("Failed to add sample.");
    }
  };

  const handleDeleteSample = async id => {
    if (!window.confirm("Are you sure you want to delete this sample?")) return;
    try {
      await deleteDoc(doc(db, "samples", id));
    } catch (error) {
      console.error("Error deleting sample:", error);
      alert("Failed to delete sample.");
    }
  };
  // ------------------------------------


  // Quick stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status || "New"] = (acc[o.status || "New"] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
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
      
      {/* Promo Codes (unchanged) */}
      <div className="p-4 bg-gray-100 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Manage Promo Codes</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Code"
            value={newPromo.code}
            onChange={e =>
              setNewPromo(prev => ({ ...prev, code: e.target.value }))
            }
            className="px-2 py-1 border rounded w-32"
          />
          <input
            type="number"
            placeholder="Discount %"
            value={newPromo.discount}
            onChange={e =>
              setNewPromo(prev => ({ ...prev, discount: e.target.value }))
            }
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
              <span>
                {p.code} ({p.discount}%)
              </span>
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

      {/* --- NEW: SAMPLE MANAGEMENT --- */}
      <div className="p-4 bg-gray-100 rounded shadow">
        <h2 className="text-xl font-semibold mb-3 text-indigo-700">
          Manage Sample Inventory (`samples` collection)
        </h2>

        {/* Add Sample */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
          <input
            type="text"
            placeholder="Title (e.g., island blush)"
            value={newSample.title}
            onChange={e =>
              setNewSample(prev => ({ ...prev, title: e.target.value }))
            }
            className="px-2 py-1 border rounded col-span-2"
          />
          <input
            type="number"
            placeholder="Price (EGP)"
            value={newSample.price}
            onChange={e =>
              setNewSample(prev => ({ ...prev, price: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="number"
            placeholder="Stock"
            value={newSample.stock}
            onChange={e =>
              setNewSample(prev => ({ ...prev, stock: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <button
            onClick={handleAddSample}
            className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
          >
            Add Sample
          </button>
        </div>

        {/* Sample Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white">
            <thead className="bg-indigo-50">
              <tr>
                <th className="p-2 border-b text-left">Title</th>
                <th className="p-2 border-b">Price (EGP)</th>
                <th className="p-2 border-b">Stock</th>
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {samples.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={s.title}
                      onChange={e =>
                        handleSampleChange(s.id, "title", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="number"
                      value={s.price}
                      onChange={e =>
                        handleSampleChange(s.id, "price", e.target.value)
                      }
                      className="w-24 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="number"
                      value={s.stock}
                      onChange={e =>
                        handleSampleChange(s.id, "stock", e.target.value)
                      }
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b flex gap-2">
                    <button
                      onClick={() => handleSaveSample(s.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleDeleteSample(s.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* --- END: SAMPLE MANAGEMENT --- */}


      {/* Product Management (Moved down, unchanged logic) */}
      <div className="p-4 bg-gray-100 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Manage Products</h2>

        {/* Add Product */}
        <div className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-3">
          <input
            type="text"
            placeholder="Title"
            value={newProduct.title}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, title: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="text"
            placeholder="Subtitle"
            value={newProduct.subtitle}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, subtitle: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="number"
            placeholder="Price"
            value={newProduct.price}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, price: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="number"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, stock: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="text"
            placeholder="Image URL"
            value={newProduct.image}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, image: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <input
            type="text"
            placeholder="Short Description"
            value={newProduct.description}
            onChange={e =>
              setNewProduct(prev => ({ ...prev, description: e.target.value }))
            }
            className="px-2 py-1 border rounded"
          />
          <button
            onClick={handleAddProduct}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 col-span-1"
          >
            Add
          </button>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border-b">Image</th>
                <th className="p-2 border-b">Title</th>
                <th className="p-2 border-b">Subtitle</th>
                <th className="p-2 border-b">Price</th>
                <th className="p-2 border-b">Stock</th>
                <th className="p-2 border-b">Description</th>
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-2 border-b">
                    <img
                      src={p.image || "/perfume.jpeg"}
                      alt={p.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={p.title}
                      onChange={e =>
                        handleProductChange(p.id, "title", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="text"
                      value={p.subtitle}
                      onChange={e =>
                        handleProductChange(p.id, "subtitle", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="number"
                      value={p.price}
                      onChange={e =>
                        handleProductChange(p.id, "price", e.target.value)
                      }
                      className="w-24 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border-b">
                    <input
                      type="number"
                      value={p.stock}
                      onChange={e =>
                        handleProductChange(p.id, "stock", e.target.value)
                      }
                      className="w-20 border rounded px-2 py-1"
                    />
                  </td>

                  {/* Description column */}
                  <td className="p-2 border-b">
                    <textarea
                      value={p.description || ""}
                      onChange={e =>
                        handleProductChange(p.id, "description", e.target.value)
                      }
                      className="w-full border rounded px-2 py-1 h-20"
                    />
                  </td>

                  <td className="p-2 border-b flex gap-2">
                    <button
                      onClick={() => handleSaveProduct(p.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Orders Table (unchanged from last revision) */}
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
              <th className="p-3 text-left border-b">Payment Method</th> 
              <th className="p-3 text-left border-b">Payer Phone</th>        
              <th className="p-3 text-left border-b">Total</th>
              <th className="p-3 text-left border-b">Status</th>
              <th className="p-3 text-left border-b">Promo Code</th>
              <th className="p-3 text-left border-b">Actions</th>
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
                  
                  {/* --- ITEMS CELL (Displays Discovery Set details) --- */}
                  <td className="p-3 border-b">
                    {order.items?.map(item => (
                      <div key={item.id} className="mb-1">
                        <span className="font-semibold">
                            {item.title} 
                        </span> 
                        {/* Only display quantity for the main set item (always 1) or a standard product */}
                        {!item.isCustomSet && ` x ${item.quantity}`} 
                        
                        <span className="text-gray-500"> 
                            (${item.price.toFixed(2)})
                        </span>
                        
                        {/* --- DISCOVERY SET DETAILS --- */}
                        {item.isCustomSet && item.selectedSamples && (
                            <div className="text-xs text-blue-700 mt-0.5 ml-2 border-l-2 pl-2 border-blue-200">
                                <strong>Samples: </strong>
                                {item.selectedSamples.join(', ')}
                                <span className="text-gray-500"> ({item.priceDetails?.count} items)</span>
                            </div>
                        )}
                        {/* --- END DISCOVERY SET DETAILS --- */}

                      </div>
                    )) || "—"}
                  </td>
                  {/* --- END ITEMS CELL --- */}
                  
                  <td className="p-3 border-b font-medium">
                    {order.paymentMethod || "COD"}
                  </td>
                  <td className="p-3 border-b">
                    {order.instapayPhone || "N/A"}
                  </td>
                  
                  <td className="p-3 border-b font-semibold">
                    ${order.total?.toFixed(2) || "0.00"}
                  </td>
                  <td className="p-3 border-b relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === order.id ? null : order.id
                        )
                      }
                      className={`px-2 py-1 rounded text-sm ${statusColors[currentStatus]}`}
                    >
                      {currentStatus} <ChevronDown className="inline w-4 h-4 ml-1" />
                    </button>
                    {openDropdown === order.id && (
                      <div className="absolute z-10 mt-1 bg-white border rounded shadow w-32">
                        {statuses.map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(order.id, status)}
                            className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-sm"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-b">
                    <select
                      value={order.promoCode || ""}
                      onChange={e =>
                        handlePromoChange(order.id, e.target.value)
                      }
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">None</option>
                      {promoCodes.map(promo => (
                        <option key={promo.id} value={promo.code}>
                          {promo.code} ({promo.discount}%)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 border-b">
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}