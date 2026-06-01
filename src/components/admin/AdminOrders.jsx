// src/components/admin/AdminOrders.jsx
import React, { useState } from 'react';
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
    // NEW STATE: Keep track of selected row document IDs
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);

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

    // --- NEW SELECTION HANDLERS ---
    const handleSelectRow = (orderId) => {
        setSelectedOrderIds(prev =>
            prev.includes(orderId) 
                ? prev.filter(id => id !== orderId) 
                : [...prev, orderId]
        );
    };

    const handleSelectAll = () => {
        if (selectedOrderIds.length === orders.length) {
            setSelectedOrderIds([]);
        } else {
            setSelectedOrderIds(orders.map(o => o.id));
        }
    };

    // --- NEW AUTOMATED EXCEL EXPORT CORE LOGIC ---
    const handleExportToExcel = () => {
        const targetOrders = orders.filter(o => selectedOrderIds.includes(o.id));

        if (targetOrders.length === 0) {
            alert("Please check at least one order checkbox below to export.");
            return;
        }

        // Setup headers matching your tabular column metrics
        const headers = [
            "Order ID", "Date", "Customer Name", "Phone Number", 
            "Governorate", "Full Address", "Purchased Items", 
            "Payment Method", "InstaPay Payer Phone", "Total Price (EGP)", 
            "Loyalty Order?", "Order Status", "Applied Promo"
        ];

        // Format row fields smoothly
        const rows = targetOrders.map(o => {
            const itemsString = (o.items || [])
                .map(item => {
                    let summary = `${item.title}${item.size ? ` (${item.size})` : ''}`;
                    if (item.isCustomSet && item.selectedSamples) {
                        summary += ` [Samples: ${item.selectedSamples.join(', ')}]`;
                    } else {
                        summary += ` x${item.quantity || 1}`;
                    }
                    return summary;
                })
                .join(" | ");

            return [
                o.id || "",
                formatDate(o.createdAt),
                o.customerName || "—",
                o.phoneNumber || "—",
                o.governorate || "—",
                o.address || "—",
                itemsString || "—",
                o.paymentMethod || "COD",
                o.instapayPhone || "—",
                o.total || 0,
                o.isLoyaltyOrder ? "YES" : "NO",
                o.status || "New",
                o.promoCode || "None"
            ];
        });

        // Generate custom XML compliance tags parsed natively by Microsoft Excel
        let xmlContent = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Scentorini Orders"><Table>`;
        
        // Append Headers XML
        xmlContent += '<Row>';
        headers.forEach(h => { xmlContent += `<Cell><Data ss:Type="String">${h}</Data></Cell>`; });
        xmlContent += '</Row>';

        // Append Dynamic Value rows XML
        rows.forEach(r => {
            xmlContent += '<Row>';
            r.forEach((val, idx) => {
                const type = (idx === 9) ? "Number" : "String"; // Cast order total to numerical value
                xmlContent += `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
            });
            xmlContent += '</Row>';
        });

        xmlContent += '</Table></Worksheet></Workbook>';

        // Download virtual pipeline initialization 
        const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Scentorini_Orders_Export_${new Date().toISOString().slice(0,10)}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 bg-white rounded shadow">
            <h2 className="text-xl font-black font-archivo uppercase mb-4 text-[#1C3C85]">Manage Orders</h2>
            
            {/* NEW: DYNAMIC EXPORT CONTROL PANEL PANEL BAR */}
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 font-archivo">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Selected <strong className="text-[#1C3C85] text-sm">{selectedOrderIds.length}</strong> of {orders.length} Orders
                </span>
                <button 
                    onClick={handleExportToExcel}
                    className="bg-[#1C3C85] text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 shadow-sm transition-all"
                >
                    📥 Export Selected ({selectedOrderIds.length}) to Excel
                </button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full table-auto border-collapse">
                    <thead className="bg-gray-100 font-archivo text-[10px] uppercase tracking-widest text-gray-600">
                        <tr>
                            {/* Checkbox Master Row Toggler Head Cell */}
                            <th className="p-4 text-center border-b w-10">
                                <input 
                                    type="checkbox"
                                    className="rounded border-gray-300 text-[#1C3C85] focus:ring-[#1C3C85] cursor-pointer w-4 h-4 mt-1"
                                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
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
                            const isSelected = selectedOrderIds.includes(order.id);
                            return (
                                <tr key={order.id} className={`border-b transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-blue-50/30'}`}>
                                    {/* Single Row Item Checkbox Switch Cell */}
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox"
                                            className="rounded border-gray-300 text-[#1C3C85] focus:ring-[#1C3C85] cursor-pointer w-4 h-4"
                                            checked={isSelected}
                                            onChange={() => handleSelectRow(order.id)}
                                        />
                                    </td>
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
                                                {/* Displaying Size Badge if it exists */}
                                                {item.size && (
                                                    <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-gray-200">
                                                        {item.size}
                                                    </span>
                                                )}
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
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-black text-[#1C3C85]">EGP {order.total?.toLocaleString() || "0.00"}</span>
                                            {order.isLoyaltyOrder && (
                                                <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded mt-1 uppercase tracking-tighter w-fit border border-orange-200">
                                                    ⭐ Loyalty 25% OFF
                                                </span>
                                            )}
                                        </div>
                                    </td>
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