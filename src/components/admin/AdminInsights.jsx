import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

export default function AdminInsights() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [mainProducts, setMainProducts] = useState([]);
    const [discoveryBreakdown, setDiscoveryBreakdown] = useState([]);
    const [upsellMap, setUpsellMap] = useState({}); // New state for pairings
    const [kpis, setKpis] = useState({ aov: 0, repeatRate: 0, totalUnits: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Function to sync the calculated pairings to Firestore
    const syncUpsellToFirestore = async () => {
        setSyncing(true);
        try {
            // We save the entire map into one document for easy fetching on product pages
            await setDoc(doc(db, "metadata", "upsell_logic"), {
                pairings: upsellMap,
                lastUpdated: new Date()
            });
            alert("Scentorini Upsell logic synced successfully!");
        } catch (error) {
            console.error("Sync Error:", error);
            alert("Failed to sync upsell data.");
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const fetchAndAggregateData = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, "orders");
                const q = query(ordersRef, orderBy("createdAt", "asc"));
                const snapshot = await getDocs(q);

                const monthAgg = {};
                const productAgg = {};
                const discoveryAgg = {};
                const pairFreq = {}; // Local temp storage for pairings
                const customerEmails = [];
                let totalRevenue = 0;
                let totalUnitsCount = 0;
                let deliveredCount = 0;

                snapshot.docs.forEach(doc => {
                    const order = doc.data();
                    if (order.status !== 'Delivered') return; 

                    deliveredCount++;
                    const date = order.createdAt?.toDate();
                    if (!date) return; 

                    const netRevenue = (order.subtotal || 0) - (order.discount || 0);
                    totalRevenue += netRevenue;
                    if (order.customerEmail) customerEmails.push(order.customerEmail);

                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthAgg[monthKey]) {
                        monthAgg[monthKey] = { name: date.toLocaleString('default', { month: 'short', year: '2-digit' }), netRevenue: 0, orderCount: 0 };
                    }
                    monthAgg[monthKey].netRevenue += netRevenue;
                    monthAgg[monthKey].orderCount += 1;

                    const items = order.items || [];
                    if (Array.isArray(items)) {
                        // --- 1. FREQUENTLY BOUGHT TOGETHER LOGIC ---
                        if (items.length > 1) {
                            items.forEach(itemA => {
                                items.forEach(itemB => {
                                    if (itemA.title !== itemB.title) {
                                        const a = itemA.title;
                                        const b = itemB.title;
                                        if (!pairFreq[a]) pairFreq[a] = {};
                                        pairFreq[a][b] = (pairFreq[a][b] || 0) + 1;
                                    }
                                });
                            });
                        }

                        // --- 2. REGULAR AGGREGATION ---
                        items.forEach(item => {
                            const qty = Number(item.quantity) || 0;
                            totalUnitsCount += qty;
                            const title = item.title || "Unknown";
                            const isDiscovery = title.toLowerCase().includes("discovery set");

                            if (isDiscovery) {
                                const parentKey = "discovery-set-total";
                                if (!productAgg[parentKey]) productAgg[parentKey] = { name: "Discovery Set (Total)", purchaseCount: 0 };
                                productAgg[parentKey].purchaseCount += qty;

                                const samples = item.selectedSamples || [];
                                if (Array.isArray(samples)) {
                                    samples.forEach(scent => {
                                        if (!discoveryAgg[scent]) discoveryAgg[scent] = { name: scent, count: 0 };
                                        discoveryAgg[scent].count += qty;
                                    });
                                }
                            } else {
                                const pId = item.id || item.productId || title;
                                if (!productAgg[pId]) productAgg[pId] = { name: title, purchaseCount: 0 };
                                productAgg[pId].purchaseCount += qty;
                            }
                        });
                    }
                });

                // Finalize the Upsell Map (Take top 2 suggestions per product)
                const finalUpsellMap = {};
                Object.keys(pairFreq).forEach(prod => {
                    finalUpsellMap[prod] = Object.entries(pairFreq[prod])
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 2)
                        .map(entry => entry[0]);
                });

                setUpsellMap(finalUpsellMap);
                setKpis({
                    totalRevenue,
                    totalUnits: totalUnitsCount,
                    aov: deliveredCount > 0 ? totalRevenue / deliveredCount : 0,
                    repeatRate: customerEmails.length > 0 ? ((customerEmails.length - new Set(customerEmails).size) / customerEmails.length) * 100 : 0
                });
                setMonthlyData(Object.values(monthAgg));
                setMainProducts(Object.values(productAgg).sort((a, b) => b.purchaseCount - a.purchaseCount));
                setDiscoveryBreakdown(Object.values(discoveryAgg).sort((a, b) => b.count - a.count));

            } catch (error) {
                console.error("Aggregation Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndAggregateData();
    }, []);

    const COLORS = ['#1C3C85', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

    return (
        <div className="space-y-6 pb-12 px-4 bg-gray-50 min-h-screen">
            {/* Header with Sync Button */}
            <div className="flex justify-between items-center pt-6">
                <h2 className="text-xl font-black text-[#1C3C85] uppercase tracking-tighter">Scentorini Insights</h2>
                <button 
                    onClick={syncUpsellToFirestore}
                    disabled={syncing || loading}
                    className="bg-[#1C3C85] text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 disabled:bg-gray-300 transition-all"
                >
                    {syncing ? "Syncing..." : "Sync Upsell Data"}
                </button>
            </div>

            {/* KPI Section */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-[#1C3C85]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total Revenue</p>
                        <p className="text-xl font-black text-[#1C3C85]">EGP {kpis.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Repeat Rate</p>
                        <p className="text-xl font-black text-green-600">{kpis.repeatRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-500">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Units Sold</p>
                        <p className="text-xl font-black text-orange-500">{kpis.totalUnits}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-gray-400">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">AOV</p>
                        <p className="text-xl font-black text-gray-800">EGP {kpis.aov.toFixed(0)}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-tighter">Analyzing Data...</div>
            ) : (
                <>
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black uppercase text-[#1C3C85] mb-6 tracking-widest">Main Product Performance</h3>
                            <div style={{ height: `${Math.max(300, mainProducts.length * 40)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mainProducts} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="purchaseCount" radius={[0, 10, 10, 0]} barSize={20}>
                                            {mainProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xs font-black uppercase text-orange-600 mb-2 tracking-widest">Inside Discovery Sets</h3>
                            {discoveryBreakdown.length > 0 ? (
                                <div style={{ height: `${Math.max(300, discoveryBreakdown.length * 40)}px` }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={discoveryBreakdown} layout="vertical">
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} axisLine={false} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#FF9800" radius={[0, 10, 10, 0]} barSize={20} name="Total Selections" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-50 rounded-xl text-gray-300 text-xs font-bold uppercase tracking-widest">
                                    No Sample Data
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upsell Preview Table */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-[#1C3C85] mb-4 tracking-widest">Upsell Suggestions Preview</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                        <th className="pb-3">Product</th>
                                        <th className="pb-3">Top Suggestions (Bought Together)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {Object.entries(upsellMap).map(([prod, suggestions]) => (
                                        <tr key={prod} className="border-b border-gray-50 last:border-0">
                                            <td className="py-3 font-bold text-gray-700">{prod}</td>
                                            <td className="py-3 text-[#1C3C85] font-medium">{suggestions.join(", ") || "None yet"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-64">
                            <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-4">Revenue Trend</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} />
                                    <YAxis tick={{fontSize: 10}} axisLine={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="netRevenue" stroke="#1C3C85" strokeWidth={3} dot={{r: 4}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-64">
                            <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-4">Order Volume</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} />
                                    <YAxis tick={{fontSize: 10}} axisLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="orderCount" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}