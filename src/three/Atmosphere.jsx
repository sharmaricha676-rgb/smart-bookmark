import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { MOODS } from '../lib/timeline.js';
import { clamp, lerp, smoothstep, damp } from '../lib/math.js';
import { scroll } from '../lib/scroll.js';
import { useQuality } from '../hooks/useTier.js';

/**
 * Global lighting mood.
 *
 * Fog colour, fog density and ambient tone are cross-faded along the timeline.
 * Because fog is what the far end of every scene dissolves into, moving it is
 * what makes one environment become the next instead of cutting to it.
 */
export function Atmosphere() {
  const { scene } = useThree();
  const quality = useQuality();
  const ambient = useRef();

  const stops = useMemo(
    () =>
      MOODS.map((m) => ({
        p: m.p,
        fog: new THREE.Color(m.fog),
        density: m.density,
        ambient: new THREE.Color(m.ambient),
        ambientI: m.ambientI,
      })),
    []
  );

  const fog = useMemo(() => {
    const f = new THREE.FogExp2(stops[0].fog.getHex(), stops[0].density);
    scene.fog = f;
    scene.background = new THREE.Color('#04050a');
    return f;
  }, [scene, stops]);

  const tmpA = useMemo(() => new THREE.Color(), []);
  const tmpB = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const p = scroll.smooth;
    let i = 0;
    while (i < stops.length - 2 && p > stops[i + 1].p) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const t = smoothstep(clamp((p - a.p) / (b.p - a.p || 1e-6)));

    tmpA.copy(a.fog).lerp(b.fog, t);
    fog.color.lerp(tmpA, 1 - Math.exp(-6 * Math.min(dt, 0.1)));
    fog.density = damp(fog.density, lerp(a.density, b.density, t), 5, dt);
    if (scene.background?.isColor) scene.background.lerp(tmpA, 0.12);

    if (ambient.current) {
      tmpB.copy(a.ambient).lerp(b.ambient, t);
      ambient.current.color.lerp(tmpB, 0.12);
      ambient.current.intensity = damp(
        ambient.current.intensity,
        lerp(a.ambientI, b.ambientI, t),
        5,
        dt
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.55} color="#4a3a28" />
      {/* A quiet hemisphere keeps undersides from going pure black. */}
      <hemisphereLight args={['#7d93b8', '#1a120a', 0.35]} />

      {/* Reflections come from a hand-built rig, so nothing is fetched at runtime. */}
      <Environment resolution={quality.envResolution} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#ffd9a8"
          scale={[8, 4, 1]}
          position={[-6, 4, -4]}
          rotation={[0, Math.PI / 2.4, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#9ec9ff"
          scale={[10, 5, 1]}
          position={[7, 3, 3]}
          rotation={[0, -Math.PI / 2.6, 0]}
        />
        <Lightformer
          form="circle"
          intensity={2.2}
          color="#ffffff"
          scale={[4, 4, 1]}
          position={[0, 8, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.1}
          color="#6fc9ff"
          scale={[6, 6, 1]}
          position={[0, -3, -6]}
        />
      </Environment>
    </>
  );
}
