"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One candle in the shrine. The page owns all ignition / extinction state;
 * this component renders the SVG, the intention text, and a small inline
 * input when in `composing` mode.
 *
 * Performance:
 *   - Flame flicker is a CSS keyframe on a transform — no SVG filter, no JS.
 *   - Burn-down is computed from `burnedMs` on each render but the parent only
 *     re-renders at 1 Hz (driven by a single page-level interval).
 *   - Wax drip and pool growth are pure SVG-path numerics.
 */

export type CandlePhase = "unlit" | "composing" | "lit" | "extinguishing";

export interface CandleData {
  id: string;
  prompt: string;
  intention: string;
  phase: CandlePhase;
  litAt: number;       // performance.now() at most recent ignition; 0 if unlit
  burnedMsTotal: number; // accumulated across multiple lightings
}

interface Props {
  candle: CandleData;
  now: number;
  /** True when the user is dragging a spark out of *some* lit candle. */
  carryingSpark: boolean;
  /** True when this candle is the source of the spark currently being dragged. */
  isSparkSource: boolean;
  onTap: () => void;
  onSubmitIntention: (intention: string) => void;
  onCancelIntention: () => void;
  onSparkPickup: (e: React.PointerEvent) => void;
}

export function Candle({
  candle, now, carryingSpark, isSparkSource,
  onTap, onSubmitIntention, onCancelIntention, onSparkPickup,
}: Props) {
  const [draftIntention, setDraftIntention] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (candle.phase === "composing") {
      setDraftIntention("");
      // wait one tick so the input is mounted before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [candle.phase]);

  // ── derived burn metrics ──────────────────────────────────────────
  const liveBurnMs = candle.phase === "lit"
    ? Math.max(0, now - candle.litAt)
    : 0;
  const totalBurnSec = (candle.burnedMsTotal + liveBurnMs) / 1000;

  // candle shrinks ~1.2 viewBox-units per minute (very subtle)
  const shrink = Math.min(110, totalBurnSec * 0.02);
  // wax accumulates faster than the candle shrinks (it pools quickly)
  const waxPool = Math.min(36, totalBurnSec * 0.06);

  // drip lengths grow with active burn time, reset between lightings
  const liveBurnSec = liveBurnMs / 1000;
  const drip1 = Math.min(28, 6 + liveBurnSec * 0.4);
  const drip2 = Math.min(22, 3 + liveBurnSec * 0.3);
  const drip3 = Math.min(18, liveBurnSec * 0.22);

  const lit = candle.phase === "lit";
  const extinguishing = candle.phase === "extinguishing";
  const composing = candle.phase === "composing";

  // body geometry (200×500 viewBox)
  const bodyTop = 200 + shrink;
  const bodyHeight = Math.max(70, 240 - shrink);
  const wickTop = bodyTop;

  return (
    <div className="candle-cell">
      {/* prompt / intention text above */}
      <div className="candle-label">
        {composing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitIntention(draftIntention.trim());
            }}
            className="candle-form"
          >
            <input
              ref={inputRef}
              value={draftIntention}
              onChange={(e) => setDraftIntention(e.target.value)}
              placeholder={candle.prompt}
              maxLength={48}
              className="candle-input"
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelIntention();
              }}
            />
            <div className="candle-form-row">
              <button
                type="button"
                onClick={onCancelIntention}
                className="candle-link-btn muted"
              >
                cancel
              </button>
              <button type="submit" className="candle-link-btn">
                light →
              </button>
            </div>
          </form>
        ) : candle.intention && lit ? (
          <span className="candle-intention">{candle.intention}</span>
        ) : (
          <span className="candle-prompt">{candle.prompt}</span>
        )}
      </div>

      <button
        onClick={onTap}
        aria-label={
          lit ? "blow out this candle" :
          composing ? "type your intention" :
          "light this candle"
        }
        className={`candle-button${lit ? " is-lit" : ""}${isSparkSource ? " is-source" : ""}`}
        style={{ touchAction: "manipulation" }}
      >
        <svg width="100%" viewBox="0 0 200 500" preserveAspectRatio="xMidYMax meet">
          {/* gradients are inlined per-candle so each one paints independently;
              shared <defs> outside SVG would require an extra hidden SVG and
              add no measurable benefit at this scale. */}
          <defs>
            <linearGradient id={`wax-${candle.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FBE5C6" />
              <stop offset="50%" stopColor="#FFF6E2" />
              <stop offset="100%" stopColor="#E8C9A0" />
            </linearGradient>
            <radialGradient id={`flame-grad-${candle.id}`} cx="50%" cy="65%" r="65%">
              <stop offset="0%" stopColor="#FFE9A8" stopOpacity="1" />
              <stop offset="40%" stopColor="#F4C9B5" stopOpacity="0.95" />
              <stop offset="80%" stopColor="#E08754" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#C24A2A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`halo-${candle.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F4C9B5" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#F4C9B5" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#F4C9B5" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* halo (only when lit) */}
          {lit && (
            <circle
              cx="100" cy={wickTop - 80}
              r={120}
              fill={`url(#halo-${candle.id})`}
              className="candle-halo"
            />
          )}

          {/* dish */}
          <ellipse cx="100" cy="465" rx="70" ry="8" fill="rgba(11,26,51,0.18)" />
          <path
            d="M 40 465 Q 100 478 160 465 L 152 458 Q 100 466 48 458 Z"
            fill="#1F2B47"
          />

          {/* wax pool at base — grows over time */}
          {waxPool > 0 && (
            <g>
              <ellipse cx="100" cy="455" rx={28 + waxPool} ry={4 + waxPool * 0.18} fill={`url(#wax-${candle.id})`} opacity="0.95" />
              <ellipse cx={92 - waxPool * 0.4} cy="453" rx={5 + waxPool * 0.15} ry={2.5 + waxPool * 0.08} fill="#FFF6E2" opacity="0.85" />
              <ellipse cx={108 + waxPool * 0.3} cy="455" rx={4 + waxPool * 0.1} ry={2 + waxPool * 0.06} fill="#FFF6E2" opacity="0.85" />
            </g>
          )}

          {/* candle body */}
          <rect
            x="80"
            y={bodyTop}
            width="40"
            height={bodyHeight}
            fill={`url(#wax-${candle.id})`}
            stroke="rgba(11,26,51,0.18)"
            strokeWidth="0.8"
          />
          <ellipse cx="100" cy={bodyTop} rx="20" ry="3.5" fill="#E8C9A0" />
          <ellipse cx="100" cy={bodyTop} rx="11" ry="1.6" fill="#C9A57A" />

          {/* drips on the body — grow during the current lighting */}
          <path
            d={`M 80 ${bodyTop + 18} Q 76 ${bodyTop + 18 + drip1} 80 ${bodyTop + 22 + drip1} Q 84 ${bodyTop + 18 + drip1 - 3} 84 ${bodyTop + 18} Z`}
            fill={`url(#wax-${candle.id})`}
            opacity="0.92"
          />
          <path
            d={`M 120 ${bodyTop + 30} Q 124 ${bodyTop + 30 + drip2} 120 ${bodyTop + 34 + drip2} Q 116 ${bodyTop + 30 + drip2 - 2} 116 ${bodyTop + 30} Z`}
            fill={`url(#wax-${candle.id})`}
            opacity="0.92"
          />
          <path
            d={`M 100 ${bodyTop + 12} Q 103 ${bodyTop + 12 + drip3} 100 ${bodyTop + 15 + drip3} Q 97 ${bodyTop + 12 + drip3 - 1.5} 97 ${bodyTop + 12} Z`}
            fill={`url(#wax-${candle.id})`}
            opacity="0.88"
          />

          {/* wick */}
          <line
            x1="100"
            y1={wickTop}
            x2="100"
            y2={wickTop - (lit ? 24 : 16)}
            stroke="#1F2B47"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* flame */}
          {lit && (
            <g
              className="candle-flame"
              style={{ transformOrigin: `100px ${wickTop - 24}px` }}
            >
              <path
                d={`M 100 ${wickTop - 110} C 84 ${wickTop - 70} 80 ${wickTop - 40} 92 ${wickTop - 22} C 96 ${wickTop - 16} 104 ${wickTop - 16} 108 ${wickTop - 22} C 120 ${wickTop - 40} 116 ${wickTop - 70} 100 ${wickTop - 110} Z`}
                fill={`url(#flame-grad-${candle.id})`}
              />
              <path
                d={`M 100 ${wickTop - 76} C 93 ${wickTop - 58} 93 ${wickTop - 38} 98 ${wickTop - 26} C 100 ${wickTop - 22} 100 ${wickTop - 22} 102 ${wickTop - 26} C 107 ${wickTop - 38} 107 ${wickTop - 58} 100 ${wickTop - 76} Z`}
                fill="rgba(255,246,220,0.9)"
              />
            </g>
          )}

          {/* smoke when extinguishing */}
          {extinguishing && (
            <g>
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  cx="100"
                  cy={wickTop - 24}
                  r={5 + i * 1.6}
                  fill="rgba(31,43,71,0.25)"
                  className="candle-smoke"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </g>
          )}
        </svg>

        {/* spark drag handle on lit candles — small invisible area near the flame */}
        {lit && !carryingSpark && (
          <span
            className="candle-spark-handle"
            onPointerDown={(e) => { e.stopPropagation(); onSparkPickup(e); }}
            aria-label="carry the flame to another candle"
          />
        )}
      </button>

      {/* burn meter line */}
      <div className="candle-meter">
        {lit ? <em>burning {formatBurn(liveBurnSec)}</em> : <em>&nbsp;</em>}
      </div>
    </div>
  );
}

function formatBurn(sec: number): string {
  const min = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (min > 0) return `${min}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
