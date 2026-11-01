import { useEffect, useRef, useState } from "react";
import { SPIN_MS } from "../../lib/giveaway";

// How long the winning layout stays on the wheel after it stops, before the
// wheel goes back to idling with the live list of names.
const HOLD_RESULT_MS = 30000;

/**
 * Drives a <Wheel> from the shared `settings.spin` so every open screen — the
 * admin's and every visitor's — spins at the same time and stops on the same name.
 *
 * A spin that arrives while the page is open animates for the full duration.
 * A spin already in progress when the page loads finishes in the remaining time;
 * one that already ended is shown stopped on the winner (for HOLD_RESULT_MS).
 *
 * Returns { names, phase, winner, spinCmd, idle } — pass spinCmd/idle to <Wheel>.
 */
export default function useLiveSpin(spin, liveNames) {
  const [phase, setPhase] = useState("idle"); // idle | spinning | result
  const [spinCmd, setSpinCmd] = useState(null);
  const seenSpin = useRef(undefined);
  const timers = useRef([]);

  useEffect(() => {
    // No cleanup is returned on purpose: the settings doc also updates for unrelated
    // reasons (e.g. entries closed) mid-spin, and that must not cancel the reveal.
    // Timers are cleared only by a new spin or on unmount.
    const firstLoad = seenSpin.current === undefined;
    if (spin?.id === seenSpin.current) return;
    seenSpin.current = spin?.id ?? null;
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (!spin) {
      setPhase("idle");
      return;
    }

    const duration = spin.durationMs || SPIN_MS;
    const elapsed = Date.now() - (spin.at || 0);
    const remaining = firstLoad ? duration - elapsed : duration;

    if (firstLoad && remaining <= 0) {
      // Finished before we arrived: show it stopped on the winner for a while.
      if (elapsed < duration + HOLD_RESULT_MS) {
        setSpinCmd({ id: spin.id, angle: spin.angle, ms: 0 });
        setPhase("result");
        timers.current.push(setTimeout(() => setPhase("idle"), duration + HOLD_RESULT_MS - elapsed));
      } else {
        setPhase("idle");
      }
      return;
    }

    const ms = Math.max(1500, Math.min(duration, remaining));
    setSpinCmd({ id: spin.id, angle: spin.angle, ms });
    setPhase("spinning");
    timers.current.push(setTimeout(() => setPhase("result"), ms + 100));
    timers.current.push(setTimeout(() => setPhase("idle"), ms + HOLD_RESULT_MS));
  }, [spin]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      seenSpin.current = undefined; // a remount (e.g. React StrictMode) re-syncs from scratch
    },
    []
  );

  // While spinning / showing the result, keep the exact names the spin was made with.
  const spinNames = spin && Array.isArray(spin.names) ? spin.names.map((name, i) => ({ key: `s${i}`, name })) : null;
  const active = phase !== "idle" && spinNames;
  return {
    names: active ? spinNames : liveNames,
    phase,
    idle: phase === "idle",
    spinCmd,
    winner: phase === "result" && spin ? { key: `s${spin.winnerIndex}`, name: spin.winnerName } : null,
  };
}
