"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { FullscreenToggle } from "@/components/FullscreenToggle";

type Phase = "inhale" | "hold-in" | "exhale" | "hold-out" | "inhale-2";

interface Step {
  phase: Phase;
  seconds: number;
  /** Label shown to the user during this step. */
  label: string;
}

interface Technique {
  key: string;
  name: string;
  blurb: string;
  steps: Step[];
}

const TECHNIQUES: Technique[] = [
  {
    key: "box",
    name: "Box breathing",
    blurb:
      "Four in, four hold, four out, four hold. A square. Used by people who need to steady the body fast.",
    steps: [
      { phase: "inhale", seconds: 4, label: "in" },
      { phase: "hold-in", seconds: 4, label: "hold" },
      { phase: "exhale", seconds: 4, label: "out" },
      { phase: "hold-out", seconds: 4, label: "hold" },
    ],
  },
  {
    key: "478",
    name: "4 · 7 · 8",
    blurb:
      "Four in through the nose, hold seven, eight long out through the mouth. Slows everything down.",
    steps: [
      { phase: "inhale", seconds: 4, label: "in" },
      { phase: "hold-in", seconds: 7, label: "hold" },
      { phase: "exhale", seconds: 8, label: "out" },
    ],
  },
  {
    key: "sigh",
    name: "Physiological sigh",
    blurb:
      "Two short inhales through the nose, one long exhale through the mouth. Resets the nervous system in seconds.",
    steps: [
      { phase: "inhale", seconds: 2, label: "in" },
      { phase: "inhale-2", seconds: 1, label: "in again" },
      { phase: "exhale", seconds: 5, label: "out, long" },
    ],
  },
];

const TECH_KEY = "vespers.breathe.technique";
const COUNT_KEY = "vespers.breathe.cycles";

export default function BreathePage() {
  const [techKey, setTechKey] = useState<string>("box");
  const technique = useMemo(
    () => TECHNIQUES.find((t) => t.key === techKey) ?? TECHNIQUES[0],
    [techKey],
  );

  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds into the current step
  const [cycles, setCycles] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Hydrate prefs.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const t = localStorage.getItem(TECH_KEY);
    if (t && TECHNIQUES.some((x) => x.key === t)) setTechKey(t);
    const c = localStorage.getItem(COUNT_KEY);
    if (c && !Number.isNaN(Number(c))) setCycles(Number(c));
  }, []);

  // Persist technique pick.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(TECH_KEY, techKey);
    } catch {
      /* storage unavailable */
    }
  }, [techKey]);

  // Persist cycle count.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(COUNT_KEY, String(cycles));
    } catch {
      /* storage unavailable */
    }
  }, [cycles]);

  // Reset step state when technique changes.
  useEffect(() => {
    setStepIdx(0);
    setElapsed(0);
  }, [techKey]);

  // rAF loop — advances elapsed within the current step; on overflow rolls
  // into the next step; when a full cycle completes, increments cycles.
  useEffect(() => {
    if (!running) return;
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setElapsed((prev) => {
        const step = technique.steps[stepIdx];
        const next = prev + dt;
        if (next < step.seconds) return next;
        // Roll into next step (sync to React state on next tick via setStepIdx).
        const overflow = next - step.seconds;
        setStepIdx((idx) => {
          const nextIdx = (idx + 1) % technique.steps.length;
          if (nextIdx === 0) setCycles((c) => c + 1);
          return nextIdx;
        });
        return overflow;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [running, technique, stepIdx]);

  const step = technique.steps[stepIdx];
  const stepProgress = Math.min(1, elapsed / step.seconds);
  const secondsRemaining = Math.max(0, Math.ceil(step.seconds - elapsed));

  // Visual size of the breather: expands during inhale phases, contracts on
  // exhale, holds steady on hold phases.
  const scale = (() => {
    switch (step.phase) {
      case "inhale":
      case "inhale-2":
        return 0.55 + 0.45 * stepProgress;
      case "exhale":
        return 1.0 - 0.45 * stepProgress;
      case "hold-in":
        return 1.0;
      case "hold-out":
        return 0.55;
      default:
        return 0.7;
    }
  })();

  const toggle = useCallback(() => {
    setRunning((r) => !r);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setStepIdx(0);
    setElapsed(0);
  }, []);

  return (
    <main className="breathe-stage">
      <PaperSurface />

      <header className="breathe-header">
        <Link href="/play" className="eyebrow ink-link no-underline">
          ← play
        </Link>
        <div className="flex items-center gap-5 sm:gap-6">
          <span className="eyebrow hidden sm:inline">§ iv — the breath</span>
          <FullscreenToggle />
        </div>
      </header>

      <section className="breathe-techniques">
        {TECHNIQUES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTechKey(t.key);
              setRunning(false);
            }}
            className={`tech-pill ${t.key === techKey ? "tech-pill-active" : ""}`}
            aria-pressed={t.key === techKey}
          >
            {t.name}
          </button>
        ))}
      </section>

      <section className="breathe-canvas" onClick={toggle} role="button" aria-label="tap to start or pause">
        <div
          className="breathe-circle"
          style={{ transform: `scale(${scale.toFixed(3)})` }}
          aria-hidden
        />
        <div className="breathe-label">
          <div className="display italic breathe-cue">{running ? step.label : "tap to begin"}</div>
          {running && (
            <div className="eyebrow breathe-count tabular-nums">{secondsRemaining}</div>
          )}
        </div>
      </section>

      <section className="breathe-meta">
        <p className="text-margin text-[14px] leading-[1.65] max-w-md mx-auto text-center">
          {technique.blurb}
        </p>
        <div className="breathe-controls">
          <button onClick={toggle} className="eyebrow ink-link no-underline">
            {running ? "pause" : "begin"}
          </button>
          <span className="eyebrow muted">
            cycles · <span className="tabular-nums">{cycles}</span>
          </span>
          <button onClick={reset} className="eyebrow ink-link no-underline">
            reset
          </button>
        </div>
      </section>

      <footer className="breathe-footer">
        <p className="display italic breathe-footer-line">
          when the words are too much, follow the circle.
        </p>
        <Link href="/app" className="eyebrow ink-link no-underline">
          back to the conversation →
        </Link>
      </footer>

      <style jsx>{`
        .breathe-stage {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          background: #FFE6C9;
        }
        .breathe-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.6rem 1.6rem 0;
          max-width: 1240px;
          margin: 0 auto;
          width: 100%;
        }
        .breathe-techniques {
          display: flex;
          gap: 0.6rem;
          justify-content: center;
          padding: 1.4rem 1rem 0;
          flex-wrap: wrap;
        }
        .tech-pill {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 0.45rem 0.9rem;
          border: 1px solid rgba(11, 26, 51, 0.18);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.5);
          color: #0B1A33;
          transition: background 200ms ease, border-color 200ms ease;
        }
        .tech-pill:hover {
          background: rgba(255, 255, 255, 0.85);
        }
        .tech-pill-active {
          background: #0B1A33;
          color: #FFE6C9;
          border-color: #0B1A33;
        }
        .breathe-canvas {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          min-height: 60vh;
        }
        .breathe-circle {
          position: absolute;
          width: min(54vmin, 460px);
          height: min(54vmin, 460px);
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(184, 90, 30, 0.32),
              rgba(184, 90, 30, 0.12) 60%,
              rgba(184, 90, 30, 0) 75%
            ),
            radial-gradient(
              circle at center,
              rgba(11, 26, 51, 0.18),
              rgba(11, 26, 51, 0) 70%
            );
          border: 1px solid rgba(11, 26, 51, 0.18);
          box-shadow: 0 30px 80px -30px rgba(11, 26, 51, 0.35);
          transition: transform 380ms cubic-bezier(0.4, 0, 0.4, 1);
          will-change: transform;
        }
        .breathe-label {
          position: relative;
          z-index: 1;
          text-align: center;
          color: #0B1A33;
          pointer-events: none;
        }
        .breathe-cue {
          font-size: clamp(28px, 4vw, 44px);
          color: #0B1A33;
        }
        .breathe-count {
          margin-top: 0.5rem;
          font-size: 14px;
          color: #7A6651;
          letter-spacing: 0.22em;
        }
        .breathe-meta {
          padding: 0 1.4rem;
        }
        .breathe-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.8rem;
          margin-top: 1.2rem;
          padding-bottom: 1.6rem;
        }
        .muted { color: #7A6651; }
        .breathe-footer {
          max-width: 1240px;
          margin: 0 auto;
          width: 100%;
          padding: 1.4rem 1.6rem 2.4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          border-top: 1px solid rgba(11, 26, 51, 0.12);
        }
        .breathe-footer-line {
          color: #0B1A33;
          font-size: 16px;
          margin: 0;
        }
      `}</style>
    </main>
  );
}
