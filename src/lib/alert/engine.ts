import followerAsset from "@/assets/follower.png.asset.json";
import subAsset from "@/assets/sub.png.asset.json";
import crowAsset from "@/assets/Crow.png.asset.json";
import { fitFontSize } from "./fit";

export type AlertType = "follower" | "subscriber";
export const ALERT_DURATION = 5.6;
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

/** Layout of each plate artwork, in source-image (1024px) coordinates. */
const PLATES = {
  follower: {
    name: { x: 253, y: 447, w: 520, h: 140 },
    eyes: [ { x: 113, y: 494, r: 13 }, { x: 151, y: 494, r: 13 }, { x: 951, y: 424, r: 10 } ],
    perchY: 236,
    fill: false,
  },
  subscriber: {
    name: { x: 227, y: 453, w: 586, h: 140 },
    eyes: [ { x: 95, y: 492, r: 14 }, { x: 136, y: 492, r: 14 }, { x: 911, y: 457, r: 10 } ],
    perchY: 318,
    fill: true,
  },
} as const;

const PLATE_SCALE = 0.86;
const PLATE_X = (CANVAS_W - 1024 * PLATE_SCALE) / 2;
const PLATE_Y = (CANVAS_H - 1024 * PLATE_SCALE) / 2 - 30;
const P = (x: number, y: number) => ({ x: PLATE_X + x * PLATE_SCALE, y: PLATE_Y + y * PLATE_SCALE });

export interface Assets { follower: HTMLImageElement; subscriber: HTMLImageElement; crow: HTMLImageElement }

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

let assetPromise: Promise<Assets> | null = null;
export function loadAssets() {
  assetPromise ??= Promise.all([
    loadImg(followerAsset.url),
    loadImg(subAsset.url),
    loadImg(crowAsset.url),
    document.fonts?.load("700 64px 'Cinzel Decorative'").catch(() => null),
    document.fonts?.load("600 32px 'Cinzel'").catch(() => null),
  ]).then(([follower, subscriber, crow]) => ({ follower, subscriber, crow }));
  return assetPromise;
}

// ---------- helpers ----------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeIn = (x: number) => x * x * x;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: "spark" | "feather" | "dust"; rot: number; vr: number; size: number }
interface Scratch { x1: number; y1: number; x2: number; y2: number; born: number }

export interface AlertOptions { user: string; type: AlertType; message?: string | undefined }

export class AlertScene {
  private parts: Particle[] = [];
  private scratches: Scratch[] = [];
  private rnd = mulberry(1);
  private textCanvas: HTMLCanvasElement;
  private mist: { x: number; y: number; r: number; vx: number; a: number }[] = [];
  private lastT = 0;
  private fontSize = 64;
  private feathersSpawned = false;
  constructor(private assets: Assets, public opts: AlertOptions) {
    this.textCanvas = document.createElement("canvas");
    this.reset(opts);
  }

  reset(opts: AlertOptions) {
    this.opts = opts;
    this.rnd = mulberry(Math.floor(Math.random() * 1e9));
    this.parts = [];
    this.scratches = [];
    this.lastT = 0;
    this.feathersSpawned = false;
    this.mist = Array.from({ length: 9 }, () => ({
      x: this.rnd() * CANVAS_W, y: CANVAS_H * (0.3 + this.rnd() * 0.5), r: 180 + this.rnd() * 220,
      vx: (this.rnd() - 0.3) * 60, a: 0.12 + this.rnd() * 0.12,
    }));
    const plate = PLATES[opts.type];
    const tc = this.textCanvas;
    tc.width = Math.ceil(plate.name.w * PLATE_SCALE);
    tc.height = Math.ceil(plate.name.h * PLATE_SCALE);
    const ctx = tc.getContext("2d")!;
    this.fontSize = fitFontSize(
      (size) => { ctx.font = `700 ${size}px 'Cinzel Decorative', 'Cinzel', serif`; return ctx.measureText(opts.user).width; },
      tc.width * 0.92, Math.round(tc.height * 0.56), 16,
    );
    this.renderNameLayer();
  }

  /** Pre-render the engraved name (shadow groove + gold fill) once per alert. */
  private renderNameLayer() {
    const tc = this.textCanvas;
    const ctx = tc.getContext("2d")!;
    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.font = `700 ${this.fontSize}px 'Cinzel Decorative', 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = tc.width / 2, cy = tc.height / 2 + 2;
    // carved groove
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillText(this.opts.user, cx - 1.5, cy - 2);
    // lit bottom edge
    ctx.fillStyle = "rgba(255,230,170,0.35)";
    ctx.fillText(this.opts.user, cx + 1, cy + 2);
    // gold inlay
    const g = ctx.createLinearGradient(0, cy - this.fontSize / 2, 0, cy + this.fontSize / 2);
    g.addColorStop(0, "#fff1c4");
    g.addColorStop(0.45, "#d9a64a");
    g.addColorStop(0.55, "#a8742a");
    g.addColorStop(1, "#f0cf7a");
    ctx.fillStyle = g;
    ctx.fillText(this.opts.user, cx, cy);
  }

  private nameRect() {
    const n = PLATES[this.opts.type].name;
    const p = P(n.x, n.y);
    const w = this.textCanvas.width, h = this.textCanvas.height;
    return { x: p.x, y: p.y, w, h };
  }

  private textExtent() {
    const ctx = this.textCanvas.getContext("2d")!;
    ctx.font = `700 ${this.fontSize}px 'Cinzel Decorative', 'Cinzel', serif`;
    const tw = Math.min(ctx.measureText(this.opts.user).width, this.textCanvas.width);
    const r = this.nameRect();
    return { x0: r.x + (r.w - tw) / 2, x1: r.x + (r.w + tw) / 2, cy: r.y + r.h / 2 };
  }

  render(ctx: CanvasRenderingContext2D, t: number) {
    const dt = clamp(t - this.lastT, 0, 0.1);
    this.lastT = t;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const fadeOut = 1 - easeInOut(seg(t, 4.9, ALERT_DURATION));
    const plate = PLATES[this.opts.type];
    const img = this.opts.type === "follower" ? this.assets.follower : this.assets.subscriber;
    const ext = this.textExtent();
    const r = this.nameRect();

    ctx.save();
    ctx.globalAlpha = fadeOut;

    // 1. mist (behind)
    this.drawMist(ctx, t, dt, 0.6);

    // plate entrance
    const pin = easeOut(seg(t, 0.05, 0.4));
    ctx.save();
    ctx.globalAlpha *= pin;
    const sc = lerp(0.94, 1, pin);
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.scale(sc, sc);
    ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
    if (plate.fill) {
      // the subscriber plate has a transparent window — back it with dark metal
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, "#2a2119"); g.addColorStop(0.5, "#17120d"); g.addColorStop(1, "#2a2119");
      ctx.fillStyle = g;
      ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    }
    ctx.drawImage(img, PLATE_X, PLATE_Y, 1024 * PLATE_SCALE, 1024 * PLATE_SCALE);

    // 3. eye glow + reflection
    this.drawEyes(ctx, t);

    // 4. engraving
    const prog = easeInOut(seg(t, 1.2, 2.8));
    const edge = lerp(ext.x0, ext.x1, prog);
    if (prog > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x - 10, r.y - 10, edge - r.x + 10, r.h + 20);
      ctx.clip();
      ctx.drawImage(this.textCanvas, r.x, r.y);
      ctx.restore();
    }
    if (t > 1.2 && t < 2.8) {
      // hot glowing chisel tip
      const tip = ctx.createRadialGradient(edge, ext.cy, 0, edge, ext.cy, 26);
      tip.addColorStop(0, "rgba(255,240,190,0.95)");
      tip.addColorStop(0.3, "rgba(255,170,60,0.5)");
      tip.addColorStop(1, "rgba(255,120,20,0)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = tip;
      ctx.fillRect(edge - 26, ext.cy - 26, 52, 52); ctx.restore();
      // emit sparks + scratches
      const n = Math.floor(dt * 260) + 1;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (this.rnd() - 0.5) * 2.4;
        const sp = 120 + this.rnd() * 380;
        this.parts.push({ x: edge, y: ext.cy + (this.rnd() - 0.5) * this.fontSize * 0.7, vx: Math.cos(a) * sp + 60, vy: Math.sin(a) * sp, life: 0, max: 0.25 + this.rnd() * 0.45, kind: "spark", rot: 0, vr: 0, size: 1 + this.rnd() * 1.8 });
      }
      if (this.rnd() < dt * 40) {
        const y = ext.cy + (this.rnd() - 0.5) * this.fontSize;
        this.scratches.push({ x1: edge - 4 - this.rnd() * 30, y1: y, x2: edge + this.rnd() * 6, y2: y + (this.rnd() - 0.5) * 8, born: t });
      }
    }
    // gold scratches
    ctx.save();
    ctx.lineCap = "round";
    for (const s of this.scratches) {
      const age = t - s.born;
      const a = clamp(1 - age / 2.2) * 0.8 + 0.12;
      ctx.strokeStyle = `rgba(255,214,130,${a})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    }
    ctx.restore();

    // 5. shimmer sweep
    const sh = seg(t, 2.8, 3.4);
    if (sh > 0 && sh < 1) this.drawShimmer(ctx, r, sh);
    // impact flash
    const fl = seg(t, 2.8, 3.1);
    if (fl > 0 && fl < 1) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(ext.x1, ext.cy, 0, ext.x1, ext.cy, 260);
      g.addColorStop(0, `rgba(255,220,150,${0.7 * (1 - fl)})`);
      g.addColorStop(1, "rgba(255,180,80,0)");
      ctx.fillStyle = g; ctx.fillRect(ext.x1 - 260, ext.cy - 260, 520, 520);
      ctx.restore();
    }
    ctx.restore(); // plate scale

    // banner text
    const bt = easeOut(seg(t, 2.85, 3.3));
    if (bt > 0) {
      const msg = (this.opts.message || "A NEW SOUL JOINS THE FLOCK").toUpperCase();
      const by = P(0, plate.name.y + plate.name.h).y + 120 * PLATE_SCALE + (1 - bt) * 14;
      ctx.save();
      ctx.globalAlpha *= bt;
      const bs = fitFontSize((s) => { ctx.font = `600 ${s}px 'Cinzel', serif`; return ctx.measureText(msg).width + msg.length * s * 0.18; }, 760, 30, 12);
      ctx.font = `600 ${bs}px 'Cinzel', serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${bs * 0.18}px`;
      ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 12;
      ctx.fillStyle = "#1a0c0a"; ctx.fillText(msg, CANVAS_W / 2 + 2, by + 2);
      ctx.shadowColor = "rgba(190,20,20,0.75)"; ctx.shadowBlur = 18;
      ctx.fillStyle = "#f3dfae"; ctx.fillText(msg, CANVAS_W / 2, by);
      ctx.restore();
      // ornamental rule
      ctx.save(); ctx.globalAlpha *= bt * 0.85;
      ctx.strokeStyle = "#c79a4a"; ctx.lineWidth = 1.5;
      const hw = 300 * bt;
      ctx.beginPath(); ctx.moveTo(CANVAS_W / 2 - hw, by + 26); ctx.lineTo(CANVAS_W / 2 + hw, by + 26); ctx.stroke();
      ctx.restore();
    }

    // 2/6. raven
    this.drawRaven(ctx, t, ext, plate.perchY);

    // particles
    this.updateParticles(ctx, dt, t);

    // front mist
    this.drawMist(ctx, t, 0, 0.4, true);
    ctx.restore();
  }

  private drawMist(ctx: CanvasRenderingContext2D, t: number, dt: number, strength: number, front = false) {
    const intro = easeOut(seg(t, 0, 0.3));
    const out = 1 - seg(t, 3.6, 5.4) * 0.75;
    ctx.save();
    for (let i = 0; i < this.mist.length; i++) {
      const m = this.mist[i]!;
      if (front !== (i % 3 === 0)) continue;
      m.x += m.vx * dt;
      const x = ((m.x % (CANVAS_W + 600)) + CANVAS_W + 600) % (CANVAS_W + 600) - 300;
      const a = m.a * strength * intro * out;
      const g = ctx.createRadialGradient(x, m.y, 0, x, m.y, m.r);
      g.addColorStop(0, `rgba(150,170,180,${a})`);
      g.addColorStop(0.6, `rgba(90,105,120,${a * 0.45})`);
      g.addColorStop(1, "rgba(60,70,80,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    }
    ctx.restore();
  }

  private drawEyes(ctx: CanvasRenderingContext2D, t: number) {
    const awaken = seg(t, 0.9, 1.2);
    if (awaken <= 0) return;
    const pulse = Math.sin(awaken * Math.PI); // bright pulse during awakening
    const idle = 0.55 + 0.12 * Math.sin(t * 7);
    const flash = Math.max(0, 1 - Math.abs(t - 2.9) / 0.18);
    const k = Math.max(pulse * 1.2, awaken >= 1 ? idle : awaken * idle) + flash * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    PLATES[this.opts.type].eyes.forEach((e, i) => {
      const p = P(e.x, e.y);
      const r = e.r * PLATE_SCALE;
      const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
      core.addColorStop(0, `rgba(255,190,170,${clamp(0.9 * k)})`);
      core.addColorStop(0.25, `rgba(230,30,20,${clamp(0.85 * k)})`);
      core.addColorStop(1, "rgba(120,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(p.x - r * 2.2, p.y - r * 2.2, r * 4.4, r * 4.4);
      if (i < 2) {
        // reflection on the surrounding bronze medallion
        const R = r * 7;
        const refl = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, R);
        refl.addColorStop(0, `rgba(170,20,10,${clamp(0.28 * k)})`);
        refl.addColorStop(1, "rgba(80,0,0,0)");
        ctx.fillStyle = refl;
        ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
      }
    });
    ctx.restore();
  }

  private drawShimmer(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, sh: number) {
    const tc = this.textCanvas;
    const off = document.createElement("canvas");
    off.width = tc.width; off.height = tc.height;
    const o = off.getContext("2d")!;
    o.drawImage(tc, 0, 0);
    o.globalCompositeOperation = "source-in";
    const x = lerp(-0.3, 1.3, sh) * tc.width;
    const g = o.createLinearGradient(x - 70, 0, x + 70, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,250,225,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    o.fillStyle = g;
    o.fillRect(0, 0, off.width, off.height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(off, r.x, r.y);
    ctx.restore();
  }

  /** Raven rig: body + two wing segments rotated around shoulder pivots. */
  private drawRaven(ctx: CanvasRenderingContext2D, t: number, ext: { x0: number; x1: number; cy: number }, perchYSrc: number) {
    const perchY = P(0, perchYSrc).y + 4;
    const S = 0.32; // raven scale
    const CLAW = { x: 410, y: 600 }; // claw point in crow image space
    let x: number, y: number, rot = 0, flap = 0, fold = 0, headDip = 0, visible = true;

    const perchStart = { x: lerp(ext.x0, ext.x1, 0.05), y: perchY };
    if (t < 0.3) visible = false;
    else if (t < 0.9) {
      // arrival: arc in from top-right off-screen
      const k = easeOut(seg(t, 0.3, 0.9));
      const p0 = { x: CANVAS_W + 260, y: -220 }, p1 = { x: CANVAS_W * 0.55, y: -60 }, p2 = perchStart;
      x = (1 - k) ** 2 * p0.x + 2 * (1 - k) * k * p1.x + k * k * p2.x;
      y = (1 - k) ** 2 * p0.y + 2 * (1 - k) * k * p1.y + k * k * p2.y;
      rot = lerp(-0.45, 0.05, k) + Math.sin(t * 30) * 0.04;
      flap = Math.sin(t * 52);
      fold = easeIn(seg(t, 0.78, 0.9));
    } else if (t < 3.3) {
      // perched; hop along the plate top while clawing during engraving
      const prog = easeInOut(seg(t, 1.2, 2.8));
      const hopPhase = (t - 1.2) * 5;
      const hop = t > 1.2 && t < 2.8 ? Math.abs(Math.sin(hopPhase * Math.PI)) * 7 : 0;
      x = lerp(perchStart.x, lerp(ext.x0, ext.x1, 0.92), prog);
      y = perchY - hop;
      const land = 1 - easeOut(seg(t, 0.9, 1.05));
      rot = 0.05 + land * 0.12;
      fold = 1;
      flap = land * Math.sin(t * 40) * 0.5;
      headDip = t > 1.2 && t < 2.8 ? 0.18 + Math.sin(t * 34) * 0.1 : 0;
      if (t > 2.75 && t < 3.0) headDip = 0.3 * Math.sin(seg(t, 2.75, 3.0) * Math.PI); // final strike
      if (t > 3.1) { fold = 1 - easeOut(seg(t, 3.1, 3.3)); flap = Math.sin(t * 30) * (1 - fold); }
    } else {
      // exit: strong beat, up and away to the top-left
      const k = easeIn(seg(t, 3.3, 4.3));
      const sx = lerp(ext.x0, ext.x1, 0.92);
      x = lerp(sx, -320, k) + Math.sin(k * 3) * 40;
      y = lerp(perchY, -260, Math.pow(seg(t, 3.3, 4.3), 0.8)) - Math.sin(seg(t, 3.3, 3.5) * Math.PI) * 30;
      rot = lerp(-0.1, -0.5, k);
      flap = Math.sin((t - 3.3) * 44 + 1.5);
      if (t > 4.4) visible = false;
      if (!this.feathersSpawned) {
        this.feathersSpawned = true;
        for (let i = 0; i < 9; i++) this.parts.push({ x: sx + (this.rnd() - 0.5) * 80, y: perchY - 60 + (this.rnd() - 0.5) * 60, vx: (this.rnd() - 0.5) * 70, vy: -30 - this.rnd() * 40, life: 0, max: 2 + this.rnd() * 0.8, kind: "feather", rot: this.rnd() * 6, vr: (this.rnd() - 0.5) * 3, size: 14 + this.rnd() * 12 });
      }
    }
    if (!visible) return;
    const crow = this.assets.crow;
    ctx.save();
    ctx.translate(x!, y!);
    ctx.rotate(rot + headDip * 0.5);
    ctx.scale(S, S);
    ctx.translate(-CLAW.x, -CLAW.y);
    // soft shadow-ish glow so the bird reads over dark backgrounds
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 20;

    const wingAngle = flap * 0.75;
    const wingFold = lerp(1, 0.5, fold);
    const foldRot = fold * 0.9;
    // left wing (viewer's left)
    this.drawWing(ctx, crow, { sx: 40, sw: 330 }, { x: 350, y: 250 }, -wingAngle - foldRot, wingFold);
    this.drawWing(ctx, crow, { sx: 460, sw: 330 }, { x: 466, y: 250 }, wingAngle + foldRot, wingFold);
    // body (head + torso + tail)
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(318, 0, 182, 816);
    ctx.clip();
    if (headDip) {
      // draw torso, then head separately tipped forward
      ctx.save(); ctx.beginPath(); ctx.rect(318, 230, 182, 600); ctx.clip();
      ctx.drawImage(crow, 0, 0); ctx.restore();
      ctx.save(); ctx.translate(420, 240); ctx.rotate(headDip); ctx.translate(-420, -240);
      ctx.beginPath(); ctx.rect(318, 0, 182, 250); ctx.clip(); ctx.drawImage(crow, 0, 0); ctx.restore();
    } else {
      ctx.drawImage(crow, 0, 0);
    }
    ctx.restore();
    ctx.restore();
  }

  private drawWing(ctx: CanvasRenderingContext2D, img: HTMLImageElement, src: { sx: number; sw: number }, pivot: { x: number; y: number }, angle: number, sx: number) {
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(angle);
    ctx.scale(sx, 1);
    ctx.translate(-pivot.x, -pivot.y);
    ctx.beginPath();
    ctx.rect(src.sx, 0, src.sw, 816);
    ctx.clip();
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  private updateParticles(ctx: CanvasRenderingContext2D, dt: number, t: number) {
    // impact burst
    if (t >= 2.8 && t - dt < 2.8) {
      const ext = this.textExtent();
      for (let i = 0; i < 70; i++) {
        const a = this.rnd() * Math.PI * 2, sp = 150 + this.rnd() * 500;
        this.parts.push({ x: ext.x1, y: ext.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.4 + this.rnd() * 0.6, kind: "spark", rot: 0, vr: 0, size: 1.2 + this.rnd() * 2 });
      }
    }
    ctx.save();
    this.parts = this.parts.filter((p) => (p.life += dt) < p.max);
    for (const p of this.parts) {
      const k = p.life / p.max;
      if (p.kind === "spark") {
        p.vy += 900 * dt; p.vx *= 0.98;
        const px = p.x, py = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(255,${Math.round(220 - k * 120)},${Math.round(140 - k * 120)},${1 - k})`;
        ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke();
      } else {
        p.vy = lerp(p.vy, 45, dt * 1.5);
        p.x += (p.vx + Math.sin(p.life * 3 + p.rot) * 50) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.globalCompositeOperation = "source-over";
        this.drawFeather(ctx, p.x, p.y, p.size, p.rot + Math.sin(p.life * 3) * 0.6, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      }
    }
    ctx.restore();
  }

  private drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: number, a: number) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(r); ctx.globalAlpha *= a;
    const g = ctx.createLinearGradient(-s, 0, s, 0);
    g.addColorStop(0, "#05060a"); g.addColorStop(0.5, "#1c2433"); g.addColorStop(1, "#05060a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.45, -s * 0.5, s * 0.35, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.35, s * 0.6, -s * 0.45, -s * 0.5, 0, -s);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,140,170,0.6)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.25); ctx.stroke();
    ctx.restore();
  }
}
