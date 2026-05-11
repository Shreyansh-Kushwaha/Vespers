import { TAU } from "./utils";

export interface Ripple {
  active: boolean;
  x: number;
  y: number;
  bornAt: number;
  strength: number;   // 0..1
  ringCount: number;  // 1 = primary only; 2 = primary + faint inner echo
}

export const RIPPLE_LIFE = 2400; // ms

export function createRipple(): Ripple {
  return { active: false, x: 0, y: 0, bornAt: 0, strength: 0, ringCount: 1 };
}

export function drawRipple(
  ctx: CanvasRenderingContext2D,
  r: Ripple,
  now: number,
): void {
  // Clamp age to a sane range. age can briefly go negative when a ripple is
  // spawned from a pointer event whose performance.now() is slightly ahead of
  // the in-flight rAF timestamp — without this, ease-out produces a negative
  // radius and ctx.arc throws, killing the whole render loop.
  let age = now - r.bornAt;
  if (age >= RIPPLE_LIFE) { r.active = false; return; }
  if (age < 0) age = 0;

  const k = age / RIPPLE_LIFE;
  // ease-out: rapid bloom that softens into the water
  const eased = 1 - (1 - k) * (1 - k);
  const radius = 8 + eased * 240;
  const alpha = (1 - k) * 0.5 * r.strength;

  ctx.strokeStyle = `rgba(244,201,181,${alpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(r.x, r.y, radius, 0, TAU);
  ctx.stroke();

  if (r.ringCount > 1) {
    ctx.strokeStyle = `rgba(244,201,181,${alpha * 0.45})`;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius * 0.62, 0, TAU);
    ctx.stroke();
  }
}
