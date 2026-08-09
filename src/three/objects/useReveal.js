import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { scroll } from '../../lib/scroll.js';
import { range, clamp, easeOutCubic, damp } from '../../lib/math.js';

/**
 * Turns a four-point scroll window into a damped 0..1 value.
 *
 * [in, full, holdUntil, out] — the extra hold point is what lets a station stay
 * fully present while the camera passes it instead of peaking for one frame.
 * Returned as a ref so reading it never triggers a render.
 */
export function useReveal([a, b, c, d], lambda = 6) {
  const value = useRef(0);
  useFrame((_, dt) => {
    const t = scroll.smooth;
    const inn = easeOutCubic(range(t, a, b));
    const out = 1 - easeOutCubic(range(t, c, d));
    value.current = damp(value.current, clamp(Math.min(inn, out)), lambda, dt);
  });
  return value;
}
