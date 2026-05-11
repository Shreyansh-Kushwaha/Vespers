import { Pool, TAU } from "./utils";
import {
  detectInitialTier, QualityMonitor, type QualityCaps,
} from "./Quality";
import {
  type Ripple, createRipple, drawRipple,
} from "./Ripple";
import {
  type Koi, buildKoiCatalog, createKoi, drawKoi, updateKoi,
  koiContainsPoint, scareKoi,
} from "./Koi";
import {
  type Particle, createParticle, drawParticle, updateParticle,
  spawnFirefly, spawnPetal,
} from "./Particles";
import {
  type LilyPad, drawLily, makeLilyPads, updateLilies,
} from "./Lily";
import { type Stone, drawStone, makeStones } from "./Stones";
import {
  type Food, createFood, drawFood, spawnFood, updateFood,
} from "./Food";
import { PondAudio } from "./Audio";
import { IdleScheduler } from "./Idle";

const SCARE_RADIUS = 220;
const SCARE_RADIUS_SQ = SCARE_RADIUS * SCARE_RADIUS;

const COLORS = {
  water: "#0B1A33",
  waterDeep: "#061633",
  highlight: "rgba(244,201,181,0.06)",
};

interface PondOptions {
  muted?: boolean;
  onTierChange?: (caps: QualityCaps) => void;
}

/**
 * The pond orchestrator.
 *
 * Single visible canvas, no offscreen buffer — `drawImage` round-trips
 * between two canvases turned out to be the largest hidden cost on lower-end
 * GPUs (forced GPU↔CPU readbacks in some browsers). Painting the radial
 * gradient + caustics inline is cheap as long as the gradient is cached.
 *
 * The frame loop is deliberately dumb: rAF → update → render → rAF. No FPS
 * cap mid-active, no time-credit gymnastics. Idle FPS cap applies only when
 * input has been stale for >5s.
 */
export class Pond {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private quality: QualityMonitor;
  private caps: QualityCaps;
  private onTier?: (caps: QualityCaps) => void;

  private w = 0;
  private h = 0;
  private dpr = 1;

  private ripples: Pool<Ripple>;
  private koi: Koi[] = [];
  private particles: Pool<Particle>;
  private lilies: LilyPad[] = [];
  private stones: Stone[] = [];
  private foods: Pool<Food>;

  private audio: PondAudio;
  private idle: IdleScheduler;

  private foodMode = false;

  private running = false;
  private visible = true;
  private rafId = 0;
  private lastT = 0;
  private lastInputAt = 0;
  private lastSplashAudioAt = 0;

  // Cached gradients — recreated on resize only.
  private bgGradient: CanvasGradient | null = null;
  private vignette: CanvasGradient | null = null;

  private resizeObs: ResizeObserver | null = null;
  private onVisibility = () => {
    this.visible = !document.hidden;
    if (this.visible && this.running) this.scheduleFrame();
  };

  constructor(canvas: HTMLCanvasElement, opts: PondOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;

    this.onTier = opts.onTierChange;
    this.caps = detectInitialTier();
    this.quality = new QualityMonitor(this.caps);

    this.ripples = new Pool<Ripple>(this.caps.maxRipples, createRipple);
    this.particles = new Pool<Particle>(this.caps.maxParticles, createParticle);
    this.foods = new Pool<Food>(this.caps.maxFood, createFood);

    this.audio = new PondAudio(opts.muted ?? true);
    this.idle = new IdleScheduler(performance.now(), {
      onPetalFlurry: () => this.spawnPetalFlurry(),
      onCalmGather: () => this.applyGatherBias(),
      onChime: () => this.audio.chime(),
      onFireflyAwakening: () => this.spawnFireflies(),
    });
  }

  // ── lifecycle ───────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.fit();
    this.populate();
    this.lastT = performance.now();
    this.lastInputAt = this.lastT;

    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(this.canvas);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.canvas.addEventListener("pointerdown", this.handlePointer);

    this.scheduleFrame();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.resizeObs) this.resizeObs.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.handlePointer);
    this.audio.destroy();
  }

  setMuted(m: boolean): void {
    if (m === false) this.audio.start();
    this.audio.setMuted(m);
  }
  isMuted(): boolean { return this.audio.isMuted(); }
  tier(): QualityCaps { return this.caps; }

  setFoodMode(b: boolean): void { this.foodMode = b; }
  isFoodMode(): boolean { return this.foodMode; }

  // ── input ───────────────────────────────────────────────────────────

  private handlePointer = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.audio.start();
    this.lastInputAt = performance.now();
    this.idle.bump(this.lastInputAt);

    // Food mode: drop a pellet. No curiosity ripple — the fish are drawn by
    // the food itself. Very soft audio cue.
    if (this.foodMode) {
      this.spawnFoodAt(x, y);
      this.audio.splash(0.18);
      return;
    }

    // Otherwise, hit-test the koi. A click ON a fish should scare nearby fish
    // (and NOT spawn an attracting ripple, which would just pull them back to
    // the click point and produce the "vibrating on top of the ripple" bug).
    let hit = false;
    for (let i = 0; i < this.koi.length; i++) {
      if (koiContainsPoint(this.koi[i], x, y)) { hit = true; break; }
    }
    if (hit) {
      for (let i = 0; i < this.koi.length; i++) {
        const k = this.koi[i];
        const dx = k.x - x;
        const dy = k.y - y;
        const dSq = dx * dx + dy * dy;
        if (dSq < SCARE_RADIUS_SQ) {
          const intensity = 1 - Math.sqrt(dSq) / SCARE_RADIUS;
          scareKoi(k, x, y, Math.max(0.4, intensity));
        }
      }
      // Quieter splash — the fish darting away is the main feedback.
      this.audio.splash(0.35);
      return;
    }

    // Clean miss on water: curiosity ripple as before.
    this.spawnRipple(x, y, 1);
    this.audio.splash(0.6);
  };

  // ── world setup ─────────────────────────────────────────────────────

  private fit(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.caps.dpr);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Cache both radial gradients now. createRadialGradient is not free; we
    // reuse the result every frame via fillStyle assignment.
    const bg = this.ctx.createRadialGradient(
      w * 0.5, h * 0.55, 0,
      w * 0.5, h * 0.55, Math.max(w, h) * 0.75,
    );
    bg.addColorStop(0, COLORS.water);
    bg.addColorStop(1, COLORS.waterDeep);
    this.bgGradient = bg;

    const vg = this.ctx.createRadialGradient(
      w * 0.5, h * 0.5, Math.min(w, h) * 0.4,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    this.vignette = vg;
  }

  private populate(): void {
    this.koi.length = 0;
    const catalog = buildKoiCatalog(this.caps.maxKoi);
    for (let i = 0; i < this.caps.maxKoi; i++) {
      const { hue, pattern } = catalog[i];
      this.koi.push(createKoi(i, this.w, this.h, hue, pattern));
    }
    // Stones are static — drawn each frame but never updated. Built once.
    this.stones = makeStones(this.caps.maxStones, this.w, this.h);
    // Lotus leaves — small fixed set, drift slowly across the surface.
    this.lilies = makeLilyPads(this.caps.maxLilies, this.w, this.h);
    // Particles still only appear via idle events; pond starts visually still.
  }

  // ── spawners ────────────────────────────────────────────────────────

  private spawnRipple(x: number, y: number, strength: number): void {
    const r = this.ripples.acquire();
    r.x = x; r.y = y;
    r.bornAt = performance.now();
    r.strength = strength;
    r.ringCount = 2;
  }

  private spawnFoodAt(x: number, y: number): void {
    const f = this.foods.acquire();
    spawnFood(f, x, y, performance.now());
  }

  private spawnPetalFlurry(): void {
    const n = 2 + Math.floor(Math.random() * 3);
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const p = this.particles.acquireFree();
      if (!p) break;
      spawnPetal(p, this.w, this.h, now);
    }
  }

  private spawnFireflies(): void {
    if (!this.caps.enableFireflies) return;
    const n = 2 + Math.floor(Math.random() * 2);
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const p = this.particles.acquireFree();
      if (!p) break;
      spawnFirefly(p, this.w, this.h, now);
    }
  }

  private applyGatherBias(): void {
    const cx = this.w * 0.5, cy = this.h * 0.5;
    for (const k of this.koi) {
      const a = Math.atan2(cy - k.y, cx - k.x);
      k.heading += (a - k.heading) * 0.02;
    }
  }

  // ── frame loop ──────────────────────────────────────────────────────

  private scheduleFrame(): void {
    if (!this.running || !this.visible) return;
    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number): void {
    if (!this.running) return;
    const dtMs = Math.min(64, now - this.lastT);
    const dt = dtMs / 1000;
    this.lastT = now;

    if (this.quality.observe(dtMs, now)) {
      this.applyTierDowngrade();
    }

    // Idle FPS cap — only when input has been quiet a while. When active we
    // let rAF set the pace; we never artificially throttle because the
    // skip+reschedule logic added more overhead than it saved.
    const idleLong = now - this.lastInputAt > 5000;
    if (idleLong) {
      const minFrameMs = 1000 / this.caps.idleFps;
      if (dtMs < minFrameMs) {
        this.scheduleFrame();
        // re-credit so dt stays meaningful next tick
        this.lastT = now - dtMs;
        return;
      }
    }

    // ── update
    this.idle.tick(now);

    updateLilies(this.lilies, dt, now, this.w, this.h);

    // Update food pellets first so the koi steering this frame sees their
    // freshest positions (pellets sink slowly between frames).
    const foodItems = this.foods.items;
    for (let i = 0; i < foodItems.length; i++) {
      const f = foodItems[i];
      if (f.active) updateFood(f, dt, now);
    }

    for (const k of this.koi) {
      const { splash, ate } = updateKoi(
        k, this.koi, this.ripples.items, foodItems, dt, now, this.w, this.h,
      );
      if (splash) {
        this.spawnRipple(k.x, k.y, 0.4);
        if (now - this.lastSplashAudioAt > 250) {
          this.audio.splash(0.25);
          this.lastSplashAudioAt = now;
        }
      }
      if (ate) {
        // tiny ripple at the bite + soft pop audio
        this.spawnRipple(k.x, k.y, 0.35);
        if (now - this.lastSplashAudioAt > 200) {
          this.audio.splash(0.2);
          this.lastSplashAudioAt = now;
        }
      }
    }

    const pParticles = this.particles.items;
    for (let i = 0; i < pParticles.length; i++) {
      const p = pParticles[i];
      if (p.active) updateParticle(p, dt, now, this.w, this.h);
    }

    // ── render: all in one pass on the visible canvas
    if (this.bgGradient) {
      this.ctx.fillStyle = this.bgGradient;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }

    // Light caustics — three soft ellipses with a subtle blend. Cheap.
    const t = now * 0.0003;
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.fillStyle = COLORS.highlight;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.ellipse(
        this.w * (0.5 + Math.sin(t + i) * 0.25),
        this.h * (0.5 + Math.cos(t * 0.8 + i * 1.7) * 0.25),
        120 + i * 40, 80 + i * 20, 0, 0, TAU,
      );
      this.ctx.fill();
    }
    this.ctx.globalCompositeOperation = "source-over";

    // stones sit on the pond floor, beneath everything else
    for (const s of this.stones) drawStone(this.ctx, s);

    // food pellets — drawn below the koi so a fish closing on a pellet
    // visually swallows it (the body sprite passes over the dot).
    for (let i = 0; i < foodItems.length; i++) {
      const f = foodItems[i];
      if (f.active) drawFood(this.ctx, f, now);
    }

    for (const k of this.koi) drawKoi(this.ctx, k);

    // lotus leaves float on the surface — drawn AFTER koi so a fish can
    // briefly disappear under a leaf, which is the visual signal that the
    // leaves are "above" and not just decoration on top of an empty pond.
    for (const p of this.lilies) drawLily(this.ctx, p, now);

    const rippleItems = this.ripples.items;
    for (let i = 0; i < rippleItems.length; i++) {
      const r = rippleItems[i];
      if (r.active) drawRipple(this.ctx, r, now);
    }
    for (let i = 0; i < pParticles.length; i++) {
      const p = pParticles[i];
      if (p.active) drawParticle(this.ctx, p, now);
    }

    if (this.vignette) {
      this.ctx.fillStyle = this.vignette;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }

    this.scheduleFrame();
  }

  private applyTierDowngrade(): void {
    this.caps = this.quality.caps();
    this.fit();
    while (this.koi.length > this.caps.maxKoi) this.koi.pop();
    while (this.lilies.length > this.caps.maxLilies) this.lilies.pop();
    while (this.stones.length > this.caps.maxStones) this.stones.pop();
    this.onTier?.(this.caps);
  }
}
