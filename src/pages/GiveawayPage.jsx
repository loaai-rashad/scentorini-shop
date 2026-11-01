// src/pages/GiveawayPage.jsx — public lucky-wheel giveaway at /lucky-wheel.
// Hidden (redirects home) until the admin switches the giveaway on. Admins can
// preview it while hidden at /lucky-wheel?preview=1.

import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { arrayUnion, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { Instagram, Check, LogIn, PartyPopper, Copy, ExternalLink, Users, Trophy } from "lucide-react";
import { auth, db, googleProvider } from "../firebase";
import { setPageMeta } from "../lib/seo";
import {
  useGiveawaySettings,
  useGiveawayNames,
  wheelEntries,
  winnerKeys,
  entriesAreOpen,
  entryId,
  cleanName,
  MAX_NAME,
  CONTACTS,
  namesDoc,
  inAppBrowser,
  isAndroid,
  chromeIntentUrl,
  useCountdown,
} from "../lib/giveaway";
import Wheel from "../components/giveaway/Wheel";
import Countdown from "../components/giveaway/Countdown";
import useLiveSpin from "../components/giveaway/useLiveSpin";

const XLogo = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FOLLOW_KEY = "giveaway_followed";
const readFollowed = () => {
  try {
    return JSON.parse(localStorage.getItem(FOLLOW_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

function Step({ n, done, title, children }) {
  return (
    <div className={`flex gap-3 p-4 rounded-2xl border transition-colors ${done ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-white"}`}>
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${done ? "bg-emerald-500 text-white" : "bg-[#1C3C85] text-white"}`}>
        {done ? <Check className="w-4 h-4" /> : n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-archivo font-black uppercase tracking-tight text-sm text-gray-900">{title}</p>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export default function GiveawayPage() {
  const settings = useGiveawaySettings();
  const [params] = useSearchParams();
  const isAdmin = (() => {
    try {
      return localStorage.getItem("isAdmin") === "true";
    } catch {
      return false;
    }
  })();
  const preview = isAdmin && params.get("preview") === "1";

  const [user, setUser] = useState(undefined); // undefined = still checking
  const [followed, setFollowed] = useState(readFollowed);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  const visible = !!settings?.visible || preview;
  const entries = useGiveawayNames(settings?.round, visible); // [{ key, name }] — one document read
  const liveNames = useMemo(() => wheelEntries(entries, settings), [entries, settings]);
  const spin = useLiveSpin(settings?.spin || null, liveNames);
  useCountdown(settings?.drawAt); // re-render every second so "entries open" flips at the draw time

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  useEffect(() => {
    if (user && !name) setName(cleanName(user.displayName || ""));
  }, [user, name]);
  useEffect(() => {
    setPageMeta({
      title: `${settings?.title || "Giveaway"} | Scentorini`,
      description: "Join the Scentorini lucky-wheel giveaway: follow us, sign in and get your name on the wheel for the live draw.",
    });
  }, [settings?.title]);

  if (!settings) return <div className="min-h-[60vh] flex items-center justify-center text-[#1C3C85] font-archivo font-bold">Loading…</div>;
  if (!visible) return <Navigate to="/" replace />;

  const won = winnerKeys(settings);
  const myKey = user ? entryId(settings.round, user.uid) : null;
  const myEntry = myKey ? entries.find((e) => e.key === myKey) : null;
  const open = entriesAreOpen({ ...settings, visible: true });
  const followedBoth = !!(followed.instagram && followed.x);
  const roundWinners = (settings.winners || []).filter((w) => w.round === settings.round);
  // Hide the newest winner from the list until the wheel has actually stopped on them.
  const shownWinners = spin.phase === "spinning" ? roundWinners.filter((w) => w.key !== settings.spin?.winnerKey) : roundWinners;
  const inApp = inAppBrowser();

  const markFollowed = (key) => {
    const next = { ...followed, [key]: true };
    setFollowed(next);
    try {
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
    } catch {
      /* private mode — fine, state still updates */
    }
  };

  const signIn = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      console.error("Giveaway sign-in:", e);
      setError(inApp ? `Google sign-in doesn't work inside the ${inApp} app. Open this page in your browser (see below).` : "Sign-in failed. Please try again.");
    }
  };

  const join = async () => {
    setError("");
    const finalName = cleanName(name);
    if (finalName.length < 2) return setError("Please enter your name (at least 2 letters).");
    if (!user || myEntry) return; // one entry per account per giveaway
    setBusy(true);
    try {
      const id = entryId(settings.round, user.uid);
      const batch = writeBatch(db);
      // Public: one array for the whole wheel. Private: the contact record.
      batch.set(namesDoc(settings.round), { round: settings.round, names: arrayUnion({ k: id, n: finalName }) }, { merge: true });
      batch.set(doc(db, CONTACTS, id), {
        uid: user.uid,
        round: settings.round,
        name: finalName,
        email: user.email || "",
        googleName: user.displayName || "",
        joinedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (e) {
      console.error("Giveaway join:", e);
      setError("Couldn't add you to the wheel. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const filteredEntries = search ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) : entries;
  // A winner's trophy appears only once the wheel has stopped on them.
  const shownWon = spin.phase === "spinning" ? new Set([...won].filter((k) => k !== settings.spin?.winnerKey)) : won;

  return (
    <div className="font-archivo bg-gray-50 min-h-screen pb-16">
      {preview && !settings.visible && (
        <div className="bg-amber-100 text-amber-800 text-center text-xs font-bold uppercase tracking-widest py-2 px-4">
          Preview — this page is hidden from customers until you switch the giveaway on in the dashboard
        </div>
      )}

      {/* Hero with countdown */}
      <section className="bg-gradient-to-br from-[#0F2557] via-[#1C3C85] to-[#3E63B8] text-white px-4 py-10 md:py-14 text-center">
        <span className="inline-block text-[11px] md:text-xs font-bold uppercase tracking-[0.3em] text-[#D4A84F] mb-3">Lucky Wheel Giveaway</span>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-tight">{settings.title || "Scentorini Giveaway"}</h1>
        {settings.prizeText && <p className="mt-3 text-white/85 max-w-xl mx-auto text-sm md:text-base">{settings.prizeText}</p>}
        {settings.drawAt && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Live draw starts in</p>
            <Countdown target={settings.drawAt} />
          </div>
        )}
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr] items-start">
        {/* Wheel */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-8">
          <Wheel names={spin.names} spinCmd={spin.spinCmd} idle={spin.idle} highlightKey={spin.winner?.key} />
          <div className="mt-4 text-center min-h-[3.5rem]">
            {spin.phase === "spinning" && <p className="text-lg font-black uppercase tracking-widest text-[#1C3C85] animate-pulse">Spinning…</p>}
            {spin.winner && (
              <div className="inline-flex items-center gap-2 bg-[#D4A84F]/15 border border-[#D4A84F]/40 text-[#1C3C85] rounded-2xl px-5 py-3">
                <PartyPopper className="w-5 h-5 text-[#D4A84F]" />
                <span className="font-black text-lg">Winner: {spin.winner.name}</span>
              </div>
            )}
            {spin.phase === "idle" && (
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                <Users className="w-4 h-4" /> {spin.names.length} {spin.names.length === 1 ? "name" : "names"} on the wheel
              </p>
            )}
          </div>
        </section>

        {/* Join */}
        <section className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-[#1C3C85]">
              {myEntry ? "You're on the wheel!" : open ? "Get your name on the wheel" : "Entries are closed"}
            </h2>

            {myEntry ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                <p className="font-bold">
                  You joined as <span className="font-black">{myEntry.name}</span>
                  {won.has(myEntry.key) && spin.phase !== "spinning" ? " — and you WON! 🎉 We'll contact you soon." : ". Good luck! 🍀"}
                </p>
              </div>
            ) : !open ? (
              <p className="text-sm text-gray-600">This giveaway isn't taking new entries right now. Follow us so you don't miss the next one!</p>
            ) : null}

            {!myEntry && open && (
              <>
                <Step n={1} done={!!followed.instagram} title="Follow us on Instagram">
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markFollowed("instagram")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-black uppercase tracking-widest bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-110"
                  >
                    <Instagram className="w-4 h-4" /> Follow @scentorini.eg
                  </a>
                </Step>
                <Step n={2} done={!!followed.x} title="Follow us on X">
                  <a
                    href={settings.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markFollowed("x")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-black uppercase tracking-widest bg-black hover:bg-gray-800"
                  >
                    <XLogo className="w-3.5 h-3.5" /> Follow @scentorini_eg
                  </a>
                </Step>
                <Step n={3} done={!!user} title="Sign in">
                  {user ? (
                    <p className="text-sm text-gray-600 break-all">Signed in as {user.email}</p>
                  ) : (
                    <>
                      <button
                        onClick={signIn}
                        disabled={user === undefined}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-[#1C3C85] text-[#1C3C85] text-xs font-black uppercase tracking-widest hover:bg-[#1C3C85] hover:text-white disabled:opacity-50"
                      >
                        <LogIn className="w-4 h-4" /> Sign in with Google
                      </button>
                      {inApp && (
                        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-2">
                          <p className="font-bold">Google sign-in doesn't work inside the {inApp} app.</p>
                          {isAndroid() ? (
                            <a href={chromeIntentUrl()} className="inline-flex items-center gap-1.5 font-black uppercase tracking-widest text-[#1C3C85] underline">
                              <ExternalLink className="w-3.5 h-3.5" /> Open in Chrome
                            </a>
                          ) : (
                            <p>
                              Tap <span className="font-black">•••</span> at the top right, then <span className="font-black">Open in external browser</span>.
                            </p>
                          )}
                          <button onClick={copyLink} className="flex items-center gap-1.5 font-bold text-gray-700">
                            <Copy className="w-3.5 h-3.5" /> {copied ? "Link copied!" : "Or copy the link"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </Step>
                <Step n={4} done={false} title="Your name on the wheel">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                      placeholder="e.g. Salma A."
                      maxLength={MAX_NAME}
                      disabled={!user}
                      className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1C3C85]/20 disabled:bg-gray-100"
                    />
                    <button
                      onClick={join}
                      disabled={!user || !followedBoth || busy}
                      className="px-5 py-2.5 rounded-xl bg-[#1C3C85] text-white text-xs font-black uppercase tracking-widest hover:bg-blue-800 disabled:opacity-40"
                    >
                      {busy ? "Joining…" : "Join the wheel"}
                    </button>
                  </div>
                  {user && !followedBoth && <p className="text-[11px] text-gray-500 mt-1.5">Follow us on Instagram and X first (steps 1 and 2).</p>}
                </Step>
              </>
            )}
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          </div>

          {/* Winners */}
          {shownWinners.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#1C3C85] mb-3">
                <Trophy className="w-4 h-4 text-[#D4A84F]" /> Winners
              </h3>
              <ol className="space-y-1.5">
                {shownWinners.map((w, i) => (
                  <li key={w.key + i} className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <span className="w-6 h-6 rounded-full bg-[#D4A84F]/20 text-[#1C3C85] text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                    {w.name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Everyone on the wheel */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#1C3C85]">Who's in ({entries.length})</h3>
              {entries.length > 12 && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find your name"
                  className="w-40 border border-gray-200 rounded-full px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#1C3C85]/20"
                />
              )}
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-gray-500">No one yet — be the first!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto">
                {filteredEntries.map((e) => (
                  <span
                    key={e.key}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      e.key === myKey ? "bg-[#1C3C85] text-white border-[#1C3C85]" : shownWon.has(e.key) ? "bg-[#D4A84F]/20 text-[#1C3C85] border-[#D4A84F]/40" : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {shownWon.has(e.key) ? "🏆 " : ""}
                    {e.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            <Link to="/products" className="underline">Shop Scentorini fragrances</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
