import { AlertAudio } from "./audio";
import { ALERT_DURATION, AlertScene, CANVAS_H, CANVAS_W, loadAssets, type AlertOptions } from "./engine";

/** Drives an AlertScene on a canvas with a queue, audio, and clean resets. */
export class AlertPlayer {
  private scene: AlertScene | null = null;
  private raf = 0;
  private queue: AlertOptions[] = [];
  private playing = false;
  audio: AlertAudio | null = null;
  muted = false;
  volume = 0.8;
  onEnd?: () => void;
  onStart?: (o: AlertOptions) => void;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
  }

  ensureAudio() {
    if (!this.audio) this.audio = new AlertAudio(this.volume);
    return this.audio;
  }

  setVolume(v: number) {
    this.volume = v;
    this.audio?.setVolume(v);
  }

  enqueue(o: AlertOptions) {
    this.queue.push(o);
    if (!this.playing) void this.next();
  }

  /** Play immediately, interrupting the current alert. Resolves when finished. */
  async play(o: AlertOptions): Promise<void> {
    this.queue = [];
    cancelAnimationFrame(this.raf);
    this.playing = false;
    return this.run(o);
  }

  private async next() {
    const o = this.queue.shift();
    if (!o) return;
    await this.run(o);
    void this.next();
  }

  private async run(o: AlertOptions) {
    this.playing = true;
    const assets = await loadAssets();
    if (this.scene) this.scene.reset(o);
    else this.scene = new AlertScene(assets, o);
    if (!this.muted) {
      const a = this.ensureAudio();
      await a.resume().catch(() => {});
      a.scheduleAlert();
    }
    this.onStart?.(o);
    const ctx = this.canvas.getContext("2d")!;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = (now - start) / 1000;
        this.scene!.render(ctx, Math.min(t, ALERT_DURATION));
        if (t < ALERT_DURATION) this.raf = requestAnimationFrame(tick);
        else {
          ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          resolve();
        }
      };
      this.raf = requestAnimationFrame(tick);
    });
    this.playing = false;
    this.onEnd?.();
  }

  /** Render a static frame (for scrubbing previews). */
  async renderAt(o: AlertOptions, t: number) {
    const assets = await loadAssets();
    const s = new AlertScene(assets, o);
    const ctx = this.canvas.getContext("2d")!;
    for (let x = 0; x <= t; x += 1 / 30) s.render(ctx, x);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    void this.audio?.ctx.close();
  }
}
