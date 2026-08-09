/**
 * Procedural texture factory.
 *
 * The whole experience ships with zero binary assets — every label, page,
 * cover and particle sprite is drawn to a 2D canvas at runtime and cached.
 * That keeps the bundle tiny and means text is always crisp on any DPR.
 */

import * as THREE from 'three';
import { CHALLENGE_LINES, CHALLENGE_LAYOUT } from './challenge.js';

const cache = new Map();

const memo = (key, make) => {
  if (cache.has(key)) return cache.get(key);
  const tex = make();
  cache.set(key, tex);
  return tex;
};

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(canvas, { srgb = true, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

const UI_FONT =
  '"Inter", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF_FONT = 'Georgia, "Times New Roman", "Iowan Old Style", serif';

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Wrap text to a pixel width, returning an array of lines. */
function wrap(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* -------------------------------------------------------------------------- */
/* Particles                                                                   */
/* -------------------------------------------------------------------------- */

/** Soft radial sprite for dust and particle systems. */
export const softCircle = () =>
  memo('softCircle', () => {
    const s = 128;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return finish(c, { srgb: false, aniso: 1 });
  });

/** Thin four-point glint, used for the bookmark's activation sparkle. */
export const glint = () =>
  memo('glint', () => {
    const s = 256;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');
    ctx.translate(s / 2, s / 2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(180,220,255,0.18)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      const lg = ctx.createLinearGradient(-s / 2, 0, s / 2, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.75)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-s / 2, -1.5, s, 3);
      ctx.restore();
    }
    return finish(c, { srgb: false, aniso: 1 });
  });

/* -------------------------------------------------------------------------- */
/* Paper                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A printed page: warm paper grain plus ragged justified "text" lines.
 * `variant` reshuffles the line lengths so no two pages look identical.
 */
export const pageTexture = (variant = 0, opts = {}) =>
  memo(`page:${variant}:${JSON.stringify(opts)}`, () => {
    const { tint = '#efe6d4', ink = 'rgba(52,44,34,0.72)', density = 1 } = opts;
    const w = 512;
    const h = 640;
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, tint);
    bg.addColorStop(0.55, '#f6efe0');
    bg.addColorStop(1, '#e4d8c2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // fibre grain
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#8a7c62';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1);
    }
    ctx.globalAlpha = 1;

    // body copy
    const marginX = 62;
    const maxW = w - marginX * 2;
    let y = 96;
    const lh = 21 / density;
    let seed = variant * 9301 + 49297;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    ctx.fillStyle = ink;
    while (y < h - 80) {
      const isParaEnd = rnd() > 0.86;
      const lw = isParaEnd ? maxW * (0.34 + rnd() * 0.4) : maxW * (0.94 + rnd() * 0.06);
      ctx.globalAlpha = 0.62 + rnd() * 0.3;
      // draw as a few word-blocks rather than a solid bar so it reads as type
      let x = marginX;
      while (x < marginX + lw) {
        const word = Math.min(14 + rnd() * 52, marginX + lw - x);
        ctx.fillRect(x, y, word, 5.2);
        x += word + 8;
      }
      y += lh;
      if (isParaEnd) y += lh * 0.7;
    }
    ctx.globalAlpha = 1;

    // gutter shading
    const sh = ctx.createLinearGradient(0, 0, 70, 0);
    sh.addColorStop(0, 'rgba(60,44,26,0.42)');
    sh.addColorStop(1, 'rgba(60,44,26,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, 70, h);

    return finish(c);
  });

/** Cloth-bound book cover with a blind-stamped rule. */
export const coverTexture = (hue = 20, variant = 0) =>
  memo(`cover:${hue}:${variant}`, () => {
    const w = 256;
    const h = 384;
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    const base = `hsl(${hue}, ${18 + (variant % 3) * 6}%, ${13 + (variant % 4) * 3}%)`;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = `hsla(${hue + 18}, 40%, 62%, 0.35)`;
    ctx.lineWidth = 2;
    roundRect(ctx, 18, 22, w - 36, h - 44, 4);
    ctx.stroke();

    ctx.fillStyle = `hsla(${hue + 20}, 45%, 66%, 0.5)`;
    ctx.fillRect(46, 78, w - 92, 4);
    ctx.fillRect(46, h - 110, w - 130, 3);
    return finish(c);
  });

/* -------------------------------------------------------------------------- */
/* Holographic UI                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The look shared by every projected panel in the experience: hairline frame,
 * faint grid, corner ticks, and a small eyebrow label. Content is drawn by the
 * caller through the `draw` callback so panels stay visually consistent.
 */
function holoBase(w, h, { eyebrow, accent = '#7fd4ff', tone = 'cool' }, draw) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const wash = ctx.createLinearGradient(0, 0, 0, h);
  if (tone === 'warm') {
    wash.addColorStop(0, 'rgba(60,40,22,0.5)');
    wash.addColorStop(1, 'rgba(24,16,10,0.26)');
  } else {
    wash.addColorStop(0, 'rgba(16,34,58,0.55)');
    wash.addColorStop(1, 'rgba(6,12,24,0.28)');
  }
  ctx.fillStyle = wash;
  roundRect(ctx, 6, 6, w - 12, h - 12, 14);
  ctx.fill();

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 30; x < w - 20; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, h - 14);
    ctx.stroke();
  }
  for (let y = 30; y < h - 20; y += 30) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(w - 14, y);
    ctx.stroke();
  }

  // frame + corner ticks
  ctx.strokeStyle = 'rgba(190,225,255,0.34)';
  ctx.lineWidth = 2;
  roundRect(ctx, 6, 6, w - 12, h - 12, 14);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  const t = 26;
  const corners = [
    [6, 6, 1, 1],
    [w - 6, 6, -1, 1],
    [6, h - 6, 1, -1],
    [w - 6, h - 6, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * t, cy);
    ctx.lineTo(cx + sx * 12, cy);
    ctx.moveTo(cx, cy + sy * t);
    ctx.lineTo(cx, cy + sy * 12);
    ctx.stroke();
  }

  if (eyebrow) {
    ctx.font = `600 17px ${UI_FONT}`;
    ctx.fillStyle = accent;
    ctx.letterSpacing = '3px';
    ctx.fillText(eyebrow.toUpperCase(), 34, 50);
    ctx.letterSpacing = '0px';
  }

  draw(ctx, w, h);

  // scanlines last, over everything
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#cfe9ff';
  for (let y = 12; y < h - 12; y += 4) ctx.fillRect(14, y, w - 28, 1);
  ctx.globalAlpha = 1;

  return finish(c);
}

/** Feature panel: eyebrow, title, one-line body, and a small progress rule. */
export const featurePanel = (eyebrow, title, body, accent = '#7fd4ff') =>
  memo(`feat:${title}`, () =>
    holoBase(720, 400, { eyebrow, accent }, (ctx, w) => {
      ctx.font = `600 52px ${UI_FONT}`;
      ctx.fillStyle = '#f2f7ff';
      const titleLines = wrap(ctx, title, w - 72);
      let y = 132;
      for (const line of titleLines) {
        ctx.fillText(line, 34, y);
        y += 58;
      }

      ctx.font = `400 27px ${UI_FONT}`;
      ctx.fillStyle = 'rgba(214,232,252,0.78)';
      y += 12;
      for (const line of wrap(ctx, body, w - 96)) {
        ctx.fillText(line, 34, y);
        y += 36;
      }

      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(34, 84, 78, 3);
      ctx.globalAlpha = 1;
    })
  );

/** Small readout used around the bookmark during activation. */
export const holoChip = (label, value, accent = '#7fd4ff') =>
  memo(`chip:${label}:${value}`, () =>
    holoBase(360, 200, { eyebrow: label, accent }, (ctx) => {
      ctx.font = `600 62px ${UI_FONT}`;
      ctx.fillStyle = '#eef6ff';
      ctx.fillText(value, 32, 132);
    })
  );

/**
 * A single floating word. The size is fitted to the canvas so a long phrase
 * shrinks instead of running off the edge.
 */
export const wordTexture = (word, color = '#cbb894') =>
  memo(`word:${word}:${color}`, () => {
    const w = 512;
    const h = 128;
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');

    let size = 64;
    do {
      ctx.font = `500 ${size}px ${SERIF_FONT}`;
      if (ctx.measureText(word).width <= w - 48) break;
      size -= 3;
    } while (size > 16);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(word, w / 2, h / 2 + 2);
    return finish(c);
  });

/** Crumpled sticky note for the "scattered notes" motif. */
export const stickyNote = (variant = 0) =>
  memo(`sticky:${variant}`, () => {
    const s = 128;
    const c = createCanvas(s, s);
    const ctx = c.getContext('2d');
    const hues = ['#e8d879', '#e2a0a0', '#9fd7c4', '#d9c3e8'];
    ctx.fillStyle = hues[variant % hues.length];
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 5; i++) ctx.fillRect(14, 34 + i * 16, s - 28 - Math.random() * 40, 3);
    ctx.globalAlpha = 0.22;
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 1;
    return finish(c);
  });

/* -------------------------------------------------------------------------- */
/* The reading challenge page                                                  */
/* -------------------------------------------------------------------------- */

export const challengePage = () =>
  memo('challengePage', () => {
    const { width: w, height: h, top, lineHeight, marginX, fontSize, wrapLead } = CHALLENGE_LAYOUT;
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#f7f0e0');
    bg.addColorStop(1, '#e6dac2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#8b7c60';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(70,56,38,0.55)';
    ctx.font = `600 26px ${UI_FONT}`;
    ctx.letterSpacing = '6px';
    ctx.fillText('CHAPTER FOUR · WHAT STAYS', marginX, 150);
    ctx.letterSpacing = '0px';

    ctx.strokeStyle = 'rgba(70,56,38,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, 186);
    ctx.lineTo(w - marginX, 186);
    ctx.stroke();

    ctx.font = `400 ${fontSize}px ${SERIF_FONT}`;
    ctx.fillStyle = '#2f2721';
    CHALLENGE_LINES.forEach((line, i) => {
      const y = top + i * lineHeight;
      const lines = wrap(ctx, line.text, w - marginX * 2);
      lines.forEach((l, j) => ctx.fillText(l, marginX, y + j * wrapLead));
    });

    ctx.fillStyle = 'rgba(70,56,38,0.4)';
    ctx.font = `400 24px ${SERIF_FONT}`;
    ctx.fillText('— 41 —', w / 2 - 30, h - 70);

    return finish(c);
  });

export function disposeTextures() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}
