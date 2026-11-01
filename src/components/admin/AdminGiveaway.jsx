import React, { useEffect, useMemo, useState } from "react";
import { Timestamp, arrayRemove, collection, doc, onSnapshot, query, setDoc, where, writeBatch } from "firebase/firestore";
import { Eye, EyeOff, Play, ExternalLink, Download, Trash2, Search, Trophy, RotateCcw, Undo2 } from "lucide-react";
import { db } from "../../firebase";
import { toast, confirmDialog } from "./ui/notify";
import {
  GIVEAWAY_DOC,
  CONTACTS,
  DEFAULT_SETTINGS,
  SPIN_MS,
  useGiveawaySettings,
  useGiveawayNames,
  wheelEntries,
  winnerKeys,
  entriesAreOpen,
  randomIndex,
  angleFor,
  namesDoc,
  toDate,
} from "../../lib/giveaway";
import Wheel from "../giveaway/Wheel";
import Countdown from "../giveaway/Countdown";
import useLiveSpin from "../giveaway/useLiveSpin";

const inputCls = "w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1C3C85]/20 focus:border-[#1C3C85] outline-none";
const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1";
const card = "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6";

const toLocalInput = (value) => {
  const d = toDate(value);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmt = (value) => toDate(value)?.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || "—";

function Switch({ checked, onChange, label, hint }) {
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

export default function AdminGiveaway() {
  const settings = useGiveawaySettings();
  const round = settings?.round || 1;
  const entries = useGiveawayNames(round, !!settings); // [{ key, name, raw }] in join order
  const [contacts, setContacts] = useState({});
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Admin-only contact details (email) for this round, keyed by entry id.
  useEffect(() => {
    if (!settings) return undefined;
    return onSnapshot(
      query(collection(db, CONTACTS), where("round", "==", round)),
      (snap) => setContacts(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))),
      (err) => console.error("Giveaway contacts:", err)
    );
  }, [round, settings]);

  // Form starts from the saved settings; re-syncs when the round changes.
  useEffect(() => {
    if (!settings) return;
    setDraft({
      title: settings.title || "",
      prizeText: settings.prizeText || "",
      drawAt: toLocalInput(settings.drawAt),
      instagramUrl: settings.instagramUrl || DEFAULT_SETTINGS.instagramUrl,
      xUrl: settings.xUrl || DEFAULT_SETTINGS.xUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!settings, round]);

  const liveNames = useMemo(() => wheelEntries(entries, settings), [entries, settings]);
  const spin = useLiveSpin(settings?.spin || null, liveNames);

  if (!settings || !draft) return <div className="p-8 text-center font-bold text-[#1C3C85]">Loading giveaway…</div>;

  const roundWinners = (settings.winners || []).filter((w) => w.round === round);
  const won = winnerKeys(settings);
  const open = entriesAreOpen({ ...settings, visible: true });
  const dirty =
    draft.title !== (settings.title || "") ||
    draft.prizeText !== (settings.prizeText || "") ||
    draft.drawAt !== toLocalInput(settings.drawAt) ||
    draft.instagramUrl !== (settings.instagramUrl || DEFAULT_SETTINGS.instagramUrl) ||
    draft.xUrl !== (settings.xUrl || DEFAULT_SETTINGS.xUrl);

  const update = async (fields, success) => {
    try {
      await setDoc(GIVEAWAY_DOC, fields, { merge: true });
      if (success) toast.success(success);
      return true;
    } catch (e) {
      console.error("Giveaway update:", e);
      toast.error("Couldn't save. Please try again.");
      return false;
    }
  };

  const saveDetails = async () => {
    const drawAt = draft.drawAt ? new Date(draft.drawAt) : null;
    if (drawAt && Number.isNaN(drawAt.getTime())) return toast.error("Invalid draw date.");
    setSaving(true);
    await update(
      {
        round,
        title: draft.title.trim(),
        prizeText: draft.prizeText.trim(),
        drawAt: drawAt ? Timestamp.fromDate(drawAt) : null,
        instagramUrl: draft.instagramUrl.trim() || DEFAULT_SETTINGS.instagramUrl,
        xUrl: draft.xUrl.trim() || DEFAULT_SETTINGS.xUrl,
      },
      "Giveaway details saved."
    );
    setSaving(false);
  };

  const toggleVisible = async () => {
    if (!settings.visible) {
      const ok = await confirmDialog({
        title: "Show the giveaway?",
        message: "Customers will see the homepage banner and can open /lucky-wheel to join.",
        confirmText: "Show it",
      });
      if (!ok) return;
    }
    await update({ round, visible: !settings.visible }, settings.visible ? "Giveaway hidden from the site." : "Giveaway is now live on the site!");
  };

  const doSpin = async () => {
    const count = wheelEntries(entries, settings).length;
    if (count < 1) return toast.error("No names on the wheel yet.");
    const ok = await confirmDialog({
      title: "Spin the wheel?",
      message: `${count} name${count === 1 ? "" : "s"} on the wheel. Everyone watching the giveaway page will see it spin.`,
      confirmText: "Spin!",
    });
    if (!ok) return;
    // Pick after confirming, from the list as it is right now.
    const pool = wheelEntries(entries, settings);
    if (pool.length < 1) return toast.error("No names on the wheel yet.");
    const index = randomIndex(pool.length);
    const winner = pool[index];
    const at = Date.now();
    const spinData = {
      id: `${at}-${index}`,
      at,
      durationMs: SPIN_MS,
      angle: angleFor(index, pool.length),
      winnerKey: winner.key,
      winnerName: winner.name,
      winnerIndex: index,
      names: pool.map((e) => e.name), // the exact wheel this spin used, so every screen matches
    };
    try {
      // One write: every open giveaway page picks this up and spins.
      await setDoc(
        GIVEAWAY_DOC,
        { round, spin: spinData, winners: [...(settings.winners || []), { key: winner.key, name: winner.name, at, round }] },
        { merge: true }
      );
    } catch (e) {
      console.error("Spin:", e);
      toast.error("Spin failed. Please try again.");
    }
  };

  const undoWinner = async (w) => {
    if (!(await confirmDialog({ title: "Remove winner?", message: `Remove ${w.name} from the winners and put them back on the wheel?`, confirmText: "Remove" }))) return;
    try {
      await setDoc(GIVEAWAY_DOC, { winners: (settings.winners || []).filter((x) => !(x.key === w.key && x.at === w.at)) }, { merge: true });
      toast.success("Winner removed.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't remove the winner.");
    }
  };

  const removeEntry = async (e) => {
    if (!(await confirmDialog({ title: "Remove from wheel?", message: `Remove "${e.name}" from this giveaway?`, confirmText: "Remove" }))) return;
    try {
      const batch = writeBatch(db);
      batch.set(namesDoc(round), { names: arrayRemove(e.raw) }, { merge: true });
      batch.delete(doc(db, CONTACTS, e.key));
      await batch.commit();
      toast.success("Entry removed.");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't remove the entry.");
    }
  };

  const newRound = async () => {
    const ok = await confirmDialog({
      title: "Start a new giveaway?",
      message: "The wheel starts empty and winners reset. Past entries stay saved but won't show. The giveaway stays hidden until you show it.",
      confirmText: "Start new",
    });
    if (!ok) return;
    await update({ round: round + 1, spin: null, visible: false, entriesOpen: true }, "New giveaway ready. It's hidden until you show it.");
  };

  const exportCsv = () => {
    const rows = [["Name on wheel", "Email", "Google name", "Joined", "Won"]];
    for (const e of entries) {
      const c = contacts[e.key] || {};
      rows.push([e.name, c.email || "", c.googleName || "", fmt(c.joinedAt), won.has(e.key) ? "yes" : ""]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `giveaway-round-${round}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = search
    ? entries.filter((e) => `${e.name} ${contacts[e.key]?.email || ""}`.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <div className="space-y-5 font-archivo">
      {/* Status + visibility */}
      <div className={`${card} flex flex-col md:flex-row md:items-center gap-4 justify-between ${settings.visible ? "border-emerald-200" : ""}`}>
        <div>
          <h2 className="text-2xl font-black text-[#1C3C85] uppercase tracking-tight">Lucky Wheel Giveaway</h2>
          <p className="text-sm text-gray-500 mt-1">
            Giveaway #{round} ·{" "}
            {settings.visible ? (
              <span className="font-bold text-emerald-600">Visible to customers</span>
            ) : (
              <span className="font-bold text-gray-500">Hidden from customers</span>
            )}{" "}
            · Entries {open ? <span className="font-bold text-emerald-600">open</span> : <span className="font-bold text-red-600">closed</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/lucky-wheel?preview=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" /> Open page
          </a>
          <button
            onClick={toggleVisible}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white ${settings.visible ? "bg-gray-700 hover:bg-gray-800" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {settings.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {settings.visible ? "Hide from site" : "Show on site"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] items-start">
        {/* Live wheel */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#1C3C85]">Live wheel</h3>
            {settings.drawAt && (
              <div className="bg-[#1C3C85] rounded-xl px-2 py-1">
                <Countdown target={settings.drawAt} compact doneLabel="Draw time!" />
              </div>
            )}
          </div>
          <Wheel names={spin.names} spinCmd={spin.spinCmd} idle={spin.idle} highlightKey={spin.winner?.key} />
          <div className="mt-4 text-center min-h-[2.5rem]">
            {spin.phase === "spinning" && <p className="font-black uppercase tracking-widest text-[#1C3C85] animate-pulse">Spinning…</p>}
            {spin.winner && <p className="font-black text-lg text-[#1C3C85]">🎉 Winner: {spin.winner.name}</p>}
          </div>
          <button
            onClick={doSpin}
            disabled={spin.phase === "spinning" || liveNames.length === 0}
            className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#D4A84F] text-white text-lg font-black uppercase tracking-widest shadow-lg hover:brightness-105 disabled:opacity-40"
          >
            <Play className="w-5 h-5" /> Spin the wheel
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Tip for the livestream: open the giveaway page on another screen. It spins at the same moment as this button.
          </p>
          <div className="mt-4 space-y-3 border-t pt-4">
            <Switch checked={!!settings.entriesOpen} onChange={(v) => update({ round, entriesOpen: v }, v ? "Entries opened." : "Entries closed.")} label="Entries open" hint="Turn off to stop new people joining." />
            <Switch
              checked={!!settings.closeEntriesAtDraw}
              onChange={(v) => update({ round, closeEntriesAtDraw: v })}
              label="Close entries when the countdown ends"
            />
            <Switch checked={!!settings.removeWinners} onChange={(v) => update({ round, removeWinners: v })} label="Remove winners from the wheel" hint="So the same person can't win twice." />
          </div>
        </div>

        <div className="space-y-5">
          {/* Details */}
          <div className={`${card} space-y-3`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#1C3C85]">Details</h3>
            <div>
              <label className={labelCls}>Title</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Scentorini Giveaway" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prize / description (optional)</label>
              <textarea
                value={draft.prizeText}
                onChange={(e) => setDraft({ ...draft, prizeText: e.target.value })}
                placeholder="e.g. 3 winners get a full-size bottle of their choice"
                rows={2}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Live draw date & time (countdown)</label>
              <input type="datetime-local" value={draft.drawAt} onChange={(e) => setDraft({ ...draft, drawAt: e.target.value })} className={inputCls} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Instagram link</label>
                <input value={draft.instagramUrl} onChange={(e) => setDraft({ ...draft, instagramUrl: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>X link</label>
                <input value={draft.xUrl} onChange={(e) => setDraft({ ...draft, xUrl: e.target.value })} className={inputCls} />
              </div>
            </div>
            <button
              onClick={saveDetails}
              disabled={!dirty || saving}
              className="w-full py-2.5 rounded-xl bg-[#1C3C85] text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-40"
            >
              {saving ? "Saving…" : dirty ? "Save details" : "Saved"}
            </button>
          </div>

          {/* Winners */}
          <div className={card}>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#1C3C85] mb-3">
              <Trophy className="w-4 h-4 text-[#D4A84F]" /> Winners ({roundWinners.length})
            </h3>
            {roundWinners.length === 0 ? (
              <p className="text-sm text-gray-500">No winners yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {roundWinners.map((w, i) => (
                  <li key={w.key + w.at} className="py-2 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#D4A84F]/20 text-[#1C3C85] text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900">{w.name}</p>
                      <p className="text-xs text-gray-500 break-all">{contacts[w.key]?.email || "—"}</p>
                    </div>
                    <button onClick={() => undoWinner(w)} className="p-2 text-gray-400 hover:text-red-600" title="Remove winner">
                      <Undo2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Entrants */}
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#1C3C85]">Entrants ({entries.length})</h3>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className={inputCls + " pl-9"} />
            </div>
            <button onClick={exportCsv} disabled={!entries.length} className="flex items-center gap-1.5 px-3 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">{entries.length ? "No matches." : "No one has joined yet."}</p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
            {filtered.map((e) => (
              <li key={e.key} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">
                    {won.has(e.key) && "🏆 "}
                    {e.name}
                  </p>
                  <p className="text-xs text-gray-500 break-all">
                    {contacts[e.key]?.email || "—"} · {fmt(contacts[e.key]?.joinedAt)}
                  </p>
                </div>
                <button onClick={() => removeEntry(e)} className="p-2 text-gray-400 hover:text-red-600" title="Remove from wheel">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New round */}
      <div className={`${card} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div>
          <p className="font-bold text-gray-900">Start a new giveaway</p>
          <p className="text-xs text-gray-500">Empties the wheel for the next giveaway. This one's entries and winners stay saved.</p>
        </div>
        <button onClick={newRound} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
          <RotateCcw className="w-4 h-4" /> New giveaway
        </button>
      </div>
    </div>
  );
}
