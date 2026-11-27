// Admin → WhatsApp: follow up with customers who bought a product (e.g. the Discovery Set).
// The list is built live from the orders already loaded in the admin, so no customer
// data lives in the site's code. Each "Send on WhatsApp" button opens a chat with a
// personal message typed in; the admin reviews it and presses send in WhatsApp.
// "Sent" marks are stored by order ID (no phone numbers) in siteSettings/outreach,
// so they show on every device.

import React, { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc, deleteField } from "firebase/firestore";
import { db } from "../../firebase";
import { MessageCircle, Check, Undo2 } from "lucide-react";

const OUTREACH_DOC = doc(db, "siteSettings", "outreach");
const TEMPLATE_KEY = "scentorini.outreach.template";
const SITE = "https://scentorini-shop.vercel.app";

const DEFAULT_TEMPLATE = `Hi {name}! It's Scentorini 💙 Hope you enjoyed your Discovery Set ({samples}). Which one was your favourite?

For Black Friday weekend: pick 2 full-size perfumes and get 2 FREE gifts (oil or 3 gm musk) 🎁
Plus, everything on the site is 10% OFF 🛍️
Build yours here: ${SITE}/bundles/PeMVqZu7S2Mo6I4Nm7Mx`;

const toDate = (v) => (v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// Egyptian mobile → "01xxxxxxxxx" (or "" if it doesn't look valid).
function cleanPhone(p) {
  let d = String(p || "")
    .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
    .replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  if (d.startsWith("20") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[0125]\d{8}$/.test(d) ? d : "";
}

const isFullBottle = (item) => item?.isBundle || /55\s*ml/i.test(`${item?.size || ""} ${item?.title || ""}`);

function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export default function AdminOutreach({ orders = [] }) {
  const now = new Date();
  const [product, setProduct] = useState("discovery set");
  const [from, setFrom] = useState(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(ymd(now));
  const [deliveredOnly, setDeliveredOnly] = useState(true);
  const [hideBottleBuyers, setHideBottleBuyers] = useState(true);
  const [hideSent, setHideSent] = useState(false);
  const [template, setTemplate] = useState(() => {
    try {
      return localStorage.getItem(TEMPLATE_KEY) || DEFAULT_TEMPLATE;
    } catch {
      return DEFAULT_TEMPLATE;
    }
  });
  const [sent, setSent] = useState({});
  const [, tick] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATE_KEY, template);
    } catch {
      /* ignore */
    }
  }, [template]);

  useEffect(
    () =>
      onSnapshot(
        OUTREACH_DOC,
        (snap) => setSent((snap.exists() && snap.data().sent) || {}),
        () => {}
      ),
    []
  );

  // Refresh the "x min ago" labels.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Product names that appear in orders, for the dropdown.
  const productOptions = useMemo(() => {
    const m = new Map();
    orders.forEach((o) => (o.items || []).forEach((it) => it?.title && m.set(norm(it.title), String(it.title).trim())));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const people = useMemo(() => {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const valid = orders.filter((o) => !["Cancelled", "Returned"].includes(o.status));
    const byPhone = new Map();
    valid.forEach((o) => {
      const p = cleanPhone(o.phoneNumber);
      if (p) byPhone.set(p, [...(byPhone.get(p) || []), o]);
    });

    const map = new Map();
    valid.forEach((o) => {
      const d = toDate(o.createdAt);
      if (!d || d < start || d > end) return;
      if (deliveredOnly && o.status !== "Delivered") return;
      const matches = (o.items || []).filter((it) => norm(it?.title).includes(product));
      if (!matches.length) return;
      const phone = cleanPhone(o.phoneNumber);
      if (!phone) return;
      const samples = matches.flatMap((it) => (it.isCustomSet && Array.isArray(it.selectedSamples) ? it.selectedSamples : []));
      const boughtBottle = (byPhone.get(phone) || []).some(
        (x) => (toDate(x.createdAt) || 0) >= d && (x.items || []).some((it) => isFullBottle(it) && !norm(it.title).includes(product))
      );
      const cur = map.get(phone);
      if (cur) {
        samples.forEach((s) => cur.samples.add(String(s).trim()));
        cur.orderIds.push(o.id);
        if (d > cur.date) cur.date = d;
        cur.boughtBottle = cur.boughtBottle || boughtBottle;
      } else {
        const name = String(o.customerName || "").trim();
        map.set(phone, {
          phone,
          name,
          first: name.split(/\s+/)[0] || "there",
          date: d,
          samples: new Set(samples.map((s) => String(s).trim())),
          orderIds: [o.id],
          boughtBottle,
          totalOrders: (byPhone.get(phone) || []).length,
        });
      }
    });

    return [...map.values()]
      .map((p) => ({ ...p, sentAt: Math.max(0, ...p.orderIds.map((id) => sent[id] || 0)) }))
      .filter((p) => !(hideBottleBuyers && p.boughtBottle))
      .filter((p) => !(hideSent && p.sentAt))
      .sort((a, b) => (a.sentAt ? 1 : 0) - (b.sentAt ? 1 : 0) || b.date - a.date);
  }, [orders, product, from, to, deliveredOnly, hideBottleBuyers, hideSent, sent]);

  const lastSent = Math.max(0, ...Object.values(sent).map(Number).filter(Number.isFinite));
  const sentCount = people.filter((p) => p.sentAt).length;

  const messageFor = (p) =>
    template
      .replaceAll("{name}", p.first)
      .replaceAll("{samples}", [...p.samples].join(", ") || "our scents");

  const markSent = (p) =>
    setDoc(OUTREACH_DOC, { sent: Object.fromEntries(p.orderIds.map((id) => [id, Date.now()])) }, { merge: true }).catch((e) => console.error(e));
  const unmark = (p) =>
    setDoc(OUTREACH_DOC, { sent: Object.fromEntries(p.orderIds.map((id) => [id, deleteField()])) }, { merge: true }).catch((e) => console.error(e));

  const send = (p) => {
    const url = `https://wa.me/2${p.phone}?text=${encodeURIComponent(messageFor(p))}`;
    window.open(url, "_blank", "noopener");
    markSent(p);
  };

  return (
    <div className="space-y-6 font-archivo">
      <div className="p-4 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <h3 className="text-lg font-black uppercase text-[#1C3C85]">WhatsApp follow-ups</h3>
          <p className="text-xs text-gray-500 mt-1">
            Pick who to contact, check the message, then press <b>Send on WhatsApp</b> for each person. WhatsApp opens with the
            message typed in — review it and press send there. Leave a good gap between messages to keep your number safe.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bought</span>
            <select value={product} onChange={(e) => setProduct(e.target.value)} className="w-full p-3 border rounded-xl text-sm bg-gray-50">
              {!productOptions.some(([k]) => k === product) && <option value={product}>{product}</option>}
              {productOptions.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full p-3 border rounded-xl text-sm bg-gray-50" />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full p-3 border rounded-xl text-sm bg-gray-50" />
          </label>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={deliveredOnly} onChange={(e) => setDeliveredOnly(e.target.checked)} /> Delivered orders only
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hideBottleBuyers} onChange={(e) => setHideBottleBuyers(e.target.checked)} /> Hide people who already
            bought a full bottle
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hideSent} onChange={(e) => setHideSent(e.target.checked)} /> Hide people already messaged
          </label>
        </div>

        <label className="block">
          <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Message — <code>{"{name}"}</code> = first name, <code>{"{samples}"}</code> = the samples they tried
          </span>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={7}
            className="w-full p-3 border rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-[#1C3C85] outline-none"
          />
          <button type="button" onClick={() => setTemplate(DEFAULT_TEMPLATE)} className="mt-1 text-[11px] font-bold uppercase text-gray-400 hover:text-[#1C3C85]">
            Reset to default message
          </button>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-gray-700">
          {people.length} people · {sentCount} messaged
        </span>
        {lastSent > 0 && <span className="text-xs text-gray-500">Last message sent {ago(lastSent)}</span>}
      </div>

      <div className="space-y-3">
        {people.map((p) => (
          <div
            key={p.phone}
            className={`p-4 bg-white rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center gap-3 ${p.sentAt ? "border-green-200 opacity-70" : "border-gray-100"}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-800 break-words">{p.name || "—"}</span>
                <span className="text-xs text-gray-500">{p.phone}</span>
                {p.boughtBottle && <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Bought a bottle</span>}
                {p.totalOrders > 1 && <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.totalOrders} orders</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ordered {p.date.toLocaleDateString("en-GB")}
                {p.samples.size > 0 && <> · Tried: {[...p.samples].join(", ")}</>}
              </p>
              <details className="mt-1">
                <summary className="text-[11px] font-bold uppercase text-gray-400 cursor-pointer">Preview message</summary>
                <p className="mt-2 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg text-gray-700">{messageFor(p)}</p>
              </details>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {p.sentAt ? (
                <>
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <Check className="w-4 h-4" /> Sent {ago(p.sentAt)}
                  </span>
                  <button type="button" onClick={() => unmark(p)} title="Mark as not sent" className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => send(p)} className="px-3 py-2 rounded-full text-xs font-bold uppercase border border-gray-200 text-gray-500 hover:border-gray-400">
                    Send again
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => send(p)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider text-white bg-[#25D366] hover:bg-[#1ebe5a] shadow"
                >
                  <MessageCircle className="w-4 h-4" /> Send on WhatsApp
                </button>
              )}
            </div>
          </div>
        ))}
        {!people.length && <p className="text-sm text-gray-400 text-center py-10">Nobody matches these filters.</p>}
      </div>
    </div>
  );
}
