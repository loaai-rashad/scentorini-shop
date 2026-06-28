// src/components/admin/AdminOrders.jsx
import React, { useState, useMemo } from 'react';
import { Search, MessageCircle, Eye, Trash2, Download, X, Phone, MapPin, CreditCard } from 'lucide-react';
import { toast, confirmDialog } from './ui/notify';

export default function AdminOrders({
    orders,
    promoCodes,
    statuses,
    statusColors,
    handleStatusChange,
    handlePromoChange,
    handleDeleteOrder,
}) {
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [detailOrder, setDetailOrder] = useState(null);

    const formatDate = (timestamp) => {
        if (!timestamp) return "—";
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Build an Egyptian wa.me link from a local phone number
    const waLink = (phone) => {
        const digits = String(phone || "").replace(/\D/g, "");
        if (!digits) return null;
        let intl = digits;
        if (digits.startsWith("0")) intl = "20" + digits.slice(1);
        else if (!digits.startsWith("20")) intl = "20" + digits;
        return `https://wa.me/${intl}`;
    };

    const itemsSummary = (order) =>
        (order.items || [])
            .map((it) => `${it.title}${it.size ? ` (${it.size})` : ""}${!it.isCustomSet ? ` ×${it.quantity || 1}` : ""}`)
            .join(", ");

    // --- Search + status filter ---
    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (statusFilter !== "All" && (o.status || "New") !== statusFilter) return false;
            if (!term) return true;
            return [o.id, o.customerName, o.phoneNumber, o.governorate]
                .filter(Boolean)
                .some((f) => String(f).toLowerCase().includes(term));
        });
    }, [orders, search, statusFilter]);

    // --- Selection ---
    const toggleRow = (id) =>
        setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id));
    const toggleSelectAll = () =>
        setSelectedOrderIds(allFilteredSelected ? [] : filteredOrders.map((o) => o.id));

    const confirmDelete = async (id) => {
        const ok = await confirmDialog({
            title: "Delete order",
            message: "This permanently removes the order. This cannot be undone.",
            confirmText: "Delete",
        });
        if (ok) handleDeleteOrder(id);
    };

    // --- Excel export (selected) ---
    const handleExportToExcel = () => {
        const targetOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
        if (targetOrders.length === 0) {
            toast.error("Select at least one order to export.");
            return;
        }
        const headers = [
            "Order ID", "Date", "Customer Name", "Phone Number", "Governorate", "Full Address",
            "Purchased Items", "Payment Method", "InstaPay Payer Phone", "Total Price (EGP)",
            "Loyalty Order?", "Order Status", "Applied Promo",
        ];
        const rows = targetOrders.map((o) => {
            const itemsString = (o.items || []).map((item) => {
                let summary = `${item.title}${item.size ? ` (${item.size})` : ''}`;
                if (item.isCustomSet && item.selectedSamples) summary += ` [Samples: ${item.selectedSamples.join(', ')}]`;
                else summary += ` x${item.quantity || 1}`;
                return summary;
            }).join(" | ");
            return [
                o.id || "", formatDate(o.createdAt), o.customerName || "—", o.phoneNumber || "—",
                o.governorate || "—", o.address || "—", itemsString || "—", o.paymentMethod || "COD",
                o.instapayPhone || "—", o.total || 0, o.isLoyaltyOrder ? "YES" : "NO",
                o.status || "New", o.promoCode || "None",
            ];
        });
        let xmlContent = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Scentorini Orders"><Table>`;
        xmlContent += '<Row>';
        headers.forEach((h) => { xmlContent += `<Cell><Data ss:Type="String">${h}</Data></Cell>`; });
        xmlContent += '</Row>';
        rows.forEach((r) => {
            xmlContent += '<Row>';
            r.forEach((val, idx) => {
                const type = (idx === 9) ? "Number" : "String";
                xmlContent += `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
            });
            xmlContent += '</Row>';
        });
        xmlContent += '</Table></Worksheet></Workbook>';
        const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Scentorini_Orders_Export_${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${targetOrders.length} order(s).`);
    };

    return (
        <div className="font-archivo">
            <h2 className="text-xl font-black uppercase mb-4 text-[#1C3C85]">Manage Orders</h2>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, phone, order ID…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-stone-600 outline-none focus:ring-2 focus:ring-[#1C3C85]/20 cursor-pointer"
                >
                    <option value="All">All statuses</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Selection + export bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer">
                    <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#1C3C85] focus:ring-[#1C3C85] w-4 h-4"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                    />
                    Select all · <strong className="text-[#1C3C85]">{selectedOrderIds.length}</strong> selected
                </label>
                <button
                    onClick={handleExportToExcel}
                    className="flex items-center gap-2 bg-[#1C3C85] text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 shadow-sm transition"
                >
                    <Download className="w-3.5 h-3.5" /> Export ({selectedOrderIds.length})
                </button>
            </div>

            {/* Order cards — responsive grid, no horizontal scroll */}
            {filteredOrders.length === 0 ? (
                <p className="text-center text-gray-400 py-16 font-bold uppercase text-xs tracking-widest">
                    {search || statusFilter !== "All" ? "No orders match your filters." : "No orders yet."}
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredOrders.map((order) => {
                        const currentStatus = order.status || "New";
                        const isSelected = selectedOrderIds.includes(order.id);
                        const wa = waLink(order.phoneNumber);
                        return (
                            <div
                                key={order.id}
                                className={`rounded-2xl border p-4 transition-shadow hover:shadow-md ${isSelected ? "border-[#1C3C85] bg-blue-50/40" : "border-gray-200 bg-white"}`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-[#1C3C85] focus:ring-[#1C3C85] w-4 h-4 flex-shrink-0"
                                            checked={isSelected}
                                            onChange={() => toggleRow(order.id)}
                                        />
                                        <span className="font-mono text-[10px] text-gray-400 truncate">#{order.id.slice(-6)}</span>
                                    </label>
                                    <select
                                        value={currentStatus}
                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                        className={`text-[10px] font-black uppercase tracking-tight rounded-full px-2 py-1 border cursor-pointer outline-none ${statusColors[currentStatus] || ""}`}
                                    >
                                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Customer */}
                                <div className="mt-3">
                                    <p className="font-bold text-gray-900 text-sm truncate">{order.customerName || "—"}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> {order.phoneNumber || "—"}
                                        <span className="mx-1">·</span>
                                        <span className="uppercase">{order.governorate || "—"}</span>
                                    </p>
                                </div>

                                {/* Items */}
                                <p className="mt-2 text-xs text-gray-600 line-clamp-2 leading-snug">{itemsSummary(order) || "—"}</p>

                                {/* Total */}
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="font-black text-[#1C3C85]">EGP {order.total?.toLocaleString() || 0}</span>
                                    {order.isLoyaltyOrder && (
                                        <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase border border-orange-200">⭐ Loyalty</span>
                                    )}
                                    <span className="text-[10px] text-gray-400">{formatDate(order.createdAt)}</span>
                                </div>

                                {/* Actions */}
                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                                    <button
                                        onClick={() => setDetailOrder(order)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#1C3C85] bg-blue-50 hover:bg-blue-100 rounded-lg py-2 transition"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> View
                                    </button>
                                    {wa && (
                                        <a
                                            href={wa}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-white bg-[#25D366] hover:brightness-95 rounded-lg py-2 px-3 transition"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" /> Chat
                                        </a>
                                    )}
                                    <button
                                        onClick={() => confirmDelete(order.id)}
                                        className="flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg py-2 px-2.5 hover:bg-red-50 transition"
                                        aria-label="Delete order"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail modal */}
            {detailOrder && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailOrder(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {/* Modal header */}
                        <div className="sticky top-0 bg-[#1C3C85] text-white p-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-tight">Order Details</h3>
                                <p className="font-mono text-[11px] text-white/70 break-all">#{detailOrder.id}</p>
                            </div>
                            <button onClick={() => setDetailOrder(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Customer */}
                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Customer</p>
                                <p className="font-bold text-gray-900">{detailOrder.customerName || "—"}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {detailOrder.phoneNumber || "—"}</p>
                                {detailOrder.email && <p className="text-sm text-gray-600">{detailOrder.email}</p>}
                                <p className="text-sm text-gray-600 flex items-start gap-1.5 mt-1"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> <span>{detailOrder.address || "—"}, <span className="uppercase">{detailOrder.governorate}</span></span></p>
                                {waLink(detailOrder.phoneNumber) && (
                                    <a href={waLink(detailOrder.phoneNumber)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-black uppercase tracking-wide text-white bg-[#25D366] rounded-lg py-2 px-3">
                                        <MessageCircle className="w-3.5 h-3.5" /> Message on WhatsApp
                                    </a>
                                )}
                            </div>

                            {/* Payment */}
                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Payment</p>
                                <p className="text-sm text-gray-700 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> {detailOrder.paymentMethod || "COD"}</p>
                                {detailOrder.instapayPhone && <p className="text-sm text-gray-600 font-mono">InstaPay payer: {detailOrder.instapayPhone}</p>}
                            </div>

                            {/* Items */}
                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Items</p>
                                <ul className="space-y-2">
                                    {(detailOrder.items || []).map((item, idx) => (
                                        <li key={idx} className="flex justify-between gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-800">
                                                    {item.title}
                                                    {item.size && <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{item.size}</span>}
                                                </p>
                                                {item.isCustomSet && item.selectedSamples && (
                                                    <p className="text-[11px] text-blue-500 italic">Samples: {item.selectedSamples.join(', ')}</p>
                                                )}
                                            </div>
                                            <span className="text-gray-500 whitespace-nowrap">×{item.quantity || 1}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Status + Promo + Total */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Status</p>
                                    <select
                                        value={detailOrder.status || "New"}
                                        onChange={(e) => { handleStatusChange(detailOrder.id, e.target.value); setDetailOrder({ ...detailOrder, status: e.target.value }); }}
                                        className="w-full border rounded-lg text-xs p-2 bg-gray-50 font-bold"
                                    >
                                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Promo</p>
                                    <select
                                        value={detailOrder.promoCode || ""}
                                        onChange={(e) => { handlePromoChange(detailOrder.id, e.target.value); setDetailOrder({ ...detailOrder, promoCode: e.target.value }); }}
                                        className="w-full border rounded-lg text-xs p-2 bg-gray-50 font-bold"
                                    >
                                        <option value="">None</option>
                                        {promoCodes.map((promo) => <option key={promo.id} value={promo.code}>{promo.code}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between items-baseline border-t pt-3">
                                <span className="text-sm font-black uppercase text-gray-700">Total</span>
                                <span className="text-2xl font-black text-[#1C3C85]">EGP {detailOrder.total?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
