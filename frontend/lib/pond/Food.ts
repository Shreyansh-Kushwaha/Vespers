import { TAU } from "./utils";

/**
 * Food pellets. Pooled, cheap to update and draw.
 *
 *   - Spawn on user click while food-mode is on.
 *   - Drift briefly then settle into a slow sink (water resistance).
 *   - Koi search the food list every frame and steer toward the closest one;
 *     when they touch it, the pellet is marked eaten and the koi enters its
 *     `eating` state for ~0.6s (see Koi.ts).
 *
 * Drawing is two arcs — a soft halo + a tight center — so the pellet reads as
 * a warm dot even on low-DPR canvases. No shadow blurs, no filters.
 */
export interface Food {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  ttl: number;
  size: number;
}

export const FOOD_LIFE = 14000;            // pellet auto-disappears after this
export const EAT_RADIUS = 20;              // distance at which a koi consumes it
export const EAT_RADIUS_SQ = EAT_RADIUS * EAT_RADIUS;
export const FOOD_INTEREST_RADIUS = 360;   // koi notices food within this range
export const FOOD_INTEREST_RADIUS_SQ = FOOD_INTEREST_RADIUS * FOOD_INTEREST_RADIUS;

export function createFood(): Food {
  return {
    active: false,
    x: 0, y: 0, vx: 0, vy: 0,
    bornAt: 0, ttl: FOOD_LIFE,
    size: 2.6,
  };
}

export function spawnFood(f: Food, x: number, y: number, now: number): void {
  f.x = x;
  f.y = y;
  f.vx = (Math.random() - 0.5) * 8;
  f.vy = 6 + Math.random() * 4;
  f.bornAt = now;
  f.ttl = FOOD_LIFE;
  f.size = 2.3 + Math.random() * 1.1;
}

export function updateFood(f: Food, dt: number, now: number): void {
  if (now - f.bornAt >= f.ttl) { f.active = false; return; }
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  // gentle drag — pellet settles into a slow drift, mimicking water resistance
  f.vx *= 0.94;
  f.vy *= 0.96;
  if (f.vy < 1.2) f.vy = 1.2;
}

export function drawFood(ctx: CanvasRenderingContext2D, f: Food, now: number): void {
  const k = (now - f.bornAt) / f.ttl;
  const visAlpha =
    k < 0.08 ? k / 0.08 :
    k > 0.85 ? (1 - k) / 0.15 :
    1;

  ctx.save();
  ctx.globalAlpha = visAlpha;
  ctx.fillStyle = "rgba(244,201,181,0.16)";
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size * 2.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(248,218,206,0.92)";
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size, 0, TAU);
  ctx.fill();
  ctx.restore();
}
