// Lightweight imperative toast + confirm system for the admin area.
// Usage:
//   import { toast, confirmDialog, Toaster, ConfirmHost } from "./ui/notify";
//   toast.success("Saved!");  toast.error("Failed.");
//   if (await confirmDialog("Delete this?")) { ... }
// Mount <Toaster /> and <ConfirmHost /> once near the admin root.

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

// --- Toast store (module singleton) ---
let toastListeners = [];
let toastSeq = 0;

export function toast(message, type = "info") {
  const item = { id: ++toastSeq, message, type };
  toastListeners.forEach((l) => l(item));
}
toast.success = (m) => toast(m, "success");
toast.error = (m) => toast(m, "error");
toast.info = (m) => toast(m, "info");

const TOAST_STYLES = {
  success: { icon: CheckCircle2, ring: "border-emerald-200", bar: "bg-emerald-500", text: "text-emerald-700" },
  error: { icon: AlertCircle, ring: "border-red-200", bar: "bg-red-500", text: "text-red-700" },
  info: { icon: Info, ring: "border-blue-200", bar: "bg-[#1C3C85]", text: "text-[#1C3C85]" },
};

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const listener = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, 3200);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2 w-[320px] max-w-[90vw] font-archivo">
      {items.map((item) => {
        const s = TOAST_STYLES[item.type] || TOAST_STYLES.info;
        const Icon = s.icon;
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 bg-white rounded-xl shadow-lg border ${s.ring} p-3 animate-[fadeIn_0.2s_ease-out] overflow-hidden relative`}
          >
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
            <Icon className={`w-5 h-5 flex-shrink-0 ${s.text}`} />
            <p className="text-xs font-bold text-gray-700 flex-1 leading-snug">{item.message}</p>
            <button
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              className="text-gray-300 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// --- Confirm dialog (promise-based) ---
let confirmListener = null;

export function confirmDialog(opts) {
  const config = typeof opts === "string" ? { message: opts } : opts || {};
  return new Promise((resolve) => {
    if (!confirmListener) {
      // Fallback if host isn't mounted
      resolve(window.confirm(config.message || "Are you sure?"));
      return;
    }
    confirmListener({
      title: config.title || "Please confirm",
      message: config.message || "Are you sure?",
      confirmText: config.confirmText || "Confirm",
      cancelText: config.cancelText || "Cancel",
      danger: config.danger !== false, // default to destructive styling
      resolve,
    });
  });
}

export function ConfirmHost() {
  const [state, setState] = useState(null);

  useEffect(() => {
    confirmListener = (s) => setState(s);
    return () => {
      confirmListener = null;
    };
  }, []);

  if (!state) return null;

  const close = (val) => {
    state.resolve(val);
    setState(null);
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 font-archivo">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => close(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${state.danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-[#1C3C85]"}`}>
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">{state.title}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-snug">{state.message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => close(false)}
            className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition"
          >
            {state.cancelText}
          </button>
          <button
            onClick={() => close(true)}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-md transition ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-[#1C3C85] hover:bg-blue-800"}`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
