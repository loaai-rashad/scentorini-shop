import React, { useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Plus, X, Search, Pencil, Trash2, Copy, Pause, Play, Shuffle, Ticket, Users, CalendarClock, ShoppingBag } from 'lucide-react';
import { confirmDialog, toast } from './ui/notify';
import {
    getPromoStatus,
    ordersForPromo,
    describeDiscount,
    formatDate,
    toDate,
    normalizeCode,
} from '../../lib/promo';

const inputCls = "w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none disabled:bg-gray-100 disabled:text-gray-500";
const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1";

const STATUS_STYLES = {
    live: "bg-emerald-100 text-emerald-700",
    scheduled: "bg-blue-100 text-blue-700",
    expired: "bg-gray-200 text-gray-600",
    exhausted: "bg-amber-100 text-amber-700",
    paused: "bg-gray-100 text-gray-500",
};

const FILTERS = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "scheduled", label: "Scheduled" },
    { key: "ended", label: "Ended" },
    { key: "paused", label: "Paused" },
];

const EMPTY_FORM = {
    code: "",
    type: "percent",
    discount: "",
    maxDiscount: "",
    minOrder: "",
    usageLimit: "",
    perCustomerLimit: "",
    startsAt: "",
    expiresAt: "",
    newCustomersOnly: false,
    stackWithLoyalty: true,
    note: "",
};

// Date -> value for <input type="datetime-local"> (local time, no seconds)
const toLocalInput = (value) => {
    const d = toDate(value);
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const randomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
    return "SCENT" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const promoToForm = (p) => ({
    code: p.code || "",
    type: p.type || "percent",
    discount: p.discount ?? "",
    maxDiscount: p.maxDiscount ?? "",
    minOrder: p.minOrder ?? "",
    usageLimit: p.usageLimit ?? "",
    perCustomerLimit: p.perCustomerLimit ?? "",
    startsAt: toLocalInput(p.startsAt),
    expiresAt: toLocalInput(p.expiresAt),
    newCustomersOnly: !!p.newCustomersOnly,
    stackWithLoyalty: p.stackWithLoyalty !== false,
    note: p.note || "",
});

const optNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

/** Validates the form and returns { data } ready for Firestore, or { error }. */
function cleanForm(f, codeLocked = false) {
    const code = normalizeCode(f.code);
    if (!code) return { error: "Enter a code." };
    if (!codeLocked && !/^[A-Z0-9_-]+$/.test(code)) return { error: "Code can only use letters, numbers, - and _." };

    const discount = Number(f.discount);
    if (!(discount > 0)) return { error: "Discount must be more than 0." };
    if (f.type === "percent" && discount > 100) return { error: "Percent discount can't exceed 100%." };

    const maxDiscount = f.type === "percent" ? optNum(f.maxDiscount) : null;
    const minOrder = optNum(f.minOrder);
    const usageLimit = optNum(f.usageLimit);
    const perCustomerLimit = optNum(f.perCustomerLimit);

    for (const [label, v] of [["Max discount", maxDiscount], ["Minimum order", minOrder]]) {
        if (v !== null && !(v >= 0)) return { error: `${label} must be a positive number.` };
    }
    for (const [label, v] of [["Total uses", usageLimit], ["Uses per customer", perCustomerLimit]]) {
        if (v !== null && !(Number.isInteger(v) && v >= 1)) return { error: `${label} must be a whole number of at least 1.` };
    }
    if (usageLimit !== null && perCustomerLimit !== null && perCustomerLimit > usageLimit) {
        return { error: "Uses per customer can't be more than total uses." };
    }

    const startsAt = f.startsAt ? new Date(f.startsAt) : null;
    const expiresAt = f.expiresAt ? new Date(f.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) return { error: "End date must be after the start date." };

    return {
        data: {
            code,
            type: f.type,
            discount,
            maxDiscount: maxDiscount || null,
            minOrder: minOrder || null,
            usageLimit,
            perCustomerLimit,
            startsAt: startsAt ? Timestamp.fromDate(startsAt) : null,
            expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
            newCustomersOnly: !!f.newCustomersOnly,
            stackWithLoyalty: !!f.stackWithLoyalty,
            note: f.note.trim(),
        },
    };
}

function Toggle({ checked, onChange, label, hint }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-[#1C3C85]" : "bg-gray-300"}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
            </button>
            <span>
                <span className="block text-sm font-bold text-gray-800">{label}</span>
                {hint && <span className="block text-xs text-gray-500">{hint}</span>}
            </span>
        </label>
    );
}

function PromoForm({ initial, editing, usedCount, onCancel, onSave }) {
    const [f, setF] = useState(initial);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
    // Orders store the code as text, so renaming a used code would reset its usage count.
    const codeLocked = editing && usedCount > 0;

    const submit = async (e) => {
        e.preventDefault();
        const { data, error } = cleanForm(f, codeLocked);
        if (error) return toast.error(error);
        if (editing && data.usageLimit !== null && data.usageLimit < usedCount) {
            const ok = await confirmDialog({
                title: "Limit below current uses",
                message: `This code was already used ${usedCount} times. With a limit of ${data.usageLimit} it will stop working immediately. Continue?`,
                confirmText: "Save anyway",
            });
            if (!ok) return;
        }
        setSaving(true);
        const saved = await onSave(data);
        setSaving(false);
        if (saved) onCancel();
    };

    const preview = cleanForm(f, codeLocked).data;

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <form onSubmit={submit} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
                    <h3 className="text-lg font-black text-[#1C3C85] uppercase tracking-tight">{editing ? "Edit promo code" : "New promo code"}</h3>
                    <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Code */}
                    <section className="space-y-3">
                        <div>
                            <label className={labelCls}>Code</label>
                            <div className="flex gap-2">
                                <input
                                    value={f.code}
                                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                                    placeholder="e.g. SUMMER20"
                                    disabled={codeLocked}
                                    className={inputCls + " font-bold tracking-wider uppercase"}
                                    autoFocus={!editing}
                                />
                                {!codeLocked && (
                                    <button type="button" onClick={() => set("code", randomCode())} className="px-3 border border-gray-200 rounded-lg text-gray-500 hover:text-[#1C3C85] hover:border-[#1C3C85]" title="Generate code">
                                        <Shuffle className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {codeLocked && <p className="text-[11px] text-gray-500 mt-1">The code can't be renamed after it has been used. Create a new code instead.</p>}
                        </div>
                    </section>

                    {/* Discount */}
                    <section className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Discount</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Type</label>
                                <select value={f.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                                    <option value="percent">% off order</option>
                                    <option value="fixed">EGP off order</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>{f.type === "fixed" ? "Amount (EGP)" : "Percent (%)"}</label>
                                <input type="number" min="0" step="any" value={f.discount} onChange={(e) => set("discount", e.target.value)} placeholder={f.type === "fixed" ? "100" : "15"} className={inputCls + " font-bold"} />
                            </div>
                            {f.type === "percent" && (
                                <div>
                                    <label className={labelCls}>Max discount (EGP)</label>
                                    <input type="number" min="0" value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} placeholder="No cap" className={inputCls} />
                                </div>
                            )}
                            <div>
                                <label className={labelCls}>Minimum order (EGP)</label>
                                <input type="number" min="0" value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="No minimum" className={inputCls} />
                            </div>
                        </div>
                    </section>

                    {/* Usage */}
                    <section className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Usage limits</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Total uses</label>
                                <input type="number" min="1" step="1" value={f.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Unlimited" className={inputCls} />
                                {editing && <p className="text-[11px] text-gray-500 mt-1">Used {usedCount} time{usedCount === 1 ? "" : "s"} so far</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Uses per customer</label>
                                <input type="number" min="1" step="1" value={f.perCustomerLimit} onChange={(e) => set("perCustomerLimit", e.target.value)} placeholder="Unlimited" className={inputCls} />
                                <p className="text-[11px] text-gray-500 mt-1">Matched by email or phone</p>
                            </div>
                        </div>
                        <Toggle checked={f.newCustomersOnly} onChange={(v) => set("newCustomersOnly", v)} label="First order only" hint="Only customers who have never ordered before can use it." />
                    </section>

                    {/* Schedule */}
                    <section className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Schedule</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Starts</label>
                                <div className="flex gap-1">
                                    <input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputCls} />
                                    {f.startsAt && <button type="button" onClick={() => set("startsAt", "")} className="px-2 text-gray-400 hover:text-red-600" title="Clear"><X className="w-4 h-4" /></button>}
                                </div>
                                {!f.startsAt && <p className="text-[11px] text-gray-500 mt-1">Starts immediately</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Ends</label>
                                <div className="flex gap-1">
                                    <input type="datetime-local" value={f.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={inputCls} />
                                    {f.expiresAt && <button type="button" onClick={() => set("expiresAt", "")} className="px-2 text-gray-400 hover:text-red-600" title="Clear"><X className="w-4 h-4" /></button>}
                                </div>
                                {!f.expiresAt && <p className="text-[11px] text-gray-500 mt-1">Never expires</p>}
                            </div>
                        </div>
                    </section>

                    {/* Other */}
                    <section className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">Other</h4>
                        <Toggle checked={f.stackWithLoyalty} onChange={(v) => set("stackWithLoyalty", v)} label="Combine with loyalty reward" hint="When off, the customer gets whichever discount is bigger, not both." />
                        <div>
                            <label className={labelCls}>Internal note</label>
                            <input value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Instagram influencer @name" className={inputCls} />
                        </div>
                    </section>

                    {preview && (
                        <div className="rounded-xl bg-[#1C3C85]/5 border border-[#1C3C85]/15 p-3 text-xs text-[#1C3C85]">
                            <span className="font-black">{preview.code}</span> gives {describeDiscount(preview)}
                            {preview.minOrder ? ` on orders over EGP ${preview.minOrder.toLocaleString()}` : ""}
                            {preview.usageLimit ? ` · ${preview.usageLimit} uses total` : " · unlimited uses"}
                            {preview.perCustomerLimit ? ` · ${preview.perCustomerLimit} per customer` : ""}
                            {preview.newCustomersOnly ? " · first order only" : ""}
                            {preview.expiresAt ? ` · until ${formatDate(preview.expiresAt)}` : ""}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t px-5 py-3 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-bold bg-[#1C3C85] text-white hover:bg-blue-800 disabled:opacity-50">
                        {saving ? "Saving..." : editing ? "Save changes" : "Create code"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Detail({ icon: Icon, children }) {
    return (
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {children}
        </span>
    );
}

export default function AdminPromos({ promoCodes, orders = [], handleSavePromo, togglePromoActive, handleDeletePromo }) {
    const [editing, setEditing] = useState(null); // null = closed, {} = new, promo = edit
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    // Usage + performance per promo, derived from the live orders list.
    const rows = useMemo(() => {
        const now = new Date();
        return promoCodes
            .map((p) => {
                const used = ordersForPromo(orders, p.code);
                const discountGiven = used.reduce((s, o) => s + (o.promoDiscount ?? o.discount ?? 0), 0);
                const revenue = used.reduce((s, o) => s + (o.total || 0) - (o.shipping || 0), 0);
                const customers = new Set(used.map((o) => o.email || o.phoneNumber)).size;
                return { promo: p, used: used.length, discountGiven, revenue, customers, status: getPromoStatus(p, used.length, now) };
            })
            .sort((a, b) => (toDate(b.promo.createdAt)?.getTime() || 0) - (toDate(a.promo.createdAt)?.getTime() || 0));
    }, [promoCodes, orders]);

    const visible = rows.filter(({ promo, status }) => {
        if (search && !normalizeCode(promo.code).includes(normalizeCode(search)) && !(promo.note || "").toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === "all") return true;
        if (filter === "ended") return status.key === "expired" || status.key === "exhausted";
        return status.key === filter;
    });

    const totals = rows.reduce(
        (acc, r) => ({ live: acc.live + (r.status.key === "live" ? 1 : 0), uses: acc.uses + r.used, discount: acc.discount + r.discountGiven, revenue: acc.revenue + r.revenue }),
        { live: 0, uses: 0, discount: 0, revenue: 0 }
    );

    const editingUsed = editing?.id ? rows.find((r) => r.promo.id === editing.id)?.used || 0 : 0;

    const copy = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(`Copied ${code}`);
        } catch {
            toast.error("Couldn't copy.");
        }
    };

    return (
        <div className="space-y-5 font-archivo">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-[#1C3C85] uppercase tracking-tight">Promo Codes</h2>
                    <p className="text-xs text-gray-500">Usage is counted from orders (cancelled orders don't count).</p>
                </div>
                <button onClick={() => setEditing({})} className="flex items-center gap-2 bg-[#1C3C85] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800">
                    <Plus className="w-4 h-4" /> New code
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    ["Live codes", totals.live.toLocaleString()],
                    ["Total uses", totals.uses.toLocaleString()],
                    ["Discount given", `EGP ${Math.round(totals.discount).toLocaleString()}`],
                    ["Revenue with codes", `EGP ${Math.round(totals.revenue).toLocaleString()}`],
                ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                        <p className="text-xl font-black text-gray-800 mt-1">{value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex gap-1 overflow-x-auto">
                    {FILTERS.map((f) => (
                        <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === f.key ? "bg-[#1C3C85] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="relative sm:ml-auto sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or note" className={inputCls + " pl-9"} />
                </div>
            </div>

            {/* List */}
            {visible.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
                    {rows.length === 0 ? "No promo codes yet. Create your first one." : "No codes match this filter."}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {visible.map(({ promo: p, used, discountGiven, revenue, customers, status }) => {
                        const limit = p.usageLimit ?? null;
                        const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
                        const start = toDate(p.startsAt);
                        const end = toDate(p.expiresAt);
                        return (
                            <div key={p.id} className={`bg-white rounded-xl border p-4 space-y-3 ${status.key === "live" ? "border-gray-200" : "border-gray-100 opacity-90"}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button onClick={() => copy(p.code)} className="flex items-center gap-1.5 text-lg font-black tracking-wider text-gray-900 hover:text-[#1C3C85] text-left break-all" title="Copy code">
                                                {p.code} <Copy className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[status.key]}`}>{status.label}</span>
                                        </div>
                                        <p className="text-sm font-bold text-[#1C3C85]">{describeDiscount(p)}</p>
                                        {p.note && <p className="text-xs text-gray-500 italic truncate">{p.note}</p>}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => setEditing(p)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#1C3C85]" title="Edit"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => togglePromoActive(p)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#1C3C85]" title={p.active ? "Pause" : "Activate"}>
                                            {p.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const message = used > 0
                                                    ? `Delete "${p.code}"? Its ${used} past order${used === 1 ? "" : "s"} keep the code, but you'll lose these stats.`
                                                    : `Delete "${p.code}"?`;
                                                if (await confirmDialog({ title: "Delete promo", message, confirmText: "Delete" })) handleDeletePromo(p.id);
                                            }}
                                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Usage */}
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                        <span>{used} use{used === 1 ? "" : "s"}{limit ? ` of ${limit}` : " · unlimited"}</span>
                                        {limit && <span>{Math.max(0, limit - used)} left</span>}
                                    </div>
                                    {limit && (
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${pct >= 100 ? "bg-amber-500" : "bg-[#1C3C85]"}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    )}
                                </div>

                                {/* Rules */}
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    <Detail icon={CalendarClock}>
                                        {start || end
                                            ? `${start ? formatDate(start) : "Now"} → ${end ? formatDate(end) : "No end"}`
                                            : "No time limit"}
                                    </Detail>
                                    <Detail icon={Users}>
                                        {p.perCustomerLimit ? `${p.perCustomerLimit}× per customer` : "No per-customer limit"}
                                        {p.newCustomersOnly ? " · first order only" : ""}
                                    </Detail>
                                    {p.minOrder ? <Detail icon={ShoppingBag}>Min. order EGP {Number(p.minOrder).toLocaleString()}</Detail> : null}
                                    {p.stackWithLoyalty === false && <Detail icon={Ticket}>Not combined with loyalty</Detail>}
                                </div>

                                {/* Performance */}
                                {used > 0 && (
                                    <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                                        <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customers</p><p className="text-sm font-black text-gray-800">{customers}</p></div>
                                        <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revenue</p><p className="text-sm font-black text-gray-800">EGP {Math.round(revenue).toLocaleString()}</p></div>
                                        <div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Discount</p><p className="text-sm font-black text-gray-800">EGP {Math.round(discountGiven).toLocaleString()}</p></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && (
                <PromoForm
                    key={editing.id || "new"}
                    initial={editing.id ? promoToForm(editing) : EMPTY_FORM}
                    editing={!!editing.id}
                    usedCount={editingUsed}
                    onCancel={() => setEditing(null)}
                    onSave={(data) => handleSavePromo(data, editing.id || null)}
                />
            )}
        </div>
    );
}
