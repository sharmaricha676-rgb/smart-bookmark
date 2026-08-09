/**
 * The single source of truth for the journey.
 *
 * Everything in the experience — camera, lighting, fog, objects, copy — reads
 * from one normalised progress value (0 at the top of the page, 1 at the end).
 * Scenes are *overlapping windows* on that value rather than discrete pages,
 * which is what keeps the whole thing feeling continuous.
 */

export const SCENES = [
  { id: 'library', label: 'The Library', start: 0.0, end: 0.135 },
  { id: 'problem', label: 'The Problem', start: 0.135, end: 0.3 },
  { id: 'activation', label: 'Activation', start: 0.3, end: 0.445 },
  { id: 'features', label: 'Capabilities', start: 0.445, end: 0.685 },
  { id: 'challenge', label: 'The Challenge', start: 0.685, end: 0.79 },
  { id: 'impact', label: 'Impact', start: 0.79, end: 0.9 },
  { id: 'finale', label: 'Remember', start: 0.9, end: 1.0 },
];

/**
 * Scroll is held here until the reading challenge is solved. Placed just after
 * the camera has settled on the book so the game is fully framed when it locks.
 */
export const GATE_PROGRESS = 0.752;

/** Total scroll length, in viewport heights. */
export const SCROLL_VIEWPORTS = 11;

/** World anchors — kept in one place so scenes and camera can never drift apart. */
export const ANCHORS = {
  desk: [0, 0, 0],
  chaosStart: -3,
  chaosEnd: -26,
  activation: [0, 1.35, -34],
  featureZ: [-42, -50, -58, -66, -74, -82],
  challenge: [0, 1.05, -95],
  impact: -118,
  finale: [0, 1.4, -137],
};

/**
 * Camera keyframes. `p` is timeline progress, `pos` the eye, `look` the target,
 * `roll` a banking angle in radians and `fov` the focal feel of the shot.
 *
 * Positions are smoothed with a Catmull-Rom curve, so these read as "shots"
 * rather than stops — the camera never actually pauses on one.
 */
export const CAMERA_KEYS = [
  // --- Scene 1 : the library -------------------------------------------------
  { p: 0.0, pos: [0.0, 1.82, 13.5], look: [0.0, 1.28, 0.0], roll: 0, fov: 52 },
  { p: 0.06, pos: [0.34, 1.62, 8.6], look: [0.0, 1.2, 0.0], roll: 0.01, fov: 52 },
  { p: 0.115, pos: [0.0, 1.36, 3.4], look: [0.0, 1.06, -0.4], roll: 0, fov: 50 },
  // --- Scene 2 : into the page ----------------------------------------------
  { p: 0.165, pos: [0.0, 1.1, 0.4], look: [0.0, 1.0, -4.0], roll: 0, fov: 58 },
  { p: 0.215, pos: [0.55, 1.05, -4.5], look: [-0.5, 1.0, -11.0], roll: 0.06, fov: 64 },
  { p: 0.265, pos: [-0.6, 1.16, -12.5], look: [0.5, 1.05, -19.0], roll: -0.075, fov: 66 },
  { p: 0.31, pos: [0.35, 1.2, -20.0], look: [0.0, 1.15, -27.0], roll: 0.045, fov: 62 },
  // --- Scene 3 : activation --------------------------------------------------
  { p: 0.375, pos: [0.0, 1.5, -28.6], look: [0.0, 1.35, -34.0], roll: 0, fov: 46 },
  { p: 0.445, pos: [0.0, 1.34, -30.4], look: [0.0, 1.35, -34.0], roll: 0, fov: 42 },
  // --- Scene 4 : capabilities corridor (camera weaves past each station) -----
  { p: 0.485, pos: [1.2, 1.34, -37.0], look: [-1.1, 1.3, -43.0], roll: -0.02, fov: 48 },
  { p: 0.525, pos: [-1.25, 1.3, -44.6], look: [1.15, 1.26, -50.6], roll: 0.02, fov: 48 },
  { p: 0.565, pos: [1.25, 1.32, -52.6], look: [-1.15, 1.28, -58.6], roll: -0.02, fov: 48 },
  { p: 0.605, pos: [-1.25, 1.3, -60.6], look: [1.15, 1.26, -66.6], roll: 0.02, fov: 48 },
  { p: 0.645, pos: [1.25, 1.32, -68.6], look: [-1.15, 1.28, -74.6], roll: -0.02, fov: 48 },
  { p: 0.685, pos: [-1.15, 1.3, -76.6], look: [1.05, 1.26, -82.6], roll: 0.02, fov: 48 },
  // --- Scene 5 : the reading challenge ---------------------------------------
  { p: 0.72, pos: [0.0, 1.34, -85.0], look: [0.0, 1.15, -92.0], roll: 0, fov: 46 },
  { p: 0.752, pos: [0.0, 1.2, -91.1], look: [0.0, 1.03, -95.0], roll: 0, fov: 40 },
  { p: 0.79, pos: [0.0, 1.22, -91.6], look: [0.0, 1.03, -95.0], roll: 0, fov: 40 },
  // --- Scene 6 : impact ------------------------------------------------------
  { p: 0.83, pos: [0.0, 2.6, -99.0], look: [0.0, 1.6, -106.0], roll: 0, fov: 50 },
  { p: 0.87, pos: [0.0, 10.5, -101.5], look: [0.0, 3.0, -118.0], roll: 0, fov: 56 },
  { p: 0.9, pos: [0.0, 16.0, -104.0], look: [0.0, 2.2, -126.0], roll: 0, fov: 58 },
  // --- Scene 7 : finale ------------------------------------------------------
  { p: 0.95, pos: [0.0, 4.4, -126.5], look: [0.0, 1.7, -136.0], roll: 0, fov: 46 },
  { p: 1.0, pos: [0.0, 1.46, -132.4], look: [0.0, 1.4, -137.0], roll: 0, fov: 38 },
];

/** Lighting / fog moods, cross-faded by progress. */
export const MOODS = [
  // p, fog colour, fog density, ambient colour, ambient intensity
  { p: 0.0, fog: '#0d0a07', density: 0.024, ambient: '#4a3a28', ambientI: 0.55 },
  { p: 0.13, fog: '#100c08', density: 0.03, ambient: '#5a452e', ambientI: 0.6 },
  { p: 0.24, fog: '#0a0d14', density: 0.062, ambient: '#2a3550', ambientI: 0.4 },
  { p: 0.32, fog: '#070a12', density: 0.05, ambient: '#22304d', ambientI: 0.35 },
  { p: 0.4, fog: '#05070d', density: 0.028, ambient: '#2b4666', ambientI: 0.5 },
  { p: 0.5, fog: '#05070e', density: 0.026, ambient: '#2c4260', ambientI: 0.55 },
  { p: 0.72, fog: '#06080f', density: 0.03, ambient: '#39496a', ambientI: 0.6 },
  { p: 0.87, fog: '#080b14', density: 0.016, ambient: '#4b5b7d', ambientI: 0.75 },
  { p: 0.96, fog: '#030407', density: 0.038, ambient: '#1e2c44', ambientI: 0.4 },
  { p: 1.0, fog: '#020304', density: 0.045, ambient: '#1a2740', ambientI: 0.35 },
];

/**
 * Maps timeline progress onto the camera curve.
 *
 * Keyframes sit at evenly spaced parameters along the Catmull-Rom curve, but
 * they are authored at uneven scroll positions — this is what reconciles the
 * two, so a keyframe always lands on exactly the progress it was written for
 * while the path itself stays smooth. Roll and field of view ride along.
 *
 * Pure and dependency-free so it can be reasoned about (and tested) on its own.
 */
export function sampleCameraTrack(p, ease = (t) => t * t * (3 - 2 * t)) {
  const n = CAMERA_KEYS.length;
  for (let i = 0; i < n - 1; i++) {
    const a = CAMERA_KEYS[i];
    const b = CAMERA_KEYS[i + 1];
    if (p <= b.p || i === n - 2) {
      const raw = (p - a.p) / (b.p - a.p || 1e-6);
      const t = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      const eased = ease(t);
      return {
        u: (i + eased) / (n - 1),
        roll: a.roll + (b.roll - a.roll) * eased,
        fov: a.fov + (b.fov - a.fov) * eased,
      };
    }
  }
  const last = CAMERA_KEYS[n - 1];
  return { u: 1, roll: last.roll, fov: last.fov };
}

export const sceneIndexAt = (p) => {
  for (let i = SCENES.length - 1; i >= 0; i--) {
    if (p >= SCENES[i].start) return i;
  }
  return 0;
};
