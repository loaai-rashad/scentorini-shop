import React, { useMemo } from 'react';

export default function LoyalCustomers({ orders }) {
    const loyalData = useMemo(() => {
        const customerMap = new Map();
        // Helper to find existing record by phone or email
        const findExistingKey = (phone, email) => {
            for (let [key, data] of customerMap.entries()) {
                if ((phone && data.phones.has(phone)) || (email && data.emails.has(email))) {
                    return key;
                }
            }
            return null;
        };

        orders.forEach(order => {
            // We consider 'Delivered' or successful orders mostly, 
            // but for now, let's process all unless you want to filter by status
            const phone = order.phoneNumber?.trim();
            const email = order.email?.trim() || order.customerEmail?.trim();
            const name = order.customerName || "Unknown";

            const existingKey = findExistingKey(phone, email);

            if (existingKey) {
                const current = customerMap.get(existingKey);
                current.orderCount += 1;
                current.totalSpent += (order.total || 0);
                if (phone) current.phones.add(phone);
                if (email) current.emails.add(email);
                current.lastOrder = new Date(order.createdAt?.seconds * 1000 || order.createdAt);
            } else {
                const newKey = phone || email || `guest-${Math.random()}`;
                customerMap.set(newKey, {
                    name,
                    phones: new Set(phone ? [phone] : []),
                    emails: new Set(email ? [email] : []),
                    orderCount: 1,
                    totalSpent: order.total || 0,
                    lastOrder: new Date(order.createdAt?.seconds * 1000 || order.createdAt)
                });
            }
        });

        // Convert Map to Array and filter for "Loyal" (e.g., more than 2 orders)
        return Array.from(customerMap.values())
            .filter(c => c.orderCount >= 2) // You can change this threshold
            .sort((a, b) => b.totalSpent - a.totalSpent); // Sort by highest spenders
    }, [orders]);

    return (
        <div className="p-4 bg-white rounded shadow mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black font-archivo uppercase text-[#1C3C85]">
                    Loyal Customers <span className="text-sm bg-blue-100 px-2 py-1 rounded ml-2">{loyalData.length}</span>
                </h2>
                <p className="text-xs text-gray-500 font-bold uppercase">Threshold: 2+ Orders</p>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full table-auto border-collapse">
                    <thead className="bg-gray-50 font-archivo text-[10px] uppercase tracking-widest text-gray-600">
                        <tr>
                            <th className="p-4 text-left border-b">Customer Name</th>
                            <th className="p-4 text-left border-b">Contact Info</th>
                            <th className="p-4 text-center border-b">Orders</th>
                            <th className="p-4 text-left border-b">Total Spent</th>
                            <th className="p-4 text-right border-b">Last Order</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {loyalData.map((customer, idx) => (
                            <tr key={idx} className="hover:bg-green-50/30 border-b transition-colors">
                                <td className="p-4 font-bold text-gray-800">{customer.name}</td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        {[...customer.phones].map(p => (
                                            <span key={p} className="text-[11px] font-mono bg-gray-100 w-fit px-1 rounded">{p}</span>
                                        ))}
                                        {[...customer.emails].map(e => (
                                            <span key={e} className="text-[11px] text-blue-600">{e}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-center font-black text-blue-600">
                                    {customer.orderCount}
                                </td>
                                <td className="p-4 font-black text-[#1C3C85]">
                                    EGP {customer.totalSpent.toLocaleString()}
                                </td>
                                <td className="p-4 text-right text-xs text-gray-500">
                                    {customer.lastOrder.toLocaleDateString('en-GB')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}