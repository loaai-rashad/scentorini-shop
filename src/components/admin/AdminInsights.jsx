import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';

// Component for displaying insights
export default function AdminInsights() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Data Aggregation Logic ---
    useEffect(() => {
        const fetchAndAggregateOrders = async () => {
            setLoading(true);
            try {
                // Fetch all orders, ordered by creation date
                const ordersRef = collection(db, "orders");
                // Note: Firestore doesn't allow easy server-side grouping, so we fetch all 
                // relevant data and process it in the client (safe for small to medium scale apps).
                const q = query(ordersRef, orderBy("createdAt", "asc"));
                const snapshot = await getDocs(q);

                const aggregation = {};

                snapshot.docs.forEach(doc => {
                    const order = doc.data();
                    
                    // 1. Skip non-delivered/non-paid orders for revenue stats (Optional: adjust this status check as needed)
                    if (order.status !== 'Delivered') return; 

                    // Get month and year from Firestore Timestamp
                    const date = order.createdAt?.toDate();
                    if (!date) return; 
                    
                    // Format key as YYYY-MM (e.g., 2026-01) for correct sorting and grouping
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

                    // Calculate NET REVENUE (Excluding shipping)
                    const netRevenue = (order.subtotal || 0) - (order.discount || 0);

                    if (!aggregation[monthKey]) {
                        aggregation[monthKey] = { 
                            name: monthLabel, // For the chart X-axis
                            netRevenue: 0, 
                            orderCount: 0 
                        };
                    }

                    aggregation[monthKey].netRevenue += netRevenue;
                    aggregation[monthKey].orderCount += 1;
                });

                // Convert the aggregated object into a sorted array
                const sortedData = Object.keys(aggregation)
                    .sort()
                    .map(key => ({ 
                        ...aggregation[key],
                        // Format revenue for display
                        netRevenue: parseFloat(aggregation[key].netRevenue.toFixed(2))
                    }));

                setMonthlyData(sortedData);

            } catch (error) {
                console.error("Error fetching and aggregating insights:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndAggregateOrders();
    }, []);
    // --- End Data Aggregation Logic ---


    return (
        <div className="space-y-8">
            {/* --- 1. Google Analytics Link (Existing Content) --- */}
            <div className="bg-white p-6 shadow-md rounded-lg space-y-4">
                <h3 className="text-xl font-semibold text-indigo-700">Google Analytics Insights</h3>
                <p className="text-gray-700">
                    Access detailed e-commerce performance graphs, user acquisition reports, and conversion funnels directly in your Google Analytics 4 property.
                </p>
                <a
                    href="https://analytics.google.com/analytics/web/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150"
                >
                    Go to GA4 Reports
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
                <p className="text-xs text-gray-500 mt-4">
                    * Ensure you are logged into the Google Account associated with the GA4 property: G-4RETXH072M.
                </p>
            </div>

            {/* --- 2. Custom Sales Analytics --- */}
            <div className="p-6 bg-white shadow-md rounded-lg">
                <h3 className="text-xl font-semibold text-green-700 mb-6 border-b pb-2">Custom Monthly Sales Performance</h3>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading sales data and generating charts...</div>
                ) : monthlyData.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No delivered orders found for analysis.</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Monthly Net Revenue Trend (Line Chart) */}
                        <div className="h-80 w-full">
                            <h4 className="font-bold text-lg mb-2">Net Revenue Trend (Excl. Shipping)</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Net Revenue']} />
                                    <Legend />
                                    <Line type="monotone" dataKey="netRevenue" stroke="#8884d8" activeDot={{ r: 8 }} name="Net Revenue" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        
                        {/* Monthly Order Count Comparison (Bar Chart) */}
                        <div className="h-80 w-full">
                            <h4 className="font-bold text-lg mb-2">Orders Per Month</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip formatter={(value) => [value, 'Orders']} />
                                    <Legend />
                                    <Bar dataKey="orderCount" fill="#4CAF50" name="Total Orders" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                )}
            </div>

            {/* --- 3. Future Insight Idea --- */}
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                <p className="font-bold">💡 Next Insight Idea: Top Product Performance</p>
                <p className="text-sm mt-1">
                    To expand your insights, you could aggregate the `items` array within each order to identify your Top 5 best-selling products by quantity over a period, giving you direct inventory and marketing focus.
                </p>
            </div>
        </div>
    );
}