"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { FullscreenToggle } from "@/components/FullscreenToggle";
import { Candle, type CandleData, type CandlePhase } from "./Candle";
import { CandleAudio } from "./audio";
import { AmbientLoop } from "@/lib/AmbientLoop";
import {
  type CandleMemory, describeMemory, loadMemory, saveMemory,
} from "./storage";

/**
 * The candle shrine.
 *
 * Three candles, each with a suggested intention prompt. Tapping an unlit
 * candle opens a small input for a personal intention; submitting (or skipping)
 * lights the candle. The candle visibly burns down, drips, and pools wax
 * against a slowly-warming room.
 *
 * Why a single 1Hz tick drives the entire UI: every time-derived value (burn
 * meter, room dimming, halo intensity, bell scheduling) updates at the same
 * coarse rate. This is the cheapest possible animation strategy — one
 * setInterval, all CSS keyframes for actual motion.
 */

const PROMPTS = [
  "for someone you've lost",
  "for a worry to set down",
  "for a small hope",
];

const MUTE_KEY = "vespers.candle.muted";
const BELL_INTERVAL_MS = 5 * 60 * 1000;
const ROOM_DIM_PEAK_MS = 4 * 60 * 1000; // dim peaks after 4 cumulative minutes
const HALO_IDLE_THRESHOLD_S = 8;
const HALO_IDLE_FULL_S = 20;

function makeShrine(): CandleData[] {
  return PROMPTS.map((p, i) => ({
    id: `c${i}`,
    prompt: p,
    intention: "",
    phase: "unlit" as CandlePhase,
    litAt: 0,
    burnedMsTotal: 0,
  }));
}

interface BurningLetter {
  text: string;
  startedAt: number;
}

export default function CandlePage() {
  const [shrine, setShrine] = useState<CandleData[]>(makeShrine);
  const [now, setNow] = useState(performance.now());
  const [muted, setMuted] = useState(true);
  const [letter, setLetter] = useState("");
  const [burning, setBurning] = useState<BurningLetter | null>(null);
  const [memory, setMemory] = useState<CandleMemory | null>(null);
  const [carrying, setCarrying] = useState<{ fromId: string; x: number; y: number } | null>(null);

  const audioRef = useRef<CandleAudio | null>(null);
  const ambientRef = useRef<AmbientLoop | null>(null);
  const lastInputRef = useRef<number>(performance.now());
  const lastBellAtRef = useRef<number>(0);
  const haloRef = useRef<HTMLDivElement>(null);

  // ── mount-time setup ──────────────────────────────────────────────

  useEffect(() => {
    setMemory(loadMemory());
    try {
      const stored = localStorage.getItem(MUTE_KEY);
      if (stored !== null) setMuted(stored === "1");
    } catch { /* fine */ }
    audioRef.current = new CandleAudio(true);
    ambientRef.current = new AmbientLoop({ src: "/audio/candle.mp3", muted: true, volume: 0.24 });
    return () => {
      audioRef.current?.destroy();
      ambientRef.current?.destroy();
      ambientRef.current = null;
    };
  }, []);

  // ── 1Hz tick: drives burn meter, dim, halo, bell ──────────────────
  // Only runs when at least one candle is lit; otherwise the page is fully idle.
  useEffect(() => {
    const anyActive = shrine.some(
      (c) => c.phase === "lit" || c.phase === "extinguishing",
    );
    if (!anyActive) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);

      // halo idle intensity → CSS variable on the page wrapper
      const idleSec = (t - lastInputRef.current) / 1000;
      const intensity = Math.max(
        0,
        Math.min(1, (idleSec - HALO_IDLE_THRESHOLD_S) /
          (HALO_IDLE_FULL_S - HALO_IDLE_THRESHOLD_S)),
      );
      haloRef.current?.style.setProperty("--idle", String(intensity));

      // bell every 5 minutes of any-candle-lit time
      const anyLit = shrineRef.current.some((c) => c.phase === "lit");
      if (anyLit) {
        if (lastBellAtRef.current === 0) lastBellAtRef.current = t;
        if (t - lastBellAtRef.current >= BELL_INTERVAL_MS) {
          audioRef.current?.bell();
          lastBellAtRef.current = t;
        }
      } else {
        lastBellAtRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [shrine]);

  // ref-mirror so the interval can read latest shrine without re-binding
  const shrineRef = useRef(shrine);
  shrineRef.current = shrine;

  // ── pointer activity tracking via ref (no re-render storm) ────────

  useEffect(() => {
    const onMove = () => { lastInputRef.current = performance.now(); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("keydown", onMove);
    };
  }, []);

  // ── derived: room dim ─────────────────────────────────────────────

  const totalBurnedMs = useMemo(() => {
    let acc = 0;
    for (const c of shrine) {
      acc += c.burnedMsTotal;
      if (c.phase === "lit" && c.litAt) acc += Math.max(0, now - c.litAt);
    }
    return acc;
  }, [shrine, now]);
  const dim = Math.min(1, totalBurnedMs / ROOM_DIM_PEAK_MS);

  // ── candle interactions ──────────────────────────────────────────

  const tapCandle = useCallback((id: string) => {
    setShrine((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      if (c.phase === "unlit") return { ...c, phase: "composing" };
      if (c.phase === "composing") return { ...c, phase: "unlit" };
      if (c.phase === "lit") {
        // accumulate burn time and start extinguish
        const burned = Math.max(0, performance.now() - c.litAt);
        return {
          ...c,
          phase: "extinguishing",
          burnedMsTotal: c.burnedMsTotal + burned,
          litAt: 0,
        };
      }
      return c;
    }));
  }, []);

  // when a candle enters extinguishing, schedule the return-to-unlit and
  // persist memory if it was a long burn
  useEffect(() => {
    const extinguishing = shrine.filter((c) => c.phase === "extinguishing");
    if (extinguishing.length === 0) return;
    for (const c of extinguishing) {
      if (c.burnedMsTotal > 0) saveMemory(c.burnedMsTotal);
    }
    const id = setTimeout(() => {
      setShrine((prev) => prev.map((c) =>
        c.phase === "extinguishing"
          ? { ...c, phase: "unlit", intention: "" }
          : c,
      ));
      // refresh memory display if we just persisted a longer burn
      setMemory(loadMemory());
      // stop the audio bed if no candles remain lit
      if (!shrineRef.current.some((c) => c.phase === "lit")) {
        audioRef.current?.stopHum();
      }
    }, 2400);
    return () => clearTimeout(id);
  }, [shrine]);

  const submitIntention = useCallback((id: string, text: string) => {
    setShrine((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        phase: "lit",
        intention: text,
        litAt: performance.now(),
      };
    }));
    audioRef.current?.start();
    audioRef.current?.startHum();
  }, []);

  const cancelIntention = useCallback((id: string) => {
    setShrine((prev) => prev.map((c) =>
      c.id === id ? { ...c, phase: "unlit" } : c,
    ));
  }, []);

  // ── spark drag-to-light ──────────────────────────────────────────

  const onSparkPickup = useCallback((id: string, e: React.PointerEvent) => {
    setCarrying({ fromId: id, x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!carrying) return;
    const onMove = (e: PointerEvent) => {
      setCarrying((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };
    const onUp = (e: PointerEvent) => {
      // hit-test: any unlit candle under the pointer
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-candle-id]");
      const targetId = hit?.getAttribute("data-candle-id");
      if (targetId && targetId !== carrying.fromId) {
        const target = shrineRef.current.find((c) => c.id === targetId);
        if (target && target.phase === "unlit") {
          // light immediately with the prompt as intention (no input needed —
          // the spark IS the intention here, carried from another candle)
          setShrine((prev) => prev.map((c) =>
            c.id === targetId
              ? { ...c, phase: "lit", litAt: performance.now(), intention: "" }
              : c,
          ));
        }
      }
      setCarrying(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [carrying]);

  // ── audio mute ───────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      audioRef.current?.start();
      audioRef.current?.setMuted(next);
      ambientRef.current?.start();
      ambientRef.current?.setMuted(next);
      try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  // ── letter that burns ────────────────────────────────────────────

  const offerLetter = useCallback(() => {
    const trimmed = letter.trim();
    if (!trimmed) return;
    if (!shrine.some((c) => c.phase === "lit")) return; // need a flame
    setBurning({ text: trimmed, startedAt: performance.now() });
    setLetter("");
    // animation total time = trimmed.length * 30ms + 600ms tail
    const total = trimmed.length * 30 + 800;
    setTimeout(() => setBurning(null), total);
  }, [letter, shrine]);

  // ── render ────────────────────────────────────────────────────────

  const canBurnLetter = letter.trim().length > 0 &&
    shrine.some((c) => c.phase === "lit") &&
    !burning;

  return (
    <main
      ref={haloRef}
      className="candle-stage"
      style={{
        // CSS variables drive room dim + halo idle warmth without re-renders
        ["--dim" as string]: String(dim),
      }}
    >
      <PaperSurface />

      <header className="candle-header">
        <Link href="/play" className="eyebrow ink-link no-underline">
          ← play
        </Link>
        <div className="flex items-center gap-5 sm:gap-6">
          <span className="eyebrow hidden sm:inline">§ iii — the candle</span>
          <button
            onClick={toggleMute}
            aria-pressed={!muted}
            aria-label={muted ? "turn sound on" : "turn sound off"}
            className="eyebrow ink-link no-underline inline-flex items-center gap-2"
          >
            {muted ? "sound off" : "sound on"}
          </button>
          <FullscreenToggle />
        </div>
      </header>

      <section className="shrine">
        {shrine.map((c) => (
          <div key={c.id} data-candle-id={c.id} className="shrine-slot">
            <Candle
              candle={c}
              now={now}
              carryingSpark={carrying !== null}
              isSparkSource={carrying?.fromId === c.id}
              onTap={() => tapCandle(c.id)}
              onSubmitIntention={(txt) => submitIntention(c.id, txt)}
              onCancelIntention={() => cancelIntention(c.id)}
              onSparkPickup={(e) => onSparkPickup(c.id, e)}
            />
          </div>
        ))}
      </section>

      <section className="letter-bay">
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          placeholder="a line for the flame, if you'd like…"
          maxLength={140}
          rows={2}
          className="letter-field"
          disabled={burning !== null}
        />
        <div className="letter-actions">
          <span className="eyebrow muted">
            {shrine.some((c) => c.phase === "lit")
              ? "the flame is ready."
              : "light a candle first."}
          </span>
          <button
            onClick={offerLetter}
            disabled={!canBurnLetter}
            className="eyebrow ink-link no-underline letter-submit"
          >
            give it to the flame →
          </button>
        </div>

        {burning && (
          <div className="letter-burning" aria-hidden>
            {burning.text.split("").map((ch, i) => (
              <span
                key={i}
                style={{ animationDelay: `${i * 30}ms` }}
                className="letter-char"
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </div>
        )}
      </section>

      <footer className="candle-footer">
        <p className="display italic candle-footer-line">
          tap a wick when you're ready. there's no rush.
        </p>
        {memory && (
          <p className="candle-footer-memory">{describeMemory(memory)}</p>
        )}
        <Link href="/app" className="eyebrow ink-link no-underline">
          back to the conversation →
        </Link>
      </footer>

      {/* the carrying spark — only when actively dragging */}
      {carrying && (
        <div
          className="spark"
          style={{ left: carrying.x, top: carrying.y }}
          aria-hidden
        />
      )}

      <style jsx>{`
        .candle-stage {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          /* room dim — paper warms toward amber as candles burn */
          background:
            radial-gradient(
              ellipse at center,
              rgba(255, 218, 170, calc(var(--dim, 0) * 0.35)) 0%,
              rgba(255, 230, 201, 0) 60%
            ),
            #FFE6C9;
          transition: background 1.2s ease-out;
        }
        .candle-header {
          padding: 32px 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        @media (min-width: 640px) {
          .candle-header { padding: 40px 40px 0; }
        }
        @media (min-width: 1024px) {
          .candle-header { padding: 40px 64px 0; }
        }

        .shrine {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
          padding: 32px 16px;
          flex-wrap: wrap;
        }
        @media (min-width: 640px) {
          .shrine { gap: 24px; padding: 48px 24px; }
        }
        .shrine-slot {
          flex: 1 1 110px;
          max-width: 200px;
          min-width: 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .letter-bay {
          padding: 16px 24px 24px;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
          position: relative;
        }
        .letter-field {
          width: 100%;
          background: rgba(251, 211, 168, 0.5);
          border: 1px solid rgba(11,26,51,0.18);
          border-radius: 6px;
          padding: 12px 14px;
          font-family: var(--font-fraunces);
          font-size: 15px;
          line-height: 1.55;
          color: #161412;
          resize: none;
          outline: none;
          transition: border-color 200ms ease;
        }
        .letter-field:focus {
          border-color: rgba(11,26,51,0.45);
        }
        .letter-field:disabled {
          opacity: 0.5;
        }
        .letter-actions {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .letter-submit:disabled {
          opacity: 0.35;
          pointer-events: none;
        }
        .letter-burning {
          position: absolute;
          left: 24px;
          right: 24px;
          top: 16px;
          padding: 12px 14px;
          font-family: var(--font-fraunces);
          font-size: 15px;
          line-height: 1.55;
          pointer-events: none;
          white-space: pre-wrap;
          color: #161412;
        }
        .letter-char {
          display: inline-block;
          animation: charBurn 900ms ease-out forwards;
        }
        @keyframes charBurn {
          0%   { opacity: 1; transform: translateY(0); color: #161412; }
          40%  { opacity: 0.9; color: #C24A2A; transform: translateY(-2px); }
          75%  { opacity: 0.6; color: #FFB07A; transform: translateY(-10px); }
          100% { opacity: 0; transform: translateY(-26px); color: rgba(255,232,200,0); }
        }

        .candle-footer {
          padding: 12px 24px 32px;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
          border-top: 1px solid rgba(11,26,51,0.12);
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
        }
        .candle-footer-line {
          color: rgba(31,43,71,0.85);
          font-size: 15px;
        }
        .candle-footer-memory {
          color: #7A6651;
          font-size: 12.5px;
          font-style: italic;
          font-family: var(--font-fraunces);
        }
        @media (min-width: 640px) {
          .candle-footer {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
          }
        }

        /* — the drag-spark — */
        .spark {
          position: fixed;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, #FFE9A8 0%, #F4C9B5 50%, transparent 80%);
          pointer-events: none;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 20px rgba(255,200,150,0.85), 0 0 40px rgba(255,180,120,0.5);
          z-index: 50;
          animation: sparkPulse 0.6s ease-in-out infinite alternate;
        }
        @keyframes sparkPulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
        }
      `}</style>

      {/* shared global candle styles — Candle.tsx components reference these */}
      <style jsx global>{`
        .candle-cell {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .candle-label {
          min-height: 56px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 100%;
          padding: 0 4px;
          text-align: center;
        }
        .candle-prompt {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(122,102,81,0.85);
          line-height: 1.5;
        }
        .candle-intention {
          font-family: var(--font-allura);
          font-size: 28px;
          line-height: 1;
          color: #0B2545;
          padding-bottom: 4px;
          animation: intentionFadeIn 1.2s ease-out;
        }
        @keyframes intentionFadeIn {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .candle-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .candle-input {
          width: 100%;
          background: rgba(251,211,168,0.6);
          border: 1px solid rgba(11,26,51,0.22);
          border-radius: 4px;
          padding: 6px 8px;
          font-family: var(--font-fraunces);
          font-style: italic;
          font-size: 13px;
          color: #161412;
          text-align: center;
          outline: none;
        }
        .candle-input:focus {
          border-color: rgba(11,26,51,0.55);
        }
        .candle-form-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .candle-link-btn {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #0B2545;
          background: none;
          border: none;
          padding: 2px 4px;
          cursor: pointer;
        }
        .candle-link-btn.muted { color: #7A6651; }

        .candle-button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          width: 100%;
          max-width: 200px;
          position: relative;
          display: block;
        }
        .candle-button:focus-visible {
          outline: 2px solid #0B2545;
          outline-offset: 4px;
          border-radius: 4px;
        }

        .candle-meter {
          font-family: var(--font-fraunces);
          font-style: italic;
          font-size: 11.5px;
          color: rgba(122,102,81,0.85);
          min-height: 20px;
          margin-top: 4px;
        }

        /* — flame flicker without SVG filter — */
        .candle-flame {
          animation: flicker 0.95s ease-in-out infinite alternate;
        }
        @keyframes flicker {
          0%   { transform: rotate(-1.6deg) scaleY(1)    translateX(0); }
          25%  { transform: rotate(1.4deg)  scaleY(1.04) translateX(0.5px); }
          60%  { transform: rotate(-0.8deg) scaleY(0.97) translateX(-0.4px); }
          100% { transform: rotate(2deg)    scaleY(1.02) translateX(0.3px); }
        }

        .candle-halo {
          /* halo grows softly when the page has been still for a while */
          transform-origin: center;
          transform: scale(calc(1 + var(--idle, 0) * 0.18));
          opacity: calc(0.85 + var(--idle, 0) * 0.15);
          transition: transform 1.6s ease-out, opacity 1.6s ease-out;
        }

        /* — smoke — */
        .candle-smoke {
          animation: smokeRise 2.2s ease-out forwards;
          transform-origin: center;
        }
        @keyframes smokeRise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.5; }
          100% { transform: translateY(-110px) translateX(14px) scale(2.4); opacity: 0; }
        }

        /* — spark handle (small invisible affordance near the flame) — */
        .candle-spark-handle {
          position: absolute;
          left: 50%;
          top: 12%;
          width: 50px;
          height: 50px;
          transform: translate(-50%, -50%);
          cursor: grab;
          touch-action: none;
        }
        .candle-spark-handle:active { cursor: grabbing; }

        .candle-button.is-source .candle-flame {
          opacity: 0.6;
        }
      `}</style>
    </main>
  );
}
