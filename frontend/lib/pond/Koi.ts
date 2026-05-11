import { TAU, noise2, wrapAngle } from "./utils";
import type { Ripple } from "./Ripple";
import type { Food } from "./Food";
import {
  EAT_RADIUS_SQ, FOOD_INTEREST_RADIUS, FOOD_INTEREST_RADIUS_SQ,
} from "./Food";

export type KoiState = "idle" | "curious" | "pausing" | "fleeing" | "eating" | "feeding";
export type KoiHue =
  | "peach" | "blush" | "navy"
  | "kohaku" | "gold" | "charcoal" | "ghost";
export type KoiPattern = "dual" | "stripe" | "speck" | "split" | "clean";

export interface Koi {
  active: boolean;
  x: number;
  y: number;
  heading: number;
  speed: number;
  baseSpeed: number;
  bodyLen: number;
  bodyWidth: number;
  hue: KoiHue;
  pattern: KoiPattern;
  accentSeed: number;   // 0..1, drives per-koi accent placement jitter
  phase: number;
  noiseSeed: number;
  state: KoiState;
  stateUntil: number;
  curiosityX: number;
  curiosityY: number;
  curiosityWeight: number; // 0..1, decays

  /** Decaying flee impulse from the last scare. While > 0, the fish steers
   *  away from (fleeX, fleeY) with a speed boost. Overrides curiosity. */
  fleeX: number;
  fleeY: number;
  fleeWeight: number;

  /** Timestamp (ms) until which the koi is in the `eating` state. While
   *  eating, the fish brakes and the head/tail wag amplifies briefly — read
   *  visually as a "munch". */
  eatUntil: number;

  /** Body-bend amplifier; rises when the fish is in a ripple's wake. Reads
   *  visually as the koi being "rippled" without any pixel post-processing. */
  wobble: number;
}

const ALL_HUES: KoiHue[] = ["peach", "blush", "navy", "kohaku", "gold", "charcoal", "ghost"];
const ALL_PATTERNS: KoiPattern[] = ["dual", "stripe", "speck", "split", "clean"];

/** Fisher–Yates in place. Used at populate time so each koi pulls a unique
 *  hue/pattern slot until the catalog is exhausted, then we cycle. */
function shuffled<T>(src: readonly T[]): T[] {
  const a = src.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/**
 * Build a unique-look catalog for `count` koi. Hues and patterns are each
 * shuffled, so the first 7 fish all get distinct hues and the first 5 all get
 * distinct patterns — past that we wrap, but the random accent/size/speed
 * jitter inside createKoi keeps even same-(hue,pattern) fish visually distinct.
 */
export function buildKoiCatalog(count: number): { hue: KoiHue; pattern: KoiPattern }[] {
  const hues = shuffled(ALL_HUES);
  const patterns = shuffled(ALL_PATTERNS);
  const out: { hue: KoiHue; pattern: KoiPattern }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      hue: hues[i % hues.length],
      // offset pattern index by a wrap of the hue so same-hue siblings tend
      // to have different patterns
      pattern: patterns[(i + Math.floor(i / hues.length)) % patterns.length],
    });
  }
  return out;
}

export function createKoi(
  i: number, w: number, h: number,
  hue: KoiHue, pattern: KoiPattern,
): Koi {
  // Three size classes give a clear silhouette mix in the pond — a couple of
  // juveniles, a couple of mid, an occasional matriarch.
  const sizeClass = Math.random();
  let bodyLen: number, bodyWidth: number, baseSpeed: number;
  if (sizeClass < 0.3) {
    // small / fast
    bodyLen  = 56 + Math.random() * 14;
    bodyWidth = 12 + Math.random() * 3;
    baseSpeed = 26 + Math.random() * 14;
  } else if (sizeClass < 0.85) {
    // mid
    bodyLen  = 72 + Math.random() * 18;
    bodyWidth = 16 + Math.random() * 4;
    baseSpeed = 18 + Math.random() * 12;
  } else {
    // large / slow
    bodyLen  = 96 + Math.random() * 22;
    bodyWidth = 20 + Math.random() * 5;
    baseSpeed = 12 + Math.random() * 8;
  }

  return {
    active: true,
    x: Math.random() * w,
    y: Math.random() * h,
    heading: Math.random() * TAU,
    speed: 0,
    baseSpeed,
    bodyLen,
    bodyWidth,
    hue,
    pattern,
    accentSeed: Math.random(),
    phase: Math.random() * TAU,
    noiseSeed: Math.random() * 1000,
    state: "idle",
    stateUntil: 0,
    curiosityX: 0,
    curiosityY: 0,
    curiosityWeight: 0,
    fleeX: 0,
    fleeY: 0,
    fleeWeight: 0,
    eatUntil: 0,
    wobble: 0,
  };
}

const PERSONAL_SPACE = 60;
const PERSONAL_SPACE_SQ = PERSONAL_SPACE * PERSONAL_SPACE;
const RIPPLE_FRESH_WINDOW = 1500; // ms — how long a ripple keeps attracting
const FLEE_DECAY_PER_SEC = 0.7;   // flee impulse halves in ~1s
const ARRIVE_RADIUS = 55;         // within this, the fish has "arrived" — slow + bleed interest
const ARRIVE_RADIUS_SQ = ARRIVE_RADIUS * ARRIVE_RADIUS;
const WALL_MARGIN = 70;           // soft band near each edge where koi steer inward
const WALL_PAD = 14;              // hard clamp keeps this many px of breathing room from the edge

/** Cheap circular hit-test. The koi body is an elongated ellipse, but for
 *  click forgiveness we treat it as a circle of radius (bodyLen/2 + pad) so
 *  taps on the head or tail still count. Squared compare — no sqrt. */
export function koiContainsPoint(k: Koi, x: number, y: number, pad = 14): boolean {
  const dx = x - k.x;
  const dy = y - k.y;
  const r = k.bodyLen * 0.5 + pad;
  return dx * dx + dy * dy < r * r;
}

/** Scares the koi away from a point. Caller passes an intensity in 0..1 based
 *  on proximity (closer = stronger). Decays automatically in updateKoi. */
export function scareKoi(k: Koi, fromX: number, fromY: number, intensity: number): void {
  k.fleeX = fromX;
  k.fleeY = fromY;
  if (intensity > k.fleeWeight) k.fleeWeight = intensity;
  // Cancel any curiosity that was pulling them back to the scare point.
  k.curiosityWeight = 0;
  k.state = "fleeing";
  // A scared fish doesn't pause mid-dart.
  if (k.stateUntil < 0) k.stateUntil = 0;
}

/** Result of a per-frame update. Pond.ts uses these to spawn micro-events
 *  (a small ripple on splash, a tiny ripple + audio cue on a successful bite). */
export interface KoiTick {
  splash: boolean;
  ate: boolean;
}

/**
 * One koi's per-frame update. Priority of behaviors, highest first:
 *
 *   1. eating       — frozen in place for ~0.6s with an amplified wag
 *   2. fleeing      — dart away from the scare point at boosted speed
 *   3. feeding      — steer toward the nearest food pellet in range
 *   4. curious      — investigate the freshest, closest ripple
 *   5. drift / pause — pseudo-noise wander
 *
 * Separation against neighbors is always applied, regardless of state.
 */
export function updateKoi(
  k: Koi,
  others: Koi[],
  ripples: Ripple[],
  foods: Food[],
  dt: number,
  now: number,
  w: number, h: number,
): KoiTick {
  // ── 0) EATING: brake hard, animate mouth/tail, skip steering this frame
  if (now < k.eatUntil) {
    k.state = "eating";
    k.speed *= Math.exp(-dt * 6);
    // mouth flutter: phase advances faster than normal during the eat window
    k.phase += dt * (4 + 6 * Math.sin((k.eatUntil - now) * 0.02));
    k.x += Math.cos(k.heading) * k.speed * dt;
    k.y += Math.sin(k.heading) * k.speed * dt;
    // visible "munch" bob
    k.wobble = Math.min(1, k.wobble + dt * 2.5);
    return { splash: false, ate: false };
  }
  // decay wobble when not eating
  if (k.state === "eating") k.state = "idle";

  // 1) base drift
  const drift = noise2(now * 0.001, k.noiseSeed) * 0.6;
  let desired = k.heading + drift * dt;

  // ── FLEE has priority over food/curiosity
  let fleeing = false;
  if (k.fleeWeight > 0.02) {
    const dx = k.x - k.fleeX;
    const dy = k.y - k.fleeY;
    // away from the scare point; if exactly on it, fall back to current heading
    const dSq = dx * dx + dy * dy;
    const away = dSq > 0.001 ? Math.atan2(dy, dx) : k.heading;
    desired = k.heading + wrapAngle(away - k.heading) * Math.min(1, k.fleeWeight * 1.2);
    k.state = "fleeing";
    fleeing = true;
    k.fleeWeight = Math.max(0, k.fleeWeight - dt * FLEE_DECAY_PER_SEC);
  }

  // ── FOOD targeting (only when not fleeing). Squared compare; one sqrt at the end.
  let foodIdx = -1;
  let foodBestSq = FOOD_INTEREST_RADIUS_SQ;
  if (!fleeing) {
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      if (!f.active) continue;
      const dx = f.x - k.x;
      const dy = f.y - k.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < foodBestSq) { foodBestSq = dSq; foodIdx = i; }
    }
  }

  let ate = false;
  if (foodIdx >= 0) {
    const f = foods[foodIdx];
    // eat check first — if already in range, consume and enter eating state
    if (foodBestSq < EAT_RADIUS_SQ) {
      f.active = false;
      k.eatUntil = now + 600 + Math.random() * 300;
      k.state = "eating";
      k.wobble = 1;
      ate = true;
    } else {
      const target = Math.atan2(f.y - k.y, f.x - k.x);
      const closeness = 1 - Math.sqrt(foodBestSq) / FOOD_INTEREST_RADIUS;
      desired += wrapAngle(target - desired) * (0.55 + 0.3 * closeness);
      k.state = "feeding";
    }
  } else if (!fleeing) {
    // ── RIPPLE curiosity — no distance gate. Any fresh ripple attracts the
    // koi regardless of where on the pond it landed. We pick the freshest
    // active ripple; with ties (rare), the one we encounter last wins, which
    // is fine — koi shouldn't tie-break with sub-frame precision anyway.
    let bestFresh = 0;
    let bestX = 0, bestY = 0;
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      if (!r.active) continue;
      const age = now - r.bornAt;
      if (age > RIPPLE_FRESH_WINDOW) continue;
      const fresh = 1 - age / RIPPLE_FRESH_WINDOW;
      if (fresh > bestFresh) { bestFresh = fresh; bestX = r.x; bestY = r.y; }
    }
    if (bestFresh > 0) {
      k.curiosityX = bestX;
      k.curiosityY = bestY;
      if (bestFresh > k.curiosityWeight) k.curiosityWeight = bestFresh;
      k.state = "curious";
    } else {
      k.curiosityWeight = Math.max(0, k.curiosityWeight - dt * 0.4);
      if (k.curiosityWeight < 0.02 && k.state === "curious") k.state = "idle";
    }
    if (k.curiosityWeight > 0.02) {
      const tdx = k.curiosityX - k.x;
      const tdy = k.curiosityY - k.y;
      const tdSq = tdx * tdx + tdy * tdy;
      if (tdSq > ARRIVE_RADIUS_SQ) {
        // still approaching — steer toward the click
        const target = Math.atan2(tdy, tdx);
        desired += wrapAngle(target - desired) * 0.55 * k.curiosityWeight;
      } else {
        // arrived — drop interest quickly so the fish glides through and out
        // instead of oscillating around the exact point. No hard turn here:
        // we let the existing heading carry them past, and curiosity bleeds
        // back to idle in a fraction of a second.
        k.curiosityWeight = Math.max(0, k.curiosityWeight - dt * 3.0);
      }
    }
  }

  // ── Separation — always applied
  let avoidX = 0, avoidY = 0, avoidAmt = 0;
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (o === k) continue;
    const dx = k.x - o.x;
    const dy = k.y - o.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < PERSONAL_SPACE_SQ && dSq > 0.001) {
      const d = Math.sqrt(dSq);
      const f = 1 - d / PERSONAL_SPACE;
      avoidX += (dx / d) * f;
      avoidY += (dy / d) * f;
      avoidAmt += f;
    }
  }
  if (avoidAmt > 0) {
    const target = Math.atan2(avoidY, avoidX);
    desired += wrapAngle(target - desired) * Math.min(0.4, avoidAmt);
  }

  // ── Wall avoidance — soft inward steering when within WALL_MARGIN of any
  // edge. Strength scales with how deep the koi is into the margin band, so
  // they curve away gradually instead of bouncing like a billiard ball. The
  // hard clamp below this is just a safety net — it should rarely engage when
  // this term is doing its job.
  {
    let wallX = 0, wallY = 0, wallAmt = 0;
    if (k.x < WALL_MARGIN) {
      const f = 1 - k.x / WALL_MARGIN;
      wallX += f; wallAmt += f;
    } else if (k.x > w - WALL_MARGIN) {
      const f = 1 - (w - k.x) / WALL_MARGIN;
      wallX -= f; wallAmt += f;
    }
    if (k.y < WALL_MARGIN) {
      const f = 1 - k.y / WALL_MARGIN;
      wallY += f; wallAmt += f;
    } else if (k.y > h - WALL_MARGIN) {
      const f = 1 - (h - k.y) / WALL_MARGIN;
      wallY -= f; wallAmt += f;
    }
    if (wallAmt > 0) {
      const target = Math.atan2(wallY, wallX);
      desired += wrapAngle(target - desired) * Math.min(0.9, wallAmt * 1.2);
    }
  }

  // ── Idle pause (only when truly idle — never while fleeing or feeding)
  if (k.state === "idle" && Math.random() < dt * 0.012) {
    k.state = "pausing";
    k.stateUntil = now + 700 + Math.random() * 1500;
  }
  if (k.state === "pausing" && now > k.stateUntil) k.state = "idle";

  // ── Speed targeting. While curious, slow down when within arrival range so
  // the fish doesn't blow past the click and have to spin back to it.
  let targetSpeed: number;
  if (k.state === "fleeing") {
    targetSpeed = k.baseSpeed * (1.6 + 1.4 * k.fleeWeight);
  } else if (k.state === "feeding") {
    targetSpeed = k.baseSpeed * 1.4;
  } else if (k.state === "pausing") {
    targetSpeed = 0;
  } else if (k.state === "curious") {
    const tdx = k.curiosityX - k.x;
    const tdy = k.curiosityY - k.y;
    const arrived = tdx * tdx + tdy * tdy < ARRIVE_RADIUS_SQ;
    targetSpeed = arrived
      ? k.baseSpeed * 0.35
      : k.baseSpeed * (1 + 0.6 * k.curiosityWeight);
  } else {
    targetSpeed = k.baseSpeed;
  }
  k.speed += (targetSpeed - k.speed) * Math.min(1, dt * 1.8);

  // ── Heading smoothing — fleeing turns sharper than idle
  const turnRate = fleeing ? 2.6 : 1.6;
  const headingDiff = wrapAngle(desired - k.heading);
  k.heading += headingDiff * Math.min(1, dt * turnRate);

  // splash detection — a visible flick from an idle koi changing direction.
  // Suppressed when fleeing (escaping, not flicking) and when curious (the
  // overshoot turn around a click would otherwise spawn ripples that
  // re-attract the same fish — looks like vibration).
  const splash =
    !fleeing &&
    k.state !== "curious" &&
    Math.abs(headingDiff) > 0.6 &&
    k.speed > k.baseSpeed * 0.8 &&
    Math.random() < 0.3;

  // integrate position
  k.x += Math.cos(k.heading) * k.speed * dt;
  k.y += Math.sin(k.heading) * k.speed * dt;
  k.phase += dt * (3.5 + k.speed * 0.05);

  // Hard border — the visible canvas IS the pond. If the soft wall steering
  // above didn't keep the fish in (e.g. mid-flee toward a corner), clamp the
  // position and reflect heading on whichever axis was crossed. This guarantees
  // no koi ever leaves the screen.
  if (k.x < WALL_PAD) {
    k.x = WALL_PAD;
    k.heading = Math.PI - k.heading;
  } else if (k.x > w - WALL_PAD) {
    k.x = w - WALL_PAD;
    k.heading = Math.PI - k.heading;
  }
  if (k.y < WALL_PAD) {
    k.y = WALL_PAD;
    k.heading = -k.heading;
  } else if (k.y > h - WALL_PAD) {
    k.y = h - WALL_PAD;
    k.heading = -k.heading;
  }

  // wobble decays toward zero. The eating branch above is the only thing that
  // ever pushes it up — curiosity used to amplify it, but that read as the
  // body "vibrating" on top of the click ripple.
  k.wobble *= Math.exp(-dt * 1.5);

  return { splash, ate };
}

const PALETTE: Record<KoiHue, [string, string]> = {
  peach:    ["#F4C9B5", "#E8A487"],  // warm pinkish, soft coral accent
  blush:    ["#F8DACE", "#D88E73"],  // pale rose, terracotta accent
  navy:     ["#3A4F77", "#1F2B47"],  // deep blue, near-black accent
  kohaku:   ["#F6E8DC", "#C95548"],  // classic cream + red-orange
  gold:     ["#E8C36D", "#A87632"],  // golden body, deep amber accent
  charcoal: ["#3A3A40", "#161618"],  // dark grey, near-black
  ghost:    ["#EFE6DA", "#C4B5A0"],  // pale ivory, dusty taupe
};

export function drawKoi(ctx: CanvasRenderingContext2D, k: Koi): void {
  const [body, accent] = PALETTE[k.hue];
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.heading);

  const wag = Math.sin(k.phase) * (0.4 + k.wobble * 0.4);
  const eating = k.state === "eating";

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 4, k.bodyLen * 0.5, k.bodyWidth * 0.7, 0, 0, TAU);
  ctx.fill();

  // tail
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-k.bodyLen * 0.4, 0);
  ctx.quadraticCurveTo(
    -k.bodyLen * 0.7, -k.bodyWidth * 0.9 + wag * 8,
    -k.bodyLen * 0.85, wag * 14,
  );
  ctx.quadraticCurveTo(
    -k.bodyLen * 0.7, k.bodyWidth * 0.9 + wag * 8,
    -k.bodyLen * 0.4, 0,
  );
  ctx.fill();

  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, k.bodyLen * 0.5, k.bodyWidth, 0, 0, TAU);
  ctx.fill();

  // accent — pattern variant. accentSeed jitters placement so even two koi
  // with the same hue+pattern read as distinct individuals.
  ctx.fillStyle = accent;
  drawPattern(ctx, k);

  // mouth — open briefly while eating, otherwise just a faint dot
  if (eating) {
    const munch = 0.5 + 0.5 * Math.sin(k.phase * 2);
    ctx.fillStyle = "rgba(20,10,20,0.6)";
    ctx.beginPath();
    ctx.arc(k.bodyLen * 0.45, 0, 1.6 + munch * 1.6, 0, TAU);
    ctx.fill();
  }

  // eye
  ctx.fillStyle = "rgba(11,26,51,0.9)";
  ctx.beginPath();
  ctx.arc(k.bodyLen * 0.32, -k.bodyWidth * 0.25, 1.6, 0, TAU);
  ctx.fill();

  ctx.restore();
}

/**
 * Pattern dispatch. ctx is already translated/rotated into koi-local space.
 * Each branch is just a couple of ellipses or arcs — same draw budget as the
 * old fixed two-spot accent, so adding variety costs nothing extra at runtime.
 */
function drawPattern(ctx: CanvasRenderingContext2D, k: Koi): void {
  const L = k.bodyLen;
  const W = k.bodyWidth;
  // accentSeed-driven offsets in [-0.5, 0.5] keep variants per-fish unique
  const sx = (k.accentSeed - 0.5) * 0.18;
  const sy = (k.accentSeed - 0.5) * 0.25;

  switch (k.pattern) {
    case "clean":
      // intentionally no accent — solid body fish
      return;

    case "stripe": {
      // one elongated stripe along the back
      ctx.beginPath();
      ctx.ellipse(sx * L, -W * 0.35, L * 0.32, W * 0.32, 0, 0, TAU);
      ctx.fill();
      return;
    }

    case "split": {
      // one large accent covering most of the front or rear half
      const front = k.accentSeed > 0.5;
      ctx.beginPath();
      ctx.ellipse(front ? L * 0.18 : -L * 0.18, sy * W, L * 0.26, W * 0.85, 0, 0, TAU);
      ctx.fill();
      return;
    }

    case "speck": {
      // three small dots distributed along the body
      const offsets: [number, number, number][] = [
        [0.22 + sx, -0.3 + sy, 0.06],
        [-0.02 + sx, 0.2 - sy, 0.05],
        [-0.22 - sx, -0.18 + sy, 0.05],
      ];
      for (const [ox, oy, r] of offsets) {
        ctx.beginPath();
        ctx.ellipse(ox * L, oy * W * 2, r * L, r * L * 0.55, 0, 0, TAU);
        ctx.fill();
      }
      return;
    }

    case "dual":
    default: {
      // the original twin-spot — slightly jittered per fish
      ctx.beginPath();
      ctx.ellipse(L * (0.05 + sx), -W * (0.25 + sy), L * 0.18, W * 0.5, 0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-L * (0.12 - sx), W * (0.35 - sy), L * 0.1, W * 0.25, -0.2, 0, TAU);
      ctx.fill();
      return;
    }
  }
}
