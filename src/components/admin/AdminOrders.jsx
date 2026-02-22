// src/components/admin/AdminOrders.jsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function AdminOrders({
    orders,
    promoCodes,
    statuses,
    statusColors,
    openDropdown,
    setOpenDropdown,
    handleStatusChange,
    handlePromoChange,
    handleDeleteOrder,
}) {
    
    const formatDate = (timestamp) => {
        if (!timestamp) return "—";
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-4 bg-white rounded shadow">
            <h2 className="text-xl font-black font-archivo uppercase mb-4 text-[#1C3C85]">Manage Orders</h2>
            
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full table-auto border-collapse">
                    <thead className="bg-gray-100 font-archivo text-[10px] uppercase tracking-widest text-gray-600">
                        <tr>
                            <th className="p-4 text-left border-b whitespace-nowrap">Order ID</th>
                            <th className="p-4 text-left border-b whitespace-nowrap">Date</th>
                            <th className="p-4 text-left border-b whitespace-nowrap">Customer</th>
                            <th className="p-4 text-left border-b whitespace-nowrap">Phone</th>
                            <th className="p-4 text-left border-b whitespace-nowrap">Governorate</th>
                            <th className="p-4 text-left border-b min-w-[250px]">Full Address</th>
                            <th className="p-4 text-left border-b">Items</th>
                            <th className="p-4 text-left border-b">Payment</th> 
                            <th className="p-4 text-left border-b">Payer Phone</th>        
                            <th className="p-4 text-left border-b">Total</th>
                            <th className="p-4 text-left border-b">Status</th>
                            <th className="p-4 text-left border-b">Promo</th>
                            <th className="p-4 text-left border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {orders.map(order => {
                            const currentStatus = order.status || "New";
                            return (
                                <tr key={order.id} className="hover:bg-blue-50/30 border-b transition-colors">
                                    <td className="p-4 font-mono text-[11px] text-gray-600 break-all select-all">{order.id}</td>
                                    <td className="p-4 whitespace-nowrap text-gray-700">{formatDate(order.createdAt)}</td>
                                    <td className="p-4 font-bold whitespace-nowrap">{order.customerName || "—"}</td>
                                    <td className="p-4 whitespace-nowrap">{order.phoneNumber || "—"}</td>
                                    <td className="p-4 font-medium uppercase text-xs">{order.governorate || "—"}</td>
                                    <td className="p-4 text-xs leading-relaxed whitespace-pre-wrap min-w-[200px]">{order.address || "—"}</td>
                                    <td className="p-4 min-w-[180px]">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="mb-2 text-[11px] border-b border-gray-100 last:border-0 pb-1">
                                                <span className="font-bold text-gray-800">{item.title}</span> 
                                                {!item.isCustomSet && <span className="text-blue-600 font-bold ml-1">x{item.quantity}</span>}
                                                {item.isCustomSet && item.selectedSamples && (
                                                    <div className="text-[10px] text-blue-500 italic mt-0.5">
                                                        Samples: {item.selectedSamples.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        )) || "—"}
                                    </td>
                                    <td className="p-4 text-xs font-bold text-gray-500">{order.paymentMethod || "COD"}</td>
                                    <td className="p-4 text-xs font-mono">{order.instapayPhone || "—"}</td>
                                    <td className="p-4 font-black text-[#1C3C85] whitespace-nowrap">EGP {order.total?.toLocaleString() || "0.00"}</td>
                                    <td className="p-4 relative">
                                        <button
                                            onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center shadow-sm border ${statusColors[currentStatus]}`}
                                        >
                                          {currentStatus} <ChevronDown className="w-3 h-3 ml-1" />
                                        </button>
                                        {openDropdown === order.id && (
                                            <div className="absolute z-50 mt-1 bg-white border rounded-xl shadow-2xl w-36 left-0 overflow-hidden">
                                                {statuses.map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleStatusChange(order.id, status)}
                                                        className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-[10px] font-bold uppercase border-b last:border-0"
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={order.promoCode || ""}
                                            onChange={e => handlePromoChange(order.id, e.target.value)}
                                            className="border rounded text-[10px] p-1.5 bg-gray-50 font-bold"
                                        >
                                            <option value="">None</option>
                                            {promoCodes.map(promo => (
                                                <option key={promo.id} value={promo.code}>{promo.code}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => {
                                                if(window.confirm("Are you sure you want to delete this order?")) {
                                                    handleDeleteOrder(order.id);
                                                }
                                            }}
                                            className="text-red-400 hover:text-red-700 font-bold text-[10px] uppercase transition-colors"
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