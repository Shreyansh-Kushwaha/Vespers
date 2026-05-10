"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A tiny eyebrow-styled fullscreen toggle. Drops into the header of any /play
 * route — it requests fullscreen on the document element so the entire game
 * canvas + UI overlay enters together.
 *
 * Why we listen to `fullscreenchange` instead of just toggling local state on
 * click: the user can also exit fullscreen with Esc, system gestures, or a
 * second tab event. Tracking the actual document state keeps the label honest.
 */
interface Props {
  /** Optional className override for the button. */
  className?: string;
  /** Color for the label text. Defaults to the muted margin tone. */
  color?: string;
}

function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  // Most browsers expose `fullscreenElement`. Safari historically used the
  // webkit-prefixed variant; we accept either to avoid a stale label.
  type FsDoc = Document & { webkitFullscreenElement?: Element | null };
  const d = document as FsDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

async function requestFullscreen(): Promise<void> {
  type FsEl = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  const el = document.documentElement as FsEl;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
}

async function exitFullscreen(): Promise<void> {
  type FsDoc = Document & { webkitExitFullscreen?: () => Promise<void> };
  const d = document as FsDoc;
  if (d.exitFullscreen) return d.exitFullscreen();
  if (d.webkitExitFullscreen) return d.webkitExitFullscreen();
}

export function FullscreenToggle({ className = "", color }: Props) {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setActive(isFullscreen());
    setSupported(
      Boolean(
        document.documentElement.requestFullscreen ||
          (document.documentElement as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void>;
          }).webkitRequestFullscreen,
      ),
    );

    const onChange = () => setActive(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const onClick = useCallback(async () => {
    try {
      if (isFullscreen()) await exitFullscreen();
      else await requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser policy (e.g. iframe without
      // allow="fullscreen"). Silently no-op — the user just stays in the
      // page-level full-bleed layout, which is already the experience.
    }
  }, []);

  // iOS Safari on iPhone has no fullscreen API at all. Hide rather than show
  // a button that would do nothing.
  if (!supported) return null;

  return (
    <button
      onClick={onClick}
      className={[
        "eyebrow ink-link no-underline inline-flex items-center gap-2",
        className,
      ].join(" ")}
      style={color ? { color } : undefined}
      aria-pressed={active}
      aria-label={active ? "exit fullscreen" : "enter fullscreen"}
    >
      <FullscreenIcon active={active} color={color} />
      {active ? "exit fullscreen" : "fullscreen"}
    </button>
  );
}

function FullscreenIcon({ active, color }: { active: boolean; color?: string }) {
  const stroke = color ?? "currentColor";
  // Two glyphs sharing the same 12×12 box — corners-out for "enter",
  // corners-in for "exit".
  if (active) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M5 1 L5 5 L1 5 M7 1 L7 5 L11 5 M5 11 L5 7 L1 7 M7 11 L7 7 L11 7"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M1 4 L1 1 L4 1 M11 4 L11 1 L8 1 M1 8 L1 11 L4 11 M11 8 L11 11 L8 11"
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
