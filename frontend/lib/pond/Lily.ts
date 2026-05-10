import { TAU, noise2 } from "./utils";

/**
 * Lotus leaves drifting on the pond's surface.
 *
 * Each leaf is one ellipse + a triangular notch (the classic split) + a
 * soft top highlight + an underwater shadow. One leaf in the set carries a
 * small lotus flower bud (a tiny pink-white teardrop) that pulses gently.
 *
 * Performance:
 *   - The set is fixed per session — never pooled, never resized at runtime.
 *   - All draws are simple fillPaths; no save/restore stacks beyond the per-leaf
 *     transform, which the canvas state machine handles cheaply.
 */
export interface LilyPad {
  cx: number; cy: number;
  rx: number; ry: number;
  rotation: number;
  swayPhase: number;
  swaySeed: number;
  drift: number;
  hasBud: boolean;
  budOffset: number; // -1..1 along the long axis
  hue: string;
  highlightHue: string;
}

const LEAF_HUES: [string, string][] = [
  // [body, highlight]
  ["#1F3A45", "rgba(244,201,181,0.08)"],
  ["#1A323F", "rgba(244,201,181,0.06)"],
  ["#234049", "rgba(244,201,181,0.07)"],
];

export function makeLilyPads(count: number, w: number, h: number): LilyPad[] {
  const pads: LilyPad[] = [];
  if (count <= 0) return pads;

  // Distribute leaves across the visible area, biased away from edges.
  const positions = layoutLeaves(count, w, h);
  for (let i = 0; i < count; i++) {
    const [hue, highlight] = LEAF_HUES[i % LEAF_HUES.length];
    pads.push({
      cx: positions[i].x,
      cy: positions[i].y,
      rx: 36 + Math.random() * 24,
      ry: 24 + Math.random() * 14,
      rotation: Math.random() * TAU,
      swayPhase: Math.random() * TAU,
      swaySeed: Math.random() * 100,
      drift: -2.5 + Math.random() * 5,
      hasBud: i === 0, // exactly one leaf carries a flower
      budOffset: 0.55 + Math.random() * 0.3,
      hue,
      highlightHue: highlight,
    });
  }
  return pads;
}

/** Stratified layout — three vertical bands so leaves don't bunch. */
function layoutLeaves(count: number, w: number, h: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const band = i % 3; // 0=upper, 1=middle, 2=lower
    out.push({
      x: w * (0.18 + Math.random() * 0.68),
      y: h * (0.18 + band * 0.26 + Math.random() * 0.16),
    });
  }
  return out;
}

export function updateLilies(
  pads: LilyPad[], dt: number, now: number, w: number, h: number,
): void {
  for (const p of pads) {
    p.cx += p.drift * dt;
    p.swayPhase += dt * 0.3;
    if (p.cx < -120) p.cx = w + 120;
    if (p.cx > w + 120) p.cx = -120;
    p.cy += noise2(now * 0.0003, p.swaySeed) * dt * 1.5;
    if (p.cy < 60) p.cy = 60;
    if (p.cy > h - 60) p.cy = h - 60;
  }
}

export function drawLily(ctx: CanvasRenderingContext2D, p: LilyPad, now: number): void {
  const wobble = Math.sin(p.swayPhase) * 0.05;
  ctx.save();
  ctx.translate(p.cx, p.cy);
  ctx.rotate(p.rotation + wobble);

  // soft underwater shadow — slightly offset, very soft
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(3, 5, p.rx * 1.02, p.ry * 0.95, 0, 0, TAU);
  ctx.fill();

  // leaf body
  ctx.fillStyle = p.hue;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
  ctx.fill();

  // notch — the classic lily/lotus split
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(p.rx, p.ry * 0.06);
  ctx.lineTo(p.rx, -p.ry * 0.06);
  ctx.closePath();
  ctx.fill();

  // top highlight — sunlight catching the edge of the leaf
  ctx.fillStyle = p.highlightHue;
  ctx.beginPath();
  ctx.ellipse(-p.rx * 0.22, -p.ry * 0.42, p.rx * 0.55, p.ry * 0.32, 0, 0, TAU);
  ctx.fill();

  // faint vein lines — three quick strokes radiating from the notch
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 0.6;
  for (let i = -1; i <= 1; i++) {
    const a = i * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * p.rx * 0.85, Math.sin(a) * p.ry * 0.85);
    ctx.stroke();
  }

  // optional lotus flower bud
  if (p.hasBud) {
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.002 + p.swaySeed);
    const bx = -p.rx * p.budOffset;
    const by = -p.ry * 0.55;

    // soft halo
    ctx.fillStyle = "rgba(255,224,228,0.15)";
    ctx.beginPath();
    ctx.arc(bx, by, 14 * pulse, 0, TAU);
    ctx.fill();

    // bud body — a teardrop made from two arcs
    ctx.fillStyle = "rgba(255,232,232,0.95)";
    ctx.beginPath();
    ctx.ellipse(bx, by, 4.5 * pulse, 7 * pulse, 0.2, 0, TAU);
    ctx.fill();

    // small inner blush
    ctx.fillStyle = "rgba(232,164,135,0.8)";
    ctx.beginPath();
    ctx.ellipse(bx, by + 1.5, 2.2 * pulse, 3.5 * pulse, 0.2, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}
