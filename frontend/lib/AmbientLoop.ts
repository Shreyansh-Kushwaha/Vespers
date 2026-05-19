/**
 * Tiny ambient-music helper used by the play-room objects. Wraps an
 * HTMLAudioElement looping a single MP3, piped through a WebAudio GainNode so
 * mute/unmute fades smoothly instead of clicking.
 *
 * Defaults to muted; the AudioContext is only created on the first
 * `start()` call so a visitor who never unmutes never instantiates audio.
 */
export class AmbientLoop {
  private src: string;
  private volume: number;
  private muted: boolean;

  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private node: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private started = false;

  constructor(opts: { src: string; volume?: number; muted?: boolean }) {
    this.src = opts.src;
    this.volume = opts.volume ?? 0.32;
    this.muted = opts.muted ?? true;
  }

  /** Idempotent. Must run from a user gesture or the AudioContext stays suspended. */
  start(): void {
    if (this.started) return;
    this.started = true;

    type Win = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as Win).webkitAudioContext;
    if (!Ctx) return;

    const el = new Audio(this.src);
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    this.el = el;

    const ctx = new Ctx();
    this.ctx = ctx;
    const node = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : this.volume;
    node.connect(gain);
    gain.connect(ctx.destination);
    this.node = node;
    this.gain = gain;

    el.play().catch(() => {
      /* autoplay can be denied; toggling mute later re-attempts via setMuted */
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.gain || !this.ctx || !this.el) return;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(muted ? 0 : this.volume, t + 0.6);
    // Some browsers pause the element when the context is suspended after an
    // autoplay block. A fresh play() on user gesture is cheap and harmless.
    if (!muted && this.el.paused) {
      this.el.play().catch(() => {});
    }
  }

  isMuted(): boolean { return this.muted; }

  destroy(): void {
    try { this.el?.pause(); } catch { /* ignore */ }
    if (this.ctx) this.ctx.close().catch(() => {});
    this.el = null;
    this.ctx = null;
    this.node = null;
    this.gain = null;
    this.started = false;
  }
}
