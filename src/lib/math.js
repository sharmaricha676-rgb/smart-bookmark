/**
 * Small math helpers used across the experience.
 * Everything here is allocation-free so it is safe to call inside useFrame.
 */

export const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

export const lerp = (a, b, t) => a + (b - a) * t;

/** Normalised position of `v` inside [a, b], clamped to 0..1. */
export const range = (v, a, b) => clamp((v - a) / (b - a || 1e-6));

export const smoothstep = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/**
 * Frame-rate independent damping. `lambda` is roughly "how many e-folds per second".
 * Use instead of a raw lerp so motion feels identical at 60 and 120 Hz.
 */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 0.1)));

/** Cheap deterministic pseudo-random — same seed always gives the same layout. */
export const seeded = (seed) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
};

export const TAU = Math.PI * 2;
