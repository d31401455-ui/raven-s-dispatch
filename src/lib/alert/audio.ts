// Synthesized SFX via WebAudio, scheduled relative to alert start.
export class AlertAudio {
  ctx: AudioContext;
  master: GainNode;
  recordDest: MediaStreamAudioDestinationNode;
  private noise: AudioBuffer;

  constructor(volume = 0.8) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = volume;
    this.master.connect(this.ctx.destination);
    this.recordDest = this.ctx.createMediaStreamDestination();
    this.master.connect(this.recordDest);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolume(v: number) {
    this.master.gain.value = v;
  }

  resume() {
    return this.ctx.state === "suspended" ? this.ctx.resume() : Promise.resolve();
  }

  private noiseSrc(t: number, dur: number) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.start(t, Math.random(), dur + 0.05);
    return s;
  }

  swoosh(t: number, dur = 0.35, gain = 0.5) {
    const s = this.noiseSrc(t, dur);
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.5);
    f.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
  }

  flaps(t: number, count: number, interval: number, gain = 0.35) {
    for (let i = 0; i < count; i++) this.swoosh(t + i * interval, interval * 0.9, gain);
  }

  caw(t: number, gain = 0.25) {
    for (let k = 0; k < 2; k++) {
      const st = t + k * 0.32;
      const o = this.ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(720, st);
      o.frequency.exponentialRampToValueAtTime(430, st + 0.22);
      const vib = this.ctx.createOscillator();
      vib.frequency.value = 38;
      const vg = this.ctx.createGain();
      vg.gain.value = 40;
      vib.connect(vg).connect(o.frequency);
      const f1 = this.ctx.createBiquadFilter();
      f1.type = "bandpass";
      f1.frequency.value = 1400;
      f1.Q.value = 3;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2600;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(gain, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.26);
      // distance: simple feedback-free echo
      const d = this.ctx.createDelay();
      d.delayTime.value = 0.12;
      const dg = this.ctx.createGain();
      dg.gain.value = 0.25;
      o.connect(f1).connect(lp).connect(g);
      g.connect(this.master);
      g.connect(d).connect(dg).connect(this.master);
      o.start(st);
      vib.start(st);
      o.stop(st + 0.3);
      vib.stop(st + 0.3);
    }
  }

  scratch(t: number, gain = 0.18) {
    const dur = 0.05 + Math.random() * 0.05;
    const s = this.noiseSrc(t, dur);
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3500 + Math.random() * 3000;
    f.Q.value = 6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    // metallic ping
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 4000 + Math.random() * 2500;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(gain * 0.25, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + 0.14);
  }

  impact(t: number, gain = 0.6) {
    const partials = [110, 164.8, 221, 296, 412, 587, 830];
    partials.forEach((fr, i) => {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = fr * (1 + (Math.random() - 0.5) * 0.01);
      const g = this.ctx.createGain();
      const a = gain / (i + 1.5);
      const dec = 2.4 / (1 + i * 0.35);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dec + 0.05);
    });
    const s = this.noiseSrc(t, 0.15);
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    s.connect(f).connect(g).connect(this.master);
  }

  rumble(t: number, dur: number, gain = 0.12) {
    const s = this.noiseSrc(t, dur);
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
  }

  /** Schedule the full alert soundtrack, synced to the visual timeline. */
  scheduleAlert() {
    const t0 = this.ctx.currentTime + 0.02;
    this.rumble(t0, 1.2);
    this.flaps(t0 + 0.3, 5, 0.12, 0.4); // arrival wing beats
    this.caw(t0 + 0.45, 0.22); // distant raven call
    this.swoosh(t0 + 0.88, 0.2, 0.3); // landing / claw grip
    for (let x = 1.2; x < 2.78; x += 0.07 + Math.random() * 0.05) this.scratch(t0 + x); // chisel
    this.impact(t0 + 2.8); // metal strike / gong
    this.swoosh(t0 + 3.3, 0.45, 0.55); // strong exit wing beat
    this.flaps(t0 + 3.6, 4, 0.16, 0.25);
  }
}
