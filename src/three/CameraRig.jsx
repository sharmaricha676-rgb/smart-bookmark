import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CAMERA_KEYS, sampleCameraTrack } from '../lib/timeline.js';
import { clamp, smoothstep, damp } from '../lib/math.js';
import { scroll } from '../lib/scroll.js';
import { pointer, updatePointer } from '../hooks/usePointer.js';

/**
 * Drives the camera from one number.
 *
 * Keyframes are laid on a Catmull-Rom curve so the path is C1-continuous — the
 * camera is always already moving when it reaches a "shot", which is what stops
 * the journey feeling like a slideshow of stops. Progress is mapped to the
 * curve piecewise, so each keyframe still lands on exactly the scroll position
 * it was authored for.
 */
export function CameraRig() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const smoothed = useRef(new THREE.Vector3(...CAMERA_KEYS[0].pos));
  const smoothedLook = useRef(new THREE.Vector3(...CAMERA_KEYS[0].look));
  const fovRef = useRef(CAMERA_KEYS[0].fov);

  const { posCurve, lookCurve } = useMemo(() => {
    const toVec = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    return {
      posCurve: new THREE.CatmullRomCurve3(
        CAMERA_KEYS.map((k) => toVec(k.pos)),
        false,
        'catmullrom',
        0.4
      ),
      lookCurve: new THREE.CatmullRomCurve3(
        CAMERA_KEYS.map((k) => toVec(k.look)),
        false,
        'catmullrom',
        0.4
      ),
    };
  }, []);

  /** Timeline progress -> curve parameter, honouring each keyframe's own `p`. */
  const mapping = useMemo(() => (p) => sampleCameraTrack(p, smoothstep), []);

  useFrame((state, dt) => {
    updatePointer(dt);

    const p = scroll.smooth;
    const { u, roll, fov } = mapping(p);

    posCurve.getPoint(u, target.current);
    smoothed.current.lerp(target.current, 1 - Math.exp(-14 * Math.min(dt, 0.1)));

    lookCurve.getPoint(u, target.current);
    smoothedLook.current.lerp(target.current, 1 - Math.exp(-11 * Math.min(dt, 0.1)));

    camera.position.copy(smoothed.current);
    camera.up.set(0, 1, 0);
    camera.lookAt(smoothedLook.current);

    // Parallax: nudge the eye in its own screen plane, then re-aim. Reads as a
    // small handheld orbit around whatever the shot is holding.
    const amt = 0.19;
    camera.translateX(pointer.x * amt);
    camera.translateY(pointer.y * amt * 0.62);
    camera.lookAt(smoothedLook.current);
    if (roll !== 0) camera.rotateZ(roll);

    // A touch of focal breathing on fast scrolls, so speed is felt not just seen.
    const kick = clamp(Math.abs(scroll.velocity) * 4, 0, 1) * 3.4;
    fovRef.current = damp(fovRef.current, fov + kick, 6, dt);
    if (Math.abs(camera.fov - fovRef.current) > 0.01) {
      camera.fov = fovRef.current;
      camera.updateProjectionMatrix();
    }
  }, -1);

  return null;
}
