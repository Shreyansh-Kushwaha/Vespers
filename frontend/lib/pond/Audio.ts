/**
 * Ambient audio for the pond — fully synthesized via Web Audio API. No assets,
 * no MP3 ship cost, no codec licensing.
 *
 * Graph (active when unmuted):
 *
 *     [pad: 3 sines @110, 110.4, 220Hz] → padGain → lowpass(LFO 0.06Hz) ─┐
 *                                                                       ├→ master → destination
 *     [splash: noiseBuf → bandpass → ADSR gain] ─────────────────────────┤
 *     [chime:  2 sines  →               ADSR gain] ─────────────────────┘
 *
 * Master gain defaults to 0.12 (very quiet). The audio context is created on
 * the first user gesture so the first impression is true silence — anyone
 * who doesn't want sound never hears it.
 */

export class PondAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pad: { osc: OscillatorNode[]; lfo: OscillatorNode } | null = null;
  private muted: boolean;
  private started = false;

  constructor(muted = true) { this.muted = muted; }

  /** Idempotent. Must run from a user gesture or the AudioContext stays "suspended". */
  start(): void {
    if (this.started) return;
    this.started = true;

    type Win = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as Win).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.12;
    this.master.connect(ctx.destination);

    // ── pad
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.55;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 0.7;
    this.padGain.connect(filter);
    filter.connect(this.master);

    const oscs: OscillatorNode[] = [];
    for (const f of [110, 110.4, 220]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(this.padGain);
      osc.start();
      oscs.push(osc);
    }
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.pad = { osc: oscs, lfo };

    // ── one-shot noise buffer for splashes
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      // Smooth the volume change to avoid a click
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.12, t + 0.4);
    }
  }

  isMuted(): boolean { return this.muted; }

  splash(strength = 0.5): void {
    if (!this.ctx || !this.noiseBuffer || !this.master || this.muted) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200 + Math.random() * 1200;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18 * strength, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    src.stop(t + 0.45);
  }

  chime(): void {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const root = 440 + Math.random() * 60;
    for (const f of [root, root * 1.2]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc.stop(t + 1.5);
    }
  }

  destroy(): void {
    if (this.pad) {
      try {
        for (const o of this.pad.osc) o.stop();
        this.pad.lfo.stop();
      } catch { /* already stopped */ }
    }
    if (this.ctx) this.ctx.close().catch(() => {});
  }
}
