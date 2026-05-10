import { TAU, noise2, wrapAngle } from "./utils";
import type { Ripple } from "./Ripple";

export type KoiState = "idle" | "curious" | "pausing";
export type KoiHue = "peach" | "blush" | "navy";

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
  phase: number;
  noiseSeed: number;
  state: KoiState;
  stateUntil: number;
  curiosityX: number;
  curiosityY: number;
  curiosityWeight: number; // 0..1, decays
  /** Body-bend amplifier; rises when the fish is in a ripple's wake. Reads
   *  visually as the koi being "rippled" without any pixel post-processing. */
  wobble: number;
}

const HUES: KoiHue[] = ["peach", "blush", "navy", "peach", "blush"];

export function createKoi(i: number, w: number, h: number): Koi {
  return {
    active: true,
    x: Math.random() * w,
    y: Math.random() * h,
    heading: Math.random() * TAU,
    speed: 0,
    baseSpeed: 18 + Math.random() * 14,
    bodyLen: 70 + Math.random() * 24,
    bodyWidth: 16 + Math.random() * 4,
    hue: HUES[i % HUES.length],
    phase: Math.random() * TAU,
    noiseSeed: Math.random() * 1000,
    state: "idle",
    stateUntil: 0,
    curiosityX: 0,
    curiosityY: 0,
    curiosityWeight: 0,
    wobble: 0,
  };
}

const PERSONAL_SPACE = 60;
const PERSONAL_SPACE_SQ = PERSONAL_SPACE * PERSONAL_SPACE;
const RIPPLE_RADIUS = 280;
const RIPPLE_RADIUS_SQ = RIPPLE_RADIUS * RIPPLE_RADIUS;
const RIPPLE_FRESH_WINDOW = 1500; // ms

/**
 * One koi's per-frame update. Three steering forces are summed:
 *
 *   - drift  (idle)      — pseudo-noise on heading
 *   - curiosity          — pull toward the freshest, closest ripple
 *   - separation         — push away from any neighbor inside personal space
 *
 * Plus a low-probability `pausing` state (1 % chance/s) so the fish don't
 * look like a synced ballet. Returns `true` when this update produced a
 * "splash" microevent — used to spawn a small ripple + sfx.
 */
export function updateKoi(
  k: Koi,
  others: Koi[],
  ripples: Ripple[],
  dt: number,
  now: number,
  w: number, h: number,
): boolean {
  // 1) base heading drift
  const drift = noise2(now * 0.001, k.noiseSeed) * 0.6;
  let desired = k.heading + drift * dt;

  // 2) curiosity: investigate the freshest, closest active ripple. We
  // compare squared distances to avoid a sqrt per ripple per koi per frame.
  let bestScore = 0;
  let bestX = 0, bestY = 0;
  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    if (!r.active) continue;
    const age = now - r.bornAt;
    if (age > RIPPLE_FRESH_WINDOW) continue;
    const dx = r.x - k.x;
    const dy = r.y - k.y;
    const dSq = dx * dx + dy * dy;
    if (dSq > RIPPLE_RADIUS_SQ) continue;
    const fresh = 1 - age / RIPPLE_FRESH_WINDOW;
    // approx 1 - d/R using one sqrt only inside the qualifying band
    const close = 1 - Math.sqrt(dSq) / RIPPLE_RADIUS;
    const score = fresh * close;
    if (score > bestScore) { bestScore = score; bestX = r.x; bestY = r.y; }
  }
  if (bestScore > 0) {
    k.curiosityX = bestX;
    k.curiosityY = bestY;
    if (bestScore > k.curiosityWeight) k.curiosityWeight = bestScore;
    k.state = "curious";
  } else {
    k.curiosityWeight = Math.max(0, k.curiosityWeight - dt * 0.4);
    if (k.curiosityWeight < 0.02 && k.state === "curious") k.state = "idle";
  }
  if (k.curiosityWeight > 0.02) {
    const target = Math.atan2(k.curiosityY - k.y, k.curiosityX - k.x);
    desired += wrapAngle(target - desired) * 0.5 * k.curiosityWeight;
  }

  // 3) separation — same squared-distance trick
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

  // 4) idle pause behavior
  if (k.state === "idle" && Math.random() < dt * 0.012) {
    k.state = "pausing";
    k.stateUntil = now + 700 + Math.random() * 1500;
  }
  if (k.state === "pausing" && now > k.stateUntil) k.state = "idle";

  // 5) speed targeting
  const targetSpeed =
    k.state === "pausing" ? 0 :
    k.state === "curious" ? k.baseSpeed * (1 + 0.6 * k.curiosityWeight) :
    k.baseSpeed;
  k.speed += (targetSpeed - k.speed) * Math.min(1, dt * 1.2);

  // 6) heading smoothing
  const headingDiff = wrapAngle(desired - k.heading);
  k.heading += headingDiff * Math.min(1, dt * 1.6);

  // 7) splash detection: sharp turn while moving = visible flick
  const splash =
    Math.abs(headingDiff) > 0.6 &&
    k.speed > k.baseSpeed * 0.8 &&
    Math.random() < 0.3;

  // 8) integrate position
  k.x += Math.cos(k.heading) * k.speed * dt;
  k.y += Math.sin(k.heading) * k.speed * dt;
  k.phase += dt * (3.5 + k.speed * 0.05);

  // 9) soft wrap with margin
  const m = 80;
  if (k.x < -m) k.x = w + m;
  if (k.x > w + m) k.x = -m;
  if (k.y < -m) k.y = h + m;
  if (k.y > h + m) k.y = -m;

  // 10) wobble follows curiosity intensity
  if (k.curiosityWeight > 0.5) k.wobble = Math.min(1, k.wobble + dt * 1.5);
  else k.wobble *= Math.exp(-dt * 1.5);

  return splash;
}

const PALETTE: Record<KoiHue, [string, string]> = {
  peach: ["#F4C9B5", "#E8A487"],
  blush: ["#F8DACE", "#D88E73"],
  navy: ["#3A4F77", "#1F2B47"],
};

export function drawKoi(ctx: CanvasRenderingContext2D, k: Koi): void {
  const [body, accent] = PALETTE[k.hue];
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.heading);

  const wag = Math.sin(k.phase) * (0.4 + k.wobble * 0.4);

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

  // accents
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(k.bodyLen * 0.05, -k.bodyWidth * 0.25, k.bodyLen * 0.18, k.bodyWidth * 0.5, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-k.bodyLen * 0.12, k.bodyWidth * 0.35, k.bodyLen * 0.1, k.bodyWidth * 0.25, -0.2, 0, TAU);
  ctx.fill();

  // eye
  ctx.fillStyle = "rgba(11,26,51,0.9)";
  ctx.beginPath();
  ctx.arc(k.bodyLen * 0.32, -k.bodyWidth * 0.25, 1.6, 0, TAU);
  ctx.fill();

  ctx.restore();
}
