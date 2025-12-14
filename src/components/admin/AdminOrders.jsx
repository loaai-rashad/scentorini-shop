// src/components/admin/AdminOrders.jsx

import React from 'react';
import { ChevronDown } from 'lucide-react';

// This component receives ALL orders state and ALL necessary handlers/data as props
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
    return (
        <div className="p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-3">Manage Orders</h2>
            
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