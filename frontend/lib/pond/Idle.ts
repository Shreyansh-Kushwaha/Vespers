/**
 * Idle event scheduler. Tracks the last user-input timestamp and slowly fires
 * events when the pond has been left alone:
 *
 *   - 12s+   first petal flurry
 *   - 30s+   gentle gather bias toward center (calm, not magnetic)
 *   - 45s+   the occasional bamboo chime
 *   - 90s+   fireflies surface (one-shot per idle stretch)
 *
 * `bump()` is the only mutation API. Everything else is tick-driven so the
 * scheduler can never race ahead of the frame loop.
 */

export interface IdleHooks {
  onPetalFlurry: () => void;
  onCalmGather: () => void;
  onChime: () => void;
  onFireflyAwakening: () => void;
}

export class IdleScheduler {
  private lastInputAt: number;
  private hooks: IdleHooks;
  private nextPetalAt: number;
  private nextChimeAt: number;
  private fireflyArmed = true;

  constructor(now: number, hooks: IdleHooks) {
    this.lastInputAt = now;
    this.hooks = hooks;
    this.nextPetalAt = now + 18000;
    this.nextChimeAt = now + 60000;
  }

  bump(now: number): void {
    this.lastInputAt = now;
    this.fireflyArmed = true;
    // Push the next petal & chime out so input doesn't compete with idle
    // events for paint budget.
    if (this.nextPetalAt < now + 12000) this.nextPetalAt = now + 18000;
    if (this.nextChimeAt < now + 30000) this.nextChimeAt = now + 60000;
  }

  tick(now: number): void {
    const idle = now - this.lastInputAt;
    if (idle < 12000) return;

    if (now > this.nextPetalAt) {
      this.hooks.onPetalFlurry();
      this.nextPetalAt = now + 22000 + Math.random() * 18000;
    }
    if (idle > 30000) this.hooks.onCalmGather();
    if (idle > 45000 && now > this.nextChimeAt) {
      this.hooks.onChime();
      this.nextChimeAt = now + 50000 + Math.random() * 90000;
    }
    if (idle > 90000 && this.fireflyArmed) {
      this.hooks.onFireflyAwakening();
      this.fireflyArmed = false;
    }
  }
}
