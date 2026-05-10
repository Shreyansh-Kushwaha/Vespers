import { TAU, noise2 } from "./utils";

/**
 * Three pooled particle families share one struct. The kind tag is checked in
 * a single update/draw switch so we keep one tight loop instead of three.
 */
export type ParticleKind = "petal" | "mote" | "firefly";

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number; y: number;
  vx: number; vy: number;
  bornAt: number;
  ttl: number;
  size: number;
  rotation: number;
  hue: string;
  seed: number;
  pulsePhase: number;
}

export function createParticle(): Particle {
  return {
    active: false, kind: "petal",
    x: 0, y: 0, vx: 0, vy: 0,
    bornAt: 0, ttl: 0, size: 0,
    rotation: 0, hue: "",
    seed: 0, pulsePhase: 0,
  };
}

export function spawnPetal(p: Particle, w: number, _h: number, now: number): void {
  p.kind = "petal";
  p.x = Math.random() * w;
  p.y = -10 - Math.random() * 30;
  p.vx = -8 + Math.random() * 16;
  p.vy = 8 + Math.random() * 10;
  p.bornAt = now;
  p.ttl = 14000 + Math.random() * 6000;
  p.size = 2.4 + Math.random() * 1.6;
  p.rotation = Math.random() * TAU;
  p.hue = Math.random() < 0.5 ? "rgba(244,201,181,0.45)" : "rgba(248,218,206,0.4)";
  p.seed = Math.random() * 100;
  p.pulsePhase = 0;
}

export function spawnMote(p: Particle, w: number, h: number, now: number): void {
  p.kind = "mote";
  p.x = Math.random() * w;
  p.y = Math.random() * h;
  p.vx = (Math.random() - 0.5) * 6;
  p.vy = (Math.random() - 0.5) * 4;
  p.bornAt = now;
  p.ttl = 18000 + Math.random() * 8000;
  p.size = 0.7 + Math.random() * 0.8;
  p.rotation = 0;
  p.hue = "rgba(244,201,181,0.18)";
  p.seed = Math.random() * 100;
  p.pulsePhase = 0;
}

export function spawnFirefly(p: Particle, w: number, h: number, now: number): void {
  p.kind = "firefly";
  p.x = Math.random() * w;
  p.y = h * (0.2 + Math.random() * 0.55);
  p.vx = (Math.random() - 0.5) * 8;
  p.vy = (Math.random() - 0.5) * 6;
  p.bornAt = now;
  p.ttl = 9000 + Math.random() * 6000;
  p.size = 1.6 + Math.random() * 1.2;
  p.rotation = 0;
  p.hue = "rgba(255,236,180,0.85)";
  p.seed = Math.random() * 100;
  p.pulsePhase = Math.random() * TAU;
}

export function updateParticle(
  p: Particle, dt: number, now: number, w: number, h: number,
): void {
  if (now - p.bornAt >= p.ttl) { p.active = false; return; }

  if (p.kind === "petal") {
    const wind = noise2(now * 0.0006, p.seed) * 12;
    p.x += (p.vx + wind) * dt;
    p.y += p.vy * dt;
    p.rotation += dt * 0.7;
    if (p.y > h + 20) p.active = false;
    return;
  }
  if (p.kind === "mote") {
    p.x += p.vx * dt + noise2(now * 0.0004, p.seed) * dt * 4;
    p.y += p.vy * dt + noise2(now * 0.0004 + 17, p.seed) * dt * 4;
    if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) p.active = false;
    return;
  }
  // firefly
  p.x += p.vx * dt + noise2(now * 0.0009, p.seed) * dt * 14;
  p.y += p.vy * dt + noise2(now * 0.0009 + 31, p.seed) * dt * 10;
  p.pulsePhase += dt * 2.4;
  if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) p.active = false;
}

export function drawParticle(
  ctx: CanvasRenderingContext2D, p: Particle, now: number,
): void {
  const k = (now - p.bornAt) / p.ttl;
  // ease-in / hold / ease-out for fade so spawns and despawns are never sudden
  const visAlpha =
    k < 0.15 ? k / 0.15 :
    k > 0.85 ? (1 - k) / 0.15 :
    1;

  if (p.kind === "petal") {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = visAlpha;
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 1.3, p.size * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (p.kind === "mote") {
    ctx.save();
    ctx.globalAlpha = visAlpha;
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  // firefly: pulsing soft halo + tight center
  const pulse = 0.65 + 0.35 * Math.sin(p.pulsePhase);
  ctx.save();
  ctx.globalAlpha = visAlpha * 0.65 * pulse;
  ctx.fillStyle = p.hue;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * 4, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = visAlpha * pulse;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * 0.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}
