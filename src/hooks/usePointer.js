/**
 * Normalised pointer position, damped.
 *
 * Kept outside React on purpose: the camera, the bookmark and the particle
 * fields all read the same damped values every frame without any re-renders.
 * On touch devices it falls back to device orientation, and to zero if neither
 * is available — so nothing ever depends on a mouse existing.
 */

import { damp } from '../lib/math.js';

export const pointer = {
  /** Raw target in -1..1 */
  tx: 0,
  ty: 0,
  /** Damped values everything should read. */
  x: 0,
  y: 0,
  /** True while the pointer is over an interactive object. */
  hovering: false,
};

let bound = false;

export function bindPointer() {
  if (bound || typeof window === 'undefined') return () => {};
  bound = true;

  const onMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  const onTouch = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    pointer.tx = (t.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((t.clientY / window.innerHeight) * 2 - 1);
  };
  const onLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  const onTilt = (e) => {
    if (e.gamma == null || e.beta == null) return;
    pointer.tx = Math.max(-1, Math.min(1, e.gamma / 35));
    pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  window.addEventListener('deviceorientation', onTilt);

  return () => {
    bound = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('touchmove', onTouch);
    window.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    window.removeEventListener('deviceorientation', onTilt);
  };
}

/** Call once per frame, before anything reads `pointer.x` / `pointer.y`. */
export function updatePointer(dt) {
  pointer.x = damp(pointer.x, pointer.tx, 3.4, dt);
  pointer.y = damp(pointer.y, pointer.ty, 3.4, dt);
}
