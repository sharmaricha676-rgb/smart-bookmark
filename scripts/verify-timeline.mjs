/**
 * Timeline sanity checks.
 *
 * `src/lib/timeline.js` and `src/lib/math.js` are pure ES modules with no
 * browser or Three.js dependencies, so the spine of the whole experience can be
 * verified in plain Node — no bundler, no DOM, no GPU.
 *
 *   node scripts/verify-timeline.mjs
 */

import {
  SCENES,
  CAMERA_KEYS,
  MOODS,
  GATE_PROGRESS,
  SCROLL_VIEWPORTS,
  sampleCameraTrack,
  sceneIndexAt,
} from '../src/lib/timeline.js';
import {
  CHALLENGE_LINES,
  CHALLENGE_LAYOUT,
  CORRECT_INDEX,
  bandBounds,
} from '../src/lib/challenge.js';
import { clamp, range, smoothstep } from '../src/lib/math.js';

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const section = (name) => console.log(`\n${name}`);

/* -------------------------------------------------------------- scenes ---- */

section('Scenes');
check('seven scenes', SCENES.length === 7, `got ${SCENES.length}`);
check('starts at 0', SCENES[0].start === 0);
check('ends at 1', SCENES[SCENES.length - 1].end === 1);

let contiguous = true;
for (let i = 0; i < SCENES.length - 1; i++) {
  if (Math.abs(SCENES[i].end - SCENES[i + 1].start) > 1e-9) contiguous = false;
}
check('windows are contiguous — no dead scroll between scenes', contiguous);
check(
  'every scene has positive length',
  SCENES.every((s) => s.end > s.start)
);
check(
  'sceneIndexAt resolves every scene',
  SCENES.every((s, i) => sceneIndexAt((s.start + s.end) / 2) === i)
);
check('sceneIndexAt(0) is the library', sceneIndexAt(0) === 0);
check('sceneIndexAt(1) is the finale', sceneIndexAt(1) === SCENES.length - 1);

/* ------------------------------------------------------------ the gate ---- */

section('Challenge gate');
const challenge = SCENES[4];
check(
  'gate sits inside the challenge scene',
  GATE_PROGRESS > challenge.start && GATE_PROGRESS < challenge.end,
  `gate ${GATE_PROGRESS} vs ${challenge.start}–${challenge.end}`
);
// The 3D hit-zones go live at 0.705 and the copy appears at 0.708.
check('gate is past the point where the lines become clickable', GATE_PROGRESS > 0.705);
check('scroll length is sane', SCROLL_VIEWPORTS >= 6 && SCROLL_VIEWPORTS <= 20);

/* --------------------------------------------------------- camera keys ---- */

section('Camera keyframes');
check('first key is at progress 0', CAMERA_KEYS[0].p === 0);
check('last key is at progress 1', CAMERA_KEYS[CAMERA_KEYS.length - 1].p === 1);

let monotonic = true;
let badKey = '';
for (let i = 0; i < CAMERA_KEYS.length - 1; i++) {
  if (CAMERA_KEYS[i + 1].p <= CAMERA_KEYS[i].p) {
    monotonic = false;
    badKey = `index ${i} (${CAMERA_KEYS[i].p}) -> ${CAMERA_KEYS[i + 1].p}`;
  }
}
check('keyframe progress is strictly increasing', monotonic, badKey);

check(
  'every key is fully specified',
  CAMERA_KEYS.every(
    (k) =>
      Array.isArray(k.pos) &&
      k.pos.length === 3 &&
      Array.isArray(k.look) &&
      k.look.length === 3 &&
      Number.isFinite(k.roll) &&
      Number.isFinite(k.fov) &&
      k.pos.every(Number.isFinite) &&
      k.look.every(Number.isFinite)
  )
);
check(
  'field of view stays in a comfortable range',
  CAMERA_KEYS.every((k) => k.fov >= 30 && k.fov <= 75)
);
check(
  'the camera never looks at exactly where it stands',
  CAMERA_KEYS.every((k) => Math.hypot(...k.pos.map((v, i) => v - k.look[i])) > 0.5)
);
check(
  'every shot travels forward through the world',
  CAMERA_KEYS.every((k) => k.look[2] < k.pos[2] + 0.001)
);

/* -------------------------------------------------- the progress mapping -- */

section('Progress mapping');
const STEPS = 4000;
let uMonotonic = true;
let maxUStep = 0;
let prev = sampleCameraTrack(0, smoothstep);
check('u starts at 0', Math.abs(prev.u) < 1e-9, `got ${prev.u}`);

for (let i = 1; i <= STEPS; i++) {
  const p = i / STEPS;
  const s = sampleCameraTrack(p, smoothstep);
  if (!Number.isFinite(s.u) || !Number.isFinite(s.fov) || !Number.isFinite(s.roll)) {
    uMonotonic = false;
    break;
  }
  if (s.u < prev.u - 1e-9) uMonotonic = false;
  maxUStep = Math.max(maxUStep, s.u - prev.u);
  prev = s;
}
check('u never goes backwards as you scroll forward', uMonotonic);
check('u reaches 1 at the end', Math.abs(prev.u - 1) < 1e-6, `got ${prev.u}`);
// One 1/4000th step should never cover more than a small slice of the curve;
// a large jump would show up on screen as the camera teleporting.
check('no discontinuity in the camera path', maxUStep < 0.01, `max step ${maxUStep.toFixed(5)}`);

check(
  'each keyframe lands on the progress it was authored for',
  CAMERA_KEYS.every((k, i) => {
    const { u } = sampleCameraTrack(k.p, smoothstep);
    return Math.abs(u - i / (CAMERA_KEYS.length - 1)) < 1e-6;
  })
);

/* -------------------------------------------------------------- moods ----- */

section('Lighting moods');
check('mood stops start at 0 and end at 1', MOODS[0].p === 0 && MOODS[MOODS.length - 1].p === 1);
let moodsSorted = true;
for (let i = 0; i < MOODS.length - 1; i++) {
  if (MOODS[i + 1].p <= MOODS[i].p) moodsSorted = false;
}
check('mood stops are strictly increasing', moodsSorted);
check(
  'fog density always positive',
  MOODS.every((m) => m.density > 0 && m.density < 0.2)
);
check(
  'colours are parseable hex',
  MOODS.every((m) => /^#[0-9a-f]{6}$/i.test(m.fog) && /^#[0-9a-f]{6}$/i.test(m.ambient))
);

/* ---------------------------------------------------- reading challenge ---- */

section('Reading challenge');
check(
  'exactly one correct line',
  CHALLENGE_LINES.filter((l) => l.correct).length === 1,
  `got ${CHALLENGE_LINES.filter((l) => l.correct).length}`
);
check('CORRECT_INDEX resolves', CORRECT_INDEX >= 0 && CHALLENGE_LINES[CORRECT_INDEX].correct);
check(
  'every line has text and a written response',
  CHALLENGE_LINES.every((l) => l.text?.trim() && l.note?.trim())
);
check(
  'no two lines share the same text (they are used as React keys)',
  new Set(CHALLENGE_LINES.map((l) => l.text)).size === CHALLENGE_LINES.length
);

const bounds = CHALLENGE_LINES.map((_, i) => bandBounds(i));
check(
  'every clickable band sits inside the page',
  bounds.every((b) => b.top >= 0 && b.bottom <= CHALLENGE_LAYOUT.height),
  `first ${bounds[0].top.toFixed(0)}, last ${bounds[bounds.length - 1].bottom.toFixed(0)} of ${CHALLENGE_LAYOUT.height}`
);
let overlapping = false;
for (let i = 0; i < bounds.length - 1; i++) {
  if (bounds[i].bottom > bounds[i + 1].top) overlapping = true;
}
check('no two bands overlap — a click is never ambiguous', !overlapping);
check(
  'bands leave room for the two-line wrap',
  CHALLENGE_LAYOUT.lineHeight >= CHALLENGE_LAYOUT.wrapLead * 2,
  `lineHeight ${CHALLENGE_LAYOUT.lineHeight} vs wrap ${CHALLENGE_LAYOUT.wrapLead * 2}`
);
check(
  'text starts below the running head',
  CHALLENGE_LAYOUT.top > 200 && CHALLENGE_LAYOUT.marginX > 0
);

/* ------------------------------------------------------------- helpers ---- */

section('Math helpers');
check('clamp bounds both ends', clamp(-5) === 0 && clamp(5) === 1 && clamp(0.5) === 0.5);
check('range is normalised and clamped', range(5, 0, 10) === 0.5 && range(-1, 0, 10) === 0);
check('range survives a zero-width interval', Number.isFinite(range(1, 2, 2)));
check('smoothstep is pinned at both ends', smoothstep(0) === 0 && smoothstep(1) === 1);

/* -------------------------------------------------------------------------- */

console.log(
  failures === 0 ? '\nAll timeline checks passed.\n' : `\n${failures} check(s) failed.\n`
);
process.exit(failures ? 1 : 0);
