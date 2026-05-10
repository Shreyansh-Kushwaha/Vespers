/**
 * Synthesized candle audio. Three layers, all Web Audio API, no asset bytes:
 *
 *   - hum:     2-3 detuned sines through a low-pass. Very quiet underbed.
 *   - crackle: sporadic high-passed noise pops while at least one candle burns.
 *   - bell:    one-shot 2-partial sine, played at 5-min intervals.
 *
 * The graph stays under ~10 nodes total. Master gain default 0.08 — quieter
 * than even the koi pond's pad.
 */
export class CandleAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private crackleTimer: ReturnType<typeof setTimeout> | null = null;
  private muted: boolean;

  constructor(muted = true) { this.muted = muted; }

  /** Idempotent. Must run from a user gesture. */
  start(): void {
    if (this.ctx) return;
    type Win = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as Win).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.08;
    this.master.connect(ctx.destination);

    // half-second noise buffer reused for every crackle pop
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.08, t + 0.4);
    }
  }
  isMuted(): boolean { return this.muted; }

  /** Begin (or resume) the warm hum layer. Idempotent — calling while live is a no-op. */
  startHum(): void {
    if (!this.ctx || !this.master || this.hum) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 0.5;
    gain.connect(filter);
    filter.connect(this.master);

    const oscs: OscillatorNode[] = [];
    for (const f of [110, 110.5, 220.7]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      oscs.push(osc);
    }
    // gentle 6-second fade-in so it never announces itself
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 6);
    this.hum = { osc: oscs, gain };
    this.scheduleCrackle();
  }

  stopHum(): void {
    if (!this.hum || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.hum.gain.gain.linearRampToValueAtTime(0, t + 1.5);
    const ref = this.hum;
    setTimeout(() => {
      try { for (const o of ref.osc) o.stop(); } catch { /* already stopped */ }
    }, 1700);
    this.hum = null;
    if (this.crackleTimer) {
      clearTimeout(this.crackleTimer);
      this.crackleTimer = null;
    }
  }

  bell(): void {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const root = 392; // G4
    for (const f of [root, root * 2.4]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc.stop(t + 1.7);
    }
  }

  destroy(): void {
    this.stopHum();
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
  }

  // ── private ─────────────────────────────────────────────────────

  private scheduleCrackle(): void {
    if (!this.ctx || !this.hum) return;
    const delay = 800 + Math.random() * 4000;
    this.crackleTimer = setTimeout(() => {
      this.crackle();
      this.scheduleCrackle();
    }, delay);
  }

  private crackle(): void {
    if (!this.ctx || !this.noiseBuffer || !this.master) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000 + Math.random() * 2000;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    src.stop(t + 0.1);
  }
}
