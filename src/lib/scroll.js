/**
 * Scroll engine.
 *
 * A single mutable object drives the whole experience. React never re-renders
 * on scroll — the 3D scene reads `scroll.smooth` inside useFrame and the DOM
 * overlay reads it inside one shared rAF loop. That keeps 60fps text fades and
 * camera motion without a single component update per frame.
 */

import { clamp, damp } from './math.js';

export const scroll = {
  /** Raw normalised scroll position (0..1), straight from the page. */
  raw: 0,
  /** Damped value that everything visual reads. */
  smooth: 0,
  /** Signed scroll velocity, used for motion accents. */
  velocity: 0,
  /** Set true once the user has scrolled at all. */
  engaged: false,
};

const subscribers = new Set();
let rafId = null;
let last = 0;

/** Subscribe a callback to the shared animation loop: cb(progress, dt, velocity). */
export function onScrollTick(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
  last = now;

  const prev = scroll.smooth;
  scroll.smooth = damp(scroll.smooth, scroll.raw, 6.5, dt);
  // Snap when close enough so we never idle on a fractional value.
  if (Math.abs(scroll.raw - scroll.smooth) < 0.00002) scroll.smooth = scroll.raw;
  scroll.velocity = damp(scroll.velocity, (scroll.smooth - prev) / (dt || 0.016), 8, dt);

  for (const cb of subscribers) cb(scroll.smooth, dt, scroll.velocity);
}

export function startScrollLoop() {
  if (rafId === null) {
    last = 0;
    rafId = requestAnimationFrame(loop);
  }
  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };
}

export function setRawProgress(p) {
  const next = clamp(p);
  if (!scroll.engaged && next > 0.001) scroll.engaged = true;
  scroll.raw = next;
}

export function resetScrollState() {
  scroll.raw = 0;
  scroll.smooth = 0;
  scroll.velocity = 0;
}
