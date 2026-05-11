"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type GappuMood = "idle" | "thinking" | "talking" | "laughing" | "smiling";

interface Props {
  mood: GappuMood;
  size?: number;
  className?: string;
  /** When provided, Gappu periodically peeks at this element while it has
   *  focus (i.e. the user is typing). Pass the chat input wrapper. */
  peekTarget?: HTMLElement | null;
}

const PUPIL_MAX = 2.6;        // SVG units the pupil can travel
const GAZE_LERP = 0.18;       // how fast the eye catches up to the target
const GAZE_FPS_INTERVAL = 33; // ~30 fps update cap

/**
 * Tiny anime-style Gappu mascot. Single SVG, all features morph by `mood`.
 * Adds cursor-following pupils and occasional textbox peeks — both throttled
 * to ~30fps with refs so re-renders only happen when the gaze meaningfully
 * shifts.
 *
 * Performance:
 *   - One global mousemove listener writes to a ref, never to state.
 *   - One rAF loop runs while mounted; it caps state updates at ~30fps and
 *     skips updates entirely when the new offset is within 0.3 SVG units of
 *     the previous one (so a still mouse causes zero re-renders).
 *   - Blink + mouth timers only run while the corresponding mood is active.
 *   - On unmount (e.g. user switches back to Vespers) every listener and
 *     timer is cleaned up — no leftover work.
 */
export function GappuAvatar({ mood, size = 72, className, peekTarget }: Props) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [peekActive, setPeekActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const pupilRef = useRef({ x: 0, y: 0 });
  const peekActiveRef = useRef(false);

  // Mirror peekActive into a ref so the rAF loop can read it without
  // re-attaching itself when the state changes.
  useEffect(() => { peekActiveRef.current = peekActive; }, [peekActive]);

  // Blink scheduler — only runs when eyes are visible (not laughing)
  useEffect(() => {
    if (mood === "laughing") return;
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!mounted) return;
      setBlink(true);
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        setBlink(false);
        timeoutId = setTimeout(tick, 2500 + Math.random() * 2500);
      }, 110);
    };
    timeoutId = setTimeout(tick, 1200 + Math.random() * 1500);
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, [mood]);

  // Mouth flap — only runs while talking
  useEffect(() => {
    if (mood !== "talking") { setMouthOpen(false); return; }
    let mounted = true;
    const id = setInterval(() => {
      if (mounted) setMouthOpen((v) => !v);
    }, 180);
    return () => { mounted = false; clearInterval(id); };
  }, [mood]);

  // Global mousemove → ref only (no re-renders)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Periodic peek toward the textbox while it's focused
  useEffect(() => {
    if (!peekTarget) return;
    let mounted = true;
    let scheduleId: ReturnType<typeof setTimeout>;
    let resetId: ReturnType<typeof setTimeout>;

    const isFocused = () => {
      const ae = document.activeElement;
      return !!ae && (ae === peekTarget || peekTarget.contains(ae));
    };

    const trigger = () => {
      if (!mounted) return;
      if (isFocused()) {
        setPeekActive(true);
        resetId = setTimeout(() => {
          if (mounted) setPeekActive(false);
        }, 650 + Math.random() * 350);
      }
      scheduleId = setTimeout(trigger, 3500 + Math.random() * 3000);
    };

    scheduleId = setTimeout(trigger, 2500 + Math.random() * 1500);
    return () => {
      mounted = false;
      clearTimeout(scheduleId);
      clearTimeout(resetId);
    };
  }, [peekTarget]);

  // rAF loop: compute pupil offset toward whichever target is active.
  // Skips state updates when the change is too small to see.
  useEffect(() => {
    let mounted = true;
    let rafId = 0;
    let lastUpdate = 0;
    const loop = (t: number) => {
      if (!mounted) return;
      if (t - lastUpdate >= GAZE_FPS_INTERVAL) {
        lastUpdate = t;
        const c = containerRef.current;
        if (c) {
          // Eye center in screen coords. The eyes sit at ~55% down the SVG;
          // we use the bounding rect of the container which is the SVG box.
          const rect = c.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height * 0.55;

          // Pick the gaze target. While peeking, use the textbox center.
          let target: { x: number; y: number } | null = null;
          if (peekActiveRef.current && peekTarget) {
            const tr = peekTarget.getBoundingClientRect();
            target = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
          } else if (mouseRef.current) {
            target = mouseRef.current;
          }

          let nx = 0, ny = 0;
          if (target) {
            const dx = target.x - cx;
            const dy = target.y - cy;
            const d = Math.hypot(dx, dy);
            if (d > 0) {
              // Saturate at ~120px from the face — beyond that the eyes are
              // fully pinned in that direction.
              const norm = Math.min(1, d / 120);
              nx = (dx / d) * PUPIL_MAX * norm;
              ny = (dy / d) * PUPIL_MAX * norm;
            }
          }

          // Lerp toward target so eyes don't snap.
          pupilRef.current.x += (nx - pupilRef.current.x) * GAZE_LERP;
          pupilRef.current.y += (ny - pupilRef.current.y) * GAZE_LERP;

          // Push to React state only when the visible difference matters.
          if (
            Math.abs(pupilRef.current.x - pupilOffset.x) > 0.18 ||
            Math.abs(pupilRef.current.y - pupilOffset.y) > 0.18
          ) {
            setPupilOffset({ x: pupilRef.current.x, y: pupilRef.current.y });
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { mounted = false; cancelAnimationFrame(rafId); };
    // pupilOffset is intentionally NOT a dep — we only read it inside the
    // loop to gate setState, not to drive math.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekTarget]);

  // A tiny bobble whenever the mood changes — feels alive without being noisy.
  const bobKey = mood;

  const showLaugh = mood === "laughing";
  const showThinking = mood === "thinking";
  const showBlushAmbient = mood === "smiling" || peekActive;

  // Eye-state precedence: laughing > thinking > blinking > tracking.
  const eyesAreTrackable = !showLaugh && !showThinking && !blink;

  // While peeking, tilt the head slightly toward the textbox for cuteness.
  const peekTilt = peekActive ? -6 : 0;

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      initial={false}
      animate={{ rotate: peekTilt }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      key={bobKey}
    >
      <motion.div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
        initial={{ scale: 0.92, y: -2 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          aria-hidden
          style={{ display: "block", overflow: "visible" }}
        >
          {/* drop shadow disk */}
          <ellipse cx="50" cy="92" rx="28" ry="4" fill="rgba(122,51,4,0.18)" />

          {/* neck stub — thin, defines a jaw transition */}
          <rect x="44" y="82" width="12" height="9" fill="#FFE3C7" stroke="#D88E73" strokeWidth="1" />

          {/* ── face stack drawn FIRST so the hair can paint over the
              forehead. Order: face → ear nubs → hair (cap + bangs) → ahoge
              → sideburn flecks → highlight band. */}

          {/* face — slightly wider than tall for a squarer jaw */}
          <ellipse
            cx="50"
            cy="55"
            rx="32"
            ry="30"
            fill="#FFE3C7"
            stroke="#D88E73"
            strokeWidth="1.4"
          />

          {/* small ear nubs — visible just below the hairline */}
          <ellipse cx="17" cy="58" rx="2.6" ry="3.4" fill="#F2C8AC" stroke="#D88E73" strokeWidth="1" />
          <ellipse cx="83" cy="58" rx="2.6" ry="3.4" fill="#F2C8AC" stroke="#D88E73" strokeWidth="1" />

          {/* Boy haircut — single solid shape painted ON TOP of the face so
              it actually covers the forehead. Smooth rounded crown on top,
              jagged choppy-bang hairline along the bottom sitting just above
              the eyebrow line. One fill, no interior cutout. */}
          <path
            d="M 14 48
               Q 6 22 26 10
               Q 50 2 74 10
               Q 94 22 86 48
               L 82 45
               L 78 49
               L 74 44
               L 70 48
               L 66 43
               L 62 47
               L 58 43
               L 54 49
               L 50 43
               L 46 48
               L 42 43
               L 38 48
               L 34 43
               L 30 47
               L 26 44
               L 22 47
               L 18 44
               L 14 48
               Z"
            fill="#2a1505"
          />

          {/* Ahoge — anime cowlick on the crown. */}
          <path
            d="M 46 9
               L 50 -1
               L 54 9
               Z"
            fill="#2a1505"
          />

          {/* short sideburn flecks (boyish, not flowing) — hang down from the
              bottom of the hair past the ears */}
          <path d="M18 48 L 22 60 L 26 54 Z" fill="#2a1505" />
          <path d="M82 48 L 78 60 L 74 54 Z" fill="#2a1505" />

          {/* Subtle highlight band — a thin lighter stripe near the crown so
              the hair reads as having dimension. Lives inside the main shape. */}
          <path
            d="M 28 18
               Q 50 12 72 18
               Q 50 22 28 18
               Z"
            fill="#3a1f10"
          />

          {/* cheek blush — softer base, only really shows for laughing */}
          {(showLaugh || showBlushAmbient) && (
            <>
              <ellipse
                cx="32" cy="66" rx="4.5" ry="2.8"
                fill="#F4978E"
                opacity={showLaugh ? 0.7 : 0.28}
              />
              <ellipse
                cx="68" cy="66" rx="4.5" ry="2.8"
                fill="#F4978E"
                opacity={showLaugh ? 0.7 : 0.28}
              />
            </>
          )}

          {/* eyebrows — always visible, thick, slight outward tilt for character */}
          {showThinking ? (
            // worried/concentrated — inner ends pulled up
            <>
              <path
                d="M28 48 Q 34 42 42 50"
                fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round"
              />
              <path
                d="M58 50 Q 66 42 72 48"
                fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round"
              />
            </>
          ) : peekActive && eyesAreTrackable ? (
            // curious/raised
            <>
              <path
                d="M28 46 Q 35 41 42 46"
                fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round"
              />
              <path
                d="M58 46 Q 65 41 72 46"
                fill="none" stroke="#2a1505" strokeWidth="2.6" strokeLinecap="round"
              />
            </>
          ) : (
            // base — straight-ish thick boy brows
            <>
              <path
                d="M28 49 L 42 47"
                fill="none" stroke="#2a1505" strokeWidth="2.8" strokeLinecap="round"
              />
              <path
                d="M58 47 L 72 49"
                fill="none" stroke="#2a1505" strokeWidth="2.8" strokeLinecap="round"
              />
            </>
          )}

          {/* eyes */}
          {showLaugh ? (
            <>
              <path
                d="M28 56 Q 36 49 44 56" fill="none"
                stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round"
              />
              <path
                d="M56 56 Q 64 49 72 56" fill="none"
                stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round"
              />
            </>
          ) : blink ? (
            <>
              <line
                x1="32" y1="58" x2="40" y2="58"
                stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round"
              />
              <line
                x1="60" y1="58" x2="68" y2="58"
                stroke="#1a0a00" strokeWidth="2.8" strokeLinecap="round"
              />
            </>
          ) : showThinking ? (
            // Thinking eyes glance up — ignore cursor.
            <>
              <circle cx="36" cy="55" r="3.0" fill="#1a0a00" />
              <circle cx="64" cy="55" r="3.0" fill="#1a0a00" />
            </>
          ) : (
            // Trackable eyes — pupils + highlights offset by pupilOffset.
            // Smaller, rounder eye shape than the original anime-tall version,
            // for a more masculine read.
            <>
              {/* sclera (eye whites) */}
              <ellipse cx="36" cy="58" rx="4.6" ry="4.4" fill="#fff" />
              <ellipse cx="64" cy="58" rx="4.6" ry="4.4" fill="#fff" />

              <circle
                cx={36 + pupilOffset.x}
                cy={58 + pupilOffset.y}
                r="3.2"
                fill="#1a0a00"
              />
              <circle
                cx={37 + pupilOffset.x}
                cy={56.8 + pupilOffset.y}
                r="1.1"
                fill="#fff"
              />
              <circle
                cx={64 + pupilOffset.x}
                cy={58 + pupilOffset.y}
                r="3.2"
                fill="#1a0a00"
              />
              <circle
                cx={65 + pupilOffset.x}
                cy={56.8 + pupilOffset.y}
                r="1.1"
                fill="#fff"
              />
            </>
          )}

          {/* mouth */}
          {showLaugh ? (
            <path
              d="M38 71 Q 50 86 62 71 Q 60 74 50 78 Q 40 74 38 71 Z"
              fill="#7A2F1F"
            />
          ) : mood === "talking" ? (
            mouthOpen ? (
              <ellipse cx="50" cy="74" rx="6" ry="4.2" fill="#7A2F1F" />
            ) : (
              <path
                d="M43 73 Q 50 77 57 73" stroke="#7A2F1F"
                strokeWidth="2.6" fill="none" strokeLinecap="round"
              />
            )
          ) : showThinking ? (
            <line
              x1="46" y1="73" x2="55" y2="74"
              stroke="#7A2F1F" strokeWidth="2.6" strokeLinecap="round"
            />
          ) : mood === "smiling" ? (
            <path
              d="M40 71 Q 50 80 60 71" stroke="#7A2F1F"
              strokeWidth="2.8" fill="none" strokeLinecap="round"
            />
          ) : peekActive ? (
            // small "o" of curiosity while peeking
            <ellipse cx="50" cy="74" rx="2.2" ry="2.8" fill="#7A2F1F" />
          ) : (
            <path
              d="M43 71 Q 50 76 57 71" stroke="#7A2F1F"
              strokeWidth="2.5" fill="none" strokeLinecap="round"
            />
          )}

          {/* thinking dots */}
          {showThinking && (
            <g fill="#7A2F1F">
              <motion.circle
                cx="74" cy="22" r="1.8"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: 0 }}
              />
              <motion.circle
                cx="80" cy="18" r="2.2"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: 0.18 }}
              />
              <motion.circle
                cx="87" cy="14" r="2.6"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: 0.36 }}
              />
            </g>
          )}

          {/* laugh sparkles */}
          {showLaugh && (
            <g stroke="#B85A1E" strokeWidth="2" strokeLinecap="round" fill="none">
              <line x1="18" y1="40" x2="13" y2="36" />
              <line x1="82" y1="40" x2="87" y2="36" />
              <line x1="14" y1="44" x2="9" y2="44" />
              <line x1="86" y1="44" x2="91" y2="44" />
            </g>
          )}
        </svg>
      </motion.div>
    </motion.div>
  );
}

/** Cheap regex-based laugh detector. Used by the chat page to switch the
 *  avatar into a brief laughing state when Gappu cracks himself up. */
const LAUGH_RE = /\b(haha+|hehe+|lo+l|lmao+|lmfao|rofl|bhk)\b|😂|🤣|😆|😹|😅/i;
export function looksLikeLaughter(text: string): boolean {
  return LAUGH_RE.test(text);
}
