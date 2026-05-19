"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FullscreenToggle } from "@/components/FullscreenToggle";
import { Pond } from "@/lib/pond/Pond";
import { AmbientLoop } from "@/lib/AmbientLoop";

const MUTE_KEY = "vespers.koi.muted";
const FOOD_KEY = "vespers.koi.food";

/**
 * The koi pond — thin React shell. All the rendering, AI, audio, and quality
 * logic lives in `lib/pond/`. The component's job here is just to mount, hand
 * the canvas to a Pond instance, and expose mute / fullscreen / tier UI.
 */
export default function KoiPond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pondRef = useRef<Pond | null>(null);
  const ambientRef = useRef<AmbientLoop | null>(null);
  const [muted, setMuted] = useState(true);
  const [foodMode, setFoodMode] = useState(false);
  const [tier, setTier] = useState<string>("…");

  // Hydrate prefs before mount so the Pond starts with the right state.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const m = localStorage.getItem(MUTE_KEY);
    if (m !== null) setMuted(m === "1");
    const f = localStorage.getItem(FOOD_KEY);
    if (f !== null) setFoodMode(f === "1");
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const pond = new Pond(canvasRef.current, {
      muted,
      onTierChange: (caps) => setTier(caps.tier),
    });
    pondRef.current = pond;
    pond.setFoodMode(foodMode);
    setTier(pond.tier().tier);
    pond.start();
    ambientRef.current = new AmbientLoop({ src: "/audio/koi.mp3", muted: true, volume: 0.22 });
    return () => {
      pond.stop();
      ambientRef.current?.destroy();
      ambientRef.current = null;
    };
    // Pond is instantiated once; prefs are forwarded via setMuted/setFoodMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    pondRef.current?.setMuted(next);
    ambientRef.current?.start();
    ambientRef.current?.setMuted(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    }
  }

  function toggleFood() {
    const next = !foodMode;
    setFoodMode(next);
    pondRef.current?.setFoodMode(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FOOD_KEY, next ? "1" : "0");
    }
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#0B1A33]">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "manipulation",
        }}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto px-6 sm:px-10 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between">
          <Link
            href="/play"
            className="text-paper/80 hover:text-paper text-[11px] uppercase tracking-[0.22em] no-underline transition-colors"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ← play
          </Link>

          <div className="flex items-center gap-5 sm:gap-6">
            <span
              className="text-paper/60 text-[11px] uppercase tracking-[0.22em] hidden sm:inline"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              § i — the koi pond
            </span>

            <button
              onClick={toggleFood}
              aria-pressed={foodMode}
              aria-label={foodMode ? "stop feeding the koi" : "feed the koi"}
              className="text-paper/85 hover:text-paper text-[11px] uppercase tracking-[0.22em] inline-flex items-center gap-2 transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <FoodIcon on={foodMode} />
              {foodMode ? "feeding" : "throw food"}
            </button>

            <button
              onClick={toggleMute}
              aria-pressed={!muted}
              aria-label={muted ? "turn sound on" : "turn sound off"}
              className="text-paper/85 hover:text-paper text-[11px] uppercase tracking-[0.22em] inline-flex items-center gap-2 transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <SoundIcon muted={muted} />
              {muted ? "sound off" : "sound on"}
            </button>

            <FullscreenToggle color="rgba(255,230,201,0.85)" />
          </div>
        </header>

        <div className="flex-1" />

        <footer className="pointer-events-none px-6 sm:px-10 lg:px-16 pb-10 flex items-end justify-between">
          <p
            className="text-paper/60 text-[12.5px] italic max-w-sm leading-relaxed"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {foodMode
              ? "tap the water to scatter food. the koi will come."
              : "tap the water — they'll come. tap a koi — they scatter."}
            {tier === "low" && (
              <span className="block text-paper/35 text-[10px] uppercase tracking-[0.22em] mt-2"
                style={{ fontFamily: "var(--font-mono)" }}>
                quiet mode — fewer particles
              </span>
            )}
          </p>
          <Link
            href="/app"
            className="pointer-events-auto text-paper/70 hover:text-paper text-[11px] uppercase tracking-[0.22em] no-underline transition-colors"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            back to the conversation →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M2 4.5 L2 7.5 L4 7.5 L7 10 L7 2 L4 4.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M9 4 L11 8 M11 4 L9 8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M9 4 Q 10.5 6 9 8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

function FoodIcon({ on }: { on: boolean }) {
  // Three pellets falling — solid when feeding, outlined when off.
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      {on ? (
        <>
          <circle cx="3" cy="3" r="1.3" fill="currentColor" />
          <circle cx="7" cy="6" r="1.3" fill="currentColor" />
          <circle cx="4.5" cy="9" r="1.3" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="3" cy="3" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="7" cy="6" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="4.5" cy="9" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </>
      )}
    </svg>
  );
}
