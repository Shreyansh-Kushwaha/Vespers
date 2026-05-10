import { TAU } from "./utils";

/**
 * Submerged stones resting on the pond floor.
 *
 * They are static — placed once on `make` and never updated again. Drawn as
 * irregular polygons (precomputed vertex offsets so the silhouette is the same
 * every frame, which is why they read as "the same stone" instead of a
 * shimmer of shapes).
 *
 * Visually they sit beneath the koi (drawn after the bg gradient + caustics,
 * before koi) and contribute much of what makes the scene feel anchored.
 */
export interface Stone {
  cx: number; cy: number;
  rx: number; ry: number;
  // pre-baked silhouette: alternating angle/radius pairs around the rim
  vertices: { x: number; y: number }[];
  hue: string;
  highlightHue: string;
  /** which side the soft top-highlight sweep sits on (radians). */
  highlightAngle: number;
}

const STONE_HUES: [string, string][] = [
  // [body, highlight]
  ["#040A18", "rgba(244,201,181,0.06)"],
  ["#0A1124", "rgba(244,201,181,0.05)"],
  ["#06101F", "rgba(244,201,181,0.07)"],
];

/**
 * Build an irregular silhouette by walking around an ellipse and jittering the
 * radius at each vertex. 9 vertices is enough to read as organic without
 * looking polygonal.
 */
function buildSilhouette(rx: number, ry: number): { x: number; y: number }[] {
  const n = 9;
  const v: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const jitter = 0.78 + Math.random() * 0.32; // 0.78..1.10
    v.push({
      x: Math.cos(a) * rx * jitter,
      y: Math.sin(a) * ry * jitter,
    });
  }
  return v;
}

/**
 * Position stones in a loose cluster + a few outliers — the rule-of-thirds
 * composition that reads naturally. Cluster center is biased to the lower
 * third of the canvas (pond-floor cue).
 */
export function makeStones(count: number, w: number, h: number): Stone[] {
  if (count <= 0) return [];
  const stones: Stone[] = [];
  const cx = w * (0.32 + Math.random() * 0.36);
  const cy = h * (0.62 + Math.random() * 0.18);

  for (let i = 0; i < count; i++) {
    const inCluster = i < Math.ceil(count * 0.6);
    const rx = (inCluster ? 22 : 28) + Math.random() * 18;
    const ry = rx * (0.55 + Math.random() * 0.22); // squashed verticals
    const dx = inCluster
      ? (Math.random() - 0.5) * 90
      : (Math.random() - 0.5) * w * 0.6;
    const dy = inCluster
      ? (Math.random() - 0.5) * 36
      : (Math.random() - 0.5) * h * 0.3;

    const [hue, highlight] = STONE_HUES[i % STONE_HUES.length];
    stones.push({
      cx: Math.max(40, Math.min(w - 40, cx + dx)),
      cy: Math.max(60, Math.min(h - 40, cy + dy)),
      rx, ry,
      vertices: buildSilhouette(rx, ry),
      hue,
      highlightHue: highlight,
      highlightAngle: Math.PI * (0.7 + Math.random() * 0.6), // upper-ish
    });
  }
  return stones;
}

export function drawStone(ctx: CanvasRenderingContext2D, s: Stone): void {
  ctx.save();
  ctx.translate(s.cx, s.cy);

  // soft halo / silt around the stone — a faint blurred glow that suggests
  // it sits in suspended water. Cheap: one filled ellipse.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 4, s.rx * 1.25, s.ry * 1.05, 0, 0, TAU);
  ctx.fill();

  // body — the irregular silhouette
  ctx.fillStyle = s.hue;
  ctx.beginPath();
  const v0 = s.vertices[0];
  ctx.moveTo(v0.x, v0.y);
  for (let i = 1; i < s.vertices.length; i++) {
    const v = s.vertices[i];
    ctx.lineTo(v.x, v.y);
  }
  ctx.closePath();
  ctx.fill();

  // top highlight sweep — a thin lighter ellipse hugging the upper rim
  const hx = Math.cos(s.highlightAngle) * s.rx * 0.45;
  const hy = Math.sin(s.highlightAngle) * s.ry * 0.45 - s.ry * 0.25;
  ctx.fillStyle = s.highlightHue;
  ctx.beginPath();
  ctx.ellipse(hx, hy, s.rx * 0.55, s.ry * 0.18, s.highlightAngle, 0, TAU);
  ctx.fill();

  ctx.restore();
}
