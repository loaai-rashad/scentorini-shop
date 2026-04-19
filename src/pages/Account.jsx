import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom"; // Added Link
import { Package, Star, Clock, ShoppingBag } from "lucide-react";

const Account = () => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserOrders(currentUser.email);
      } else {
        navigate("/"); 
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchUserOrders = async (userEmail) => {
    try {
      // Corrected: Searching 'email' field in Firestore to match logged-in userEmail
      const q = query(
        collection(db, "orders"),
        where("email", "==", userEmail), 
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // --- LOYALTY LOGIC START ---
  // Filter for ONLY successful orders for progress calculation
  const successfulOrders = orders.filter(o => 
    o.status !== "Cancelled" && 
    o.status !== "Returned"
  );
  // --- LOYALTY LOGIC END ---

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-archivo">
      {/* Header Section */}
      <div className="bg-[#1C3C85] text-white py-12 px-4 shadow-lg">
        <div className="container mx-auto max-w-4xl flex flex-col md:flex-row items-center gap-6">
          <img 
            src={user.photoURL} 
            alt="Profile" 
            className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl"
          />
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Hello, {user.displayName?.split(' ')[0]}!
            </h1>
            <p className="text-blue-100 opacity-80">{user.email}</p>
            <div className="mt-4 inline-flex items-center bg-white/10 px-4 py-1 rounded-full border border-white/20">
              <Star className="w-4 h-4 text-yellow-400 mr-2 fill-yellow-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Loyalty Member</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Progress Bar - Uses 'successfulOrders' now */}
          <div className="md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-black uppercase text-[#1C3C85]">Reward Progress</h3>
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                {successfulOrders.length % 5} / 4 Orders toward 25% OFF
              </span>
            </div>
            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step}
                  className={`flex-1 border-r border-white last:border-0 transition-all ${
                    (successfulOrders.length % 5) >= step ? 'bg-orange-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            {(successfulOrders.length % 5) === 4 ? (
               <p className="text-[11px] font-bold text-orange-600 uppercase mt-3 italic animate-pulse">
                 🔥 Next order is 25% OFF! Discount will apply at checkout.
               </p>
            ) : (
               <p className="text-[11px] font-bold text-gray-400 uppercase mt-3">
                 Complete 4 orders to unlock a 25% discount on your 5th purchase.
               </p>
            )}
          </div>

          {/* Stats Cards - Shows total history but we could use successfulOrders.length if preferred */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Package className="text-blue-600 mb-2" />
            <span className="text-2xl font-black">{orders.length}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Orders</span>
          </div>

          {/* Recent Orders Section */}
          <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black uppercase text-[#1C3C85] mb-6 border-b pb-4">Recent Orders</h2>
            
            {loading ? (
              <p className="text-center py-10 text-gray-400">Loading your history...</p>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-gray-50 rounded-xl border border-gray-100 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                            <ShoppingBag className="w-5 h-5 text-[#1C3C85]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Order #{order.id.slice(-6)}</p>
                            <p className="font-bold text-gray-800">EGP {order.total?.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex justify-between md:flex-col md:text-right items-center md:items-end">
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        order.status === 'Returned' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status || "Processing"}
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                        {order.createdAt?.seconds 
                            ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB') 
                            : 'Date unavailable'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 font-medium">No orders found yet for {user.email}.</p>
                <Link to="/" className="text-blue-600 font-bold text-sm underline mt-2 inline-block">Start Shopping</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;