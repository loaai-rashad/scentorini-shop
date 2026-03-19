import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc, // Added getDoc for initial fetch
  setDoc, // Added setDoc for saving settings
  updateDoc,
  addDoc,
  deleteDoc,
  where,
  deleteField, 
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

// Import modular components
import AdminOrders from '../components/admin/AdminOrders';     
import AdminProducts from '../components/admin/AdminProducts'; 
import AdminSamples from '../components/admin/AdminSamples';  
import AdminPromos from '../components/admin/AdminPromos';    
import AdminInsights from '../components/admin/AdminInsights'; 
import AdminCustomizableSections from '../components/admin/AdminCustomizableSections'; 
import AdminReviews from '../components/admin/AdminReviews';

export default function AdminDashboard() {
  // --- STATE ---
  const [orders, setOrders] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [products, setProducts] = useState([]);
  const [samples, setSamples] = useState([]);
  
  // NEW: Announcement Bar State
  const [announcement, setAnnouncement] = useState({ text: '', enabled: false });
  
  const [activeTab, setActiveTab] = useState('orders'); 
  
  // States for creation forms
  const [newSample, setNewSample] = useState({ title: "", price: "", stock: "" });
  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });
  
  const [newProduct, setNewProduct] = useState({
    title: "", 
    subtitle: "", 
    price: "", 
    stock: "", 
    images: [], 
    description: "", 
    for: "", 
    inspiredBy: "", 
  });

  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const navigate = useNavigate();

  // --- CONSTANTS ---
  const statuses = ["New", "Packed", "Shipped", "Delivered"];
  const statusColors = {
    New: "bg-white text-gray-800 border border-gray-300",
    Packed: "bg-yellow-200 text-yellow-800",
    Shipped: "bg-blue-200 text-blue-800",
    Delivered: "bg-green-200 text-green-800",
  };

  // --- DATA FETCHING ---
  // Security check
  useEffect(() => { 
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) navigate("/admin-login");
  }, [navigate]);

  // NEW: Fetch Announcement Settings
  useEffect(() => {
    const fetchAnnouncement = async () => {
        const docRef = doc(db, "siteSettings", "announcement");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setAnnouncement(docSnap.data());
        }
    };
    fetchAnnouncement();
  }, []);

  // Fetch promos once
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

  // Real-time orders
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

  // Real-time products
  useEffect(() => { 
    const productsRef = collection(db, "products");
    const unsubscribe = onSnapshot(productsRef, snapshot => {
      const data = snapshot.docs.map(doc => {
        const productData = doc.data();
        return { 
          id: doc.id, 
          ...productData,
          images: productData.images || (productData.image ? [productData.image] : [])
        };
      });
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);
  
  // Real-time samples
  useEffect(() => { 
    const samplesRef = collection(db, "samples");
    const unsubscribe = onSnapshot(samplesRef, snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSamples(data);
    });
    return () => unsubscribe();
  }, []);


  // --- MANAGEMENT HANDLERS ---
  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  // NEW: Announcement Handler
  const handleSaveAnnouncement = async () => {
    try {
        const docRef = doc(db, "siteSettings", "announcement");
        await setDoc(docRef, announcement);
        alert("Announcement Bar updated!");
    } catch (error) {
        console.error("Error saving announcement:", error);
        alert("Failed to save.");
    }
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

  // Promo Management
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

  // Product Management
  const handleProductChange = (id, field, value) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSaveProduct = async id => {
    try {
      const productRef = doc(db, "products", id);
      const product = products.find(p => p.id === id);
      const imagesToSave = (product.images || []).filter(url => url && url.length > 0).map(url => url.trim()); 
      await updateDoc(productRef, {
        title: product.title,
        subtitle: product.subtitle,
        price: parseFloat(product.price),
        stock: parseInt(product.stock),
        images: imagesToSave, 
        image: deleteField(), 
        description: product.description,
        for: product.for, 
        inspiredBy: product.inspiredBy || "", 
      });
      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.title || !newProduct.price || !newProduct.for)
      return alert("Title, price, and 'For' field are required.");
    try {
      const imagesToSave = (newProduct.images || []).filter(url => url && url.length > 0).map(url => url.trim()); 
      await addDoc(collection(db, "products"), {
        ...newProduct, 
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
        images: imagesToSave, 
      });
      setNewProduct({ title: "", subtitle: "", price: "", stock: "", images: [], description: "", for: "", inspiredBy: "" });
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

  // Sample Management
  const handleSampleChange = (id, field, value) => {
    setSamples(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
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
    if (!newSample.title || !newSample.price) return alert("Title and price are required.");
    try {
      const q = query(collection(db, "samples"), where("title", "==", newSample.title.trim()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return alert("A sample with this title already exists.");
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
  
  // --- Render Content based on activeTab ---
  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return <AdminOrders orders={orders} promoCodes={promoCodes} statuses={statuses} statusColors={statusColors} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} handleStatusChange={handleStatusChange} handlePromoChange={handlePromoChange} handleDeleteOrder={handleDeleteOrder} />;
      case 'products':
        return <AdminProducts products={products} newProduct={newProduct} setNewProduct={setNewProduct} handleProductChange={handleProductChange} handleSaveProduct={handleSaveProduct} handleAddProduct={handleAddProduct} handleDeleteProduct={handleDeleteProduct} />;
      case 'samples':
        return <AdminSamples samples={samples} newSample={newSample} setNewSample={setNewSample} handleSampleChange={handleSampleChange} handleSaveSample={handleSaveSample} handleAddSample={handleAddSample} handleDeleteSample={handleDeleteSample} />;
      case 'promos':
        return <AdminPromos promoCodes={promoCodes} newPromo={newPromo} setNewPromo={setNewPromo} handleCreatePromo={handleCreatePromo} togglePromoActive={togglePromoActive} />;
      case 'insights': 
        return <AdminInsights />;
      case 'sections': 
        return <AdminCustomizableSections />;
      case 'reviews': 
        return <AdminReviews />;
      case 'settings':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-black uppercase text-[#1C3C85] mb-4 font-archivo">Site Announcement Bar</h3>
            <div className="flex flex-col gap-6 max-w-2xl">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Ribbon Message</label>
                <input 
                  type="text" 
                  value={announcement.text} 
                  onChange={(e) => setAnnouncement({...announcement, text: e.target.value})}
                  className="w-full p-4 border rounded-xl font-bold text-sm bg-gray-50 focus:ring-2 focus:ring-[#1C3C85] outline-none"
                  placeholder="e.g. FREE SHIPPING ON ALL ORDERS"
                />
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <input 
                    type="checkbox" 
                    checked={announcement.enabled} 
                    onChange={(e) => setAnnouncement({...announcement, enabled: e.target.checked})}
                    className="w-5 h-5 accent-[#1C3C85] cursor-pointer"
                />
                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Enable Announcement Ribbon</span>
              </div>
              <button onClick={handleSaveAnnouncement} className="bg-[#1C3C85] text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-colors shadow-lg self-start">
                Apply Changes
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Quick stats
  const totalOrders = orders.length;
  const totalProductRevenue = orders.reduce((sum, o) => sum + ((o.subtotal || 0) - (o.discount || 0)), 0); 
  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status || "New"] = (acc[o.status || "New"] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Logout</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6"> 
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500 text-sm">Total Orders</h2>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500 text-sm">Product Revenue</h2>
          <p className="text-2xl font-bold">${totalProductRevenue.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-gray-500 text-sm">Total Sales</h2> 
          <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
        </div>
        {statuses.map(status => (
          <div key={status} className={`p-4 shadow rounded ${statusColors[status]} col-span-1`}> 
            <h2 className="text-gray-500 text-sm whitespace-nowrap">{status} Orders</h2>
            <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
          </div>
        ))}
      </div>
      
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'orders', name: 'Orders' },
            { id: 'products', name: 'Products' },
            { id: 'samples', name: 'Samples' },
            { id: 'promos', name: 'Promo Codes' },
            { id: 'insights', name: 'Insights' }, 
            { id: 'sections', name: 'Custom Sections' }, 
            { id: 'reviews', name: 'Reviews' },
            { id: 'settings', name: 'Site Settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-6">{renderContent()}</div>
    </div>
  );
}