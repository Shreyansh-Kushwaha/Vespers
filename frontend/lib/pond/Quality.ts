/**
 * Adaptive quality tier system.
 *
 * Two-stage approach:
 *   1. `detectInitialTier()` makes a one-shot guess from device hints (memory,
 *      cores, save-data, prefers-reduced-motion).
 *   2. `QualityMonitor.observe()` watches frame deltas at runtime; if the
 *      rolling 60-frame average exceeds 40 ms, it steps the tier down.
 *      It never steps back up — that prevents oscillation when the GPU is
 *      hovering on a threshold.
 */

export type QualityTier = "high" | "medium" | "low";

export interface QualityCaps {
  tier: QualityTier;
  dpr: number;
  maxKoi: number;
  maxRipples: number;
  maxParticles: number;
  maxLilies: number;
  maxStones: number;
  maxFood: number;
  bgRepaintMs: number;
  enableFireflies: boolean;
  enableAudio: boolean;
  idleFps: number;
  activeFps: number;
}

// Conservative caps. The original simple koi pond ran smoothly with 4 koi and
// no particles; we treat that as the baseline and only spend budget where the
// visual return is clear.
const HIGH: QualityCaps = {
  tier: "high",
  dpr: 1.5,
  maxKoi: 9,
  maxRipples: 8,
  maxParticles: 6,
  maxLilies: 3,
  maxStones: 5,
  maxFood: 6,
  bgRepaintMs: 0,
  enableFireflies: true,
  enableAudio: true,
  idleFps: 30,
  activeFps: 60,
};

const MEDIUM: QualityCaps = {
  tier: "medium",
  dpr: 1.25,
  maxKoi: 7,
  maxRipples: 6,
  maxParticles: 4,
  maxLilies: 2,
  maxStones: 4,
  maxFood: 5,
  bgRepaintMs: 0,
  enableFireflies: true,
  enableAudio: true,
  idleFps: 30,
  activeFps: 60,
};

const LOW: QualityCaps = {
  tier: "low",
  dpr: 1,
  maxKoi: 5,
  maxRipples: 4,
  maxParticles: 3,
  maxLilies: 1,
  maxStones: 3,
  maxFood: 3,
  bgRepaintMs: 0,
  enableFireflies: false,
  enableAudio: true,
  idleFps: 24,
  activeFps: 30,
};

export function detectInitialTier(): QualityCaps {
  if (typeof navigator === "undefined") return MEDIUM;
  type NavWithHints = Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const n = navigator as NavWithHints;

  // Honor the OS-level reduce-motion preference outright. People who set this
  // do not want full-fidelity ambient particles regardless of their hardware.
  if (typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return LOW;
  }

  const lowMem = (n.deviceMemory ?? 4) <= 2;
  const lowCores = (n.hardwareConcurrency ?? 4) <= 2;
  const saveData = n.connection?.saveData === true;
  const slowNet = /2g|slow-2g/.test(n.connection?.effectiveType ?? "");
  if (lowMem || lowCores || saveData || slowNet) return LOW;

  const ua = n.userAgent || "";
  const isMobile = /iPhone|iPad|Android/i.test(ua);
  if (isMobile && (n.deviceMemory ?? 4) <= 4) return MEDIUM;

  return HIGH;
}

export class QualityMonitor {
  private samples: number[] = [];
  private lastDowngradeAt = 0;
  private current: QualityCaps;

  constructor(initial: QualityCaps) {
    this.current = initial;
  }

  caps(): QualityCaps { return this.current; }

  /** Returns true the moment a downgrade fires, so callers can re-fit. */
  observe(dtMs: number, now: number): boolean {
    this.samples.push(dtMs);
    if (this.samples.length > 60) this.samples.shift();
    if (this.samples.length < 60) return false;
    if (now - this.lastDowngradeAt < 5000) return false;

    let sum = 0;
    for (const s of this.samples) sum += s;
    const avg = sum / this.samples.length;
    if (avg > 40 && this.current.tier !== "low") {
      this.current = this.current.tier === "high" ? MEDIUM : LOW;
      this.lastDowngradeAt = now;
      this.samples.length = 0;
      return true;
    }
    return false;
  }
}
