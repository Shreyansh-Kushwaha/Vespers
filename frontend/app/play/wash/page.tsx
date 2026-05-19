"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { FullscreenToggle } from "@/components/FullscreenToggle";
import { AmbientLoop } from "@/lib/AmbientLoop";

const MUTE_KEY = "vespers.wash.muted";

/**
 * Watercolor washes.
 *
 * Tap to drop a bead of paint. Each bead "blooms" outward over a few seconds
 * — radius grows, alpha softens — and where they overlap they multiply, which
 * looks convincingly like wet paper.
 *
 * Implementation note: each frame redraws the paper + all drops. With ~100
 * drops the cost is fine; we never accumulate, so opacity stays controlled.
 */

interface Drop {
  x: number;
  y: number;
  color: string;
  bornAt: number;
  maxRadius: number;
  jitter: number; // 0..1 — slight asymmetry so the blob isn't a perfect circle
}

const PAPER = "#FFE6C9";

const PALETTE: { key: string; label: string; color: string }[] = [
  { key: "peach", label: "peach", color: "rgba(232, 164, 135, 0.55)" },
  { key: "navy", label: "navy", color: "rgba(11, 37, 69, 0.55)" },
  { key: "blush", label: "blush", color: "rgba(216, 142, 115, 0.55)" },
  { key: "moss", label: "moss", color: "rgba(91, 113, 78, 0.55)" },
  { key: "ink", label: "ink", color: "rgba(31, 43, 71, 0.65)" },
];

const BLOOM_DURATION = 3200; // ms

export default function Watercolor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colorIdx, setColorIdx] = useState(0);
  const colorRef = useRef(PALETTE[0].color);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<AmbientLoop | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(MUTE_KEY);
      if (v !== null) setMuted(v === "1");
    } catch { /* ignore */ }
    audioRef.current = new AmbientLoop({ src: "/audio/wash.mp3", muted: true });
    return () => { audioRef.current?.destroy(); audioRef.current = null; };
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    audioRef.current?.start();
    audioRef.current?.setMuted(next);
    try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  useEffect(() => {
    colorRef.current = PALETTE[colorIdx].color;
  }, [colorIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const drops: Drop[] = [];
    let running = true;

    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    function paperTexture() {
      // base paper
      ctx!.fillStyle = PAPER;
      ctx!.fillRect(0, 0, w, h);

      // very subtle fiber noise — pre-baked once into an offscreen canvas would
      // be faster, but the canvas is already cheap; this runs once a frame and
      // is barely visible.
      ctx!.save();
      ctx!.globalAlpha = 0.04;
      for (let i = 0; i < 60; i++) {
        ctx!.fillStyle = "#7A6651";
        ctx!.fillRect(
          Math.random() * w,
          Math.random() * h,
          Math.random() * 1.5,
          Math.random() * 1.5,
        );
      }
      ctx!.restore();
    }

    function drawDrop(d: Drop, now: number) {
      const age = now - d.bornAt;
      const k = Math.min(1, age / BLOOM_DURATION);
      // ease-out for the bloom
      const eased = 1 - Math.pow(1 - k, 2.4);
      const radius = d.maxRadius * (0.18 + eased * 0.82);

      // Radial gradient — wet edge slightly stronger than the heart of the drop
      const g = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, radius);
      g.addColorStop(0, replaceAlpha(d.color, 0.7));
      g.addColorStop(0.7, replaceAlpha(d.color, 0.55));
      g.addColorStop(1, replaceAlpha(d.color, 0));

      ctx!.save();
      ctx!.globalCompositeOperation = "multiply";
      ctx!.fillStyle = g;
      // slight wobble — perfect circles read as digital
      ctx!.beginPath();
      const wobble = d.jitter * radius * 0.18;
      ctx!.ellipse(
        d.x,
        d.y,
        radius + wobble,
        radius - wobble,
        d.jitter * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx!.fill();
      ctx!.restore();
    }

    function frame() {
      if (!running) return;
      const now = performance.now();
      paperTexture();
      for (const d of drops) drawDrop(d, now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function onPointer(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      drops.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        color: colorRef.current,
        bornAt: performance.now(),
        maxRadius: 60 + Math.random() * 70,
        jitter: Math.random(),
      });
      // hard cap so the canvas doesn't choke after a long session
      if (drops.length > 200) drops.shift();
    }

    function onMove(e: PointerEvent) {
      // dragging paints a soft trail at low frequency
      if (e.pressure > 0 || (e.buttons && e.buttons & 1)) {
        if (Math.random() < 0.18) onPointer(e);
      }
    }

    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", onMove);

    // expose rinse to React via a custom event
    function onRinse() {
      drops.length = 0;
    }
    window.addEventListener("vespers:rinse", onRinse);

    return () => {
      running = false;
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("vespers:rinse", onRinse);
    };
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-paper">
      <PaperSurface />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto px-6 sm:px-10 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between">
          <Link
            href="/play"
            className="ink-link no-underline text-[11px] uppercase tracking-[0.22em] text-ink"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ← play
          </Link>
          <div className="flex items-center gap-5 sm:gap-6">
            <span
              className="text-margin text-[11px] uppercase tracking-[0.22em] hidden sm:inline"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              § ii — watercolor washes
            </span>
            <button
              onClick={toggleMute}
              aria-pressed={!muted}
              aria-label={muted ? "turn sound on" : "turn sound off"}
              className="text-margin hover:text-ink text-[11px] uppercase tracking-[0.22em] inline-flex items-center gap-2 transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <WashSoundIcon muted={muted} />
              {muted ? "sound off" : "sound on"}
            </button>
            <FullscreenToggle />
          </div>
        </header>

        <div className="flex-1" />

        <footer className="pointer-events-auto px-6 sm:px-10 lg:px-16 pb-10 flex items-end justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 bg-paperDeep/80 backdrop-blur-sm border border-rule px-4 py-3 rounded-sm">
            {PALETTE.map((p, i) => (
              <button
                key={p.key}
                onClick={() => setColorIdx(i)}
                aria-label={p.label}
                className="relative w-8 h-8 rounded-full border transition-transform"
                style={{
                  background: p.color.replace(/0\.\d+\)/, "0.95)"),
                  borderColor:
                    colorIdx === i ? "rgba(11,26,51,0.85)" : "rgba(11,26,51,0.18)",
                  transform: colorIdx === i ? "scale(1.12)" : "scale(1)",
                }}
              />
            ))}
            <span className="ml-2 eyebrow">{PALETTE[colorIdx].label}</span>
            <span className="hairline-b inline-block w-6" />
            <button
              onClick={() => window.dispatchEvent(new Event("vespers:rinse"))}
              className="eyebrow ink-link no-underline"
            >
              rinse →
            </button>
          </div>

          <Link
            href="/app"
            className="text-margin hover:text-ink text-[11px] uppercase tracking-[0.22em] no-underline transition-colors"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            back to the conversation →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function replaceAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
}

function WashSoundIcon({ muted }: { muted: boolean }) {
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
