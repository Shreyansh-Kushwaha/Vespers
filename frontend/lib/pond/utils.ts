/**
 * Math + pooling primitives for the pond. Everything here is hot-path code;
 * no allocation, no closures captured per frame.
 */

export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Wrap an angle to (-π, π] so smooth interpolation never spins the long way. */
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

/**
 * Cheap two-octave pseudo-noise from summed sines. Deterministic on `seed`,
 * good enough for organic drift, ~zero cost compared to Perlin.
 */
export function noise2(t: number, seed: number): number {
  return (
    Math.sin(t * 0.6 + seed * 1.3) * 0.6 +
    Math.sin(t * 1.7 + seed * 2.1) * 0.4
  );
}

/**
 * Lightweight slot pool. Each pooled item carries its own `active` flag so
 * iteration is one cache-friendly pass with a branch predictor freebie.
 *
 * `acquire()` finds a free slot or recycles the oldest in round-robin order
 * (so we don't always thrash slot 0). `acquireFree()` returns null when full —
 * use it when the spawn is non-essential and shouldn't displace something live.
 */
export class Pool<T extends { active: boolean }> {
  readonly items: T[];
  private head = 0;

  constructor(capacity: number, factory: () => T) {
    this.items = new Array(capacity);
    for (let i = 0; i < capacity; i++) this.items[i] = factory();
  }

  acquire(): T {
    for (const it of this.items) {
      if (!it.active) { it.active = true; return it; }
    }
    const it = this.items[this.head];
    this.head = (this.head + 1) % this.items.length;
    it.active = true;
    return it;
  }

  acquireFree(): T | null {
    for (const it of this.items) {
      if (!it.active) { it.active = true; return it; }
    }
    return null;
  }

  forEachActive(fn: (it: T) => void): void {
    for (const it of this.items) {
      if (it.active) fn(it);
    }
  }
}
