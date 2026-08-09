import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Bookmark } from '../objects/Bookmark.jsx';
import { Dust } from '../objects/Dust.jsx';
import { glint } from '../../lib/textures.js';
import { useQuality } from '../../hooks/useTier.js';
import { scroll } from '../../lib/scroll.js';
import { ANCHORS } from '../../lib/timeline.js';
import { range, clamp, lerp, damp, easeOutCubic, TAU } from '../../lib/math.js';

/**
 * Scene 7 — the return.
 *
 * Everything is taken away except the object and a single overhead light. The
 * plinth ring counts the journey back down to nothing, and the same bookmark
 * from the desk in scene one is the last thing left on screen.
 */
export function FinaleScene() {
  const quality = useQuality();
  const group = useRef();
  const mark = useRef();
  const halo = useRef();
  const plinth = useRef();
  const spot = useRef();
  const chargeRef = useRef(0);
  const ringsRef = useRef([]);

  const glintTex = useMemo(() => glint(), []);

  useFrame((state, dt) => {
    const p = scroll.smooth;
    const t = state.clock.elapsedTime;
    const alive = range(p, 0.9, 0.945);
    const settle = easeOutCubic(range(p, 0.93, 0.99));

    chargeRef.current = damp(chargeRef.current, clamp(alive), 4, dt);

    if (group.current) group.current.visible = alive > 0.004;
    if (mark.current) {
      mark.current.rotation.y = t * 0.18;
      mark.current.position.y = lerp(-0.5, 0, settle) + Math.sin(t * 0.6) * 0.02;
      mark.current.scale.setScalar(lerp(1.1, 1.55, settle));
    }
    if (halo.current?.material) {
      halo.current.material.opacity = alive * 0.34;
      halo.current.scale.setScalar(lerp(1.6, 2.6, settle));
    }
    if (plinth.current?.material) plinth.current.material.opacity = alive * 0.4;
    if (spot.current) spot.current.intensity = damp(spot.current.intensity, alive * 34, 4, dt);

    ringsRef.current.forEach((r, i) => {
      if (!r) return;
      const phase = (t * 0.16 + i / ringsRef.current.length) % 1;
      r.scale.setScalar(0.6 + phase * 2.6);
      r.rotation.z = t * 0.05 * (i % 2 ? 1 : -1);
      if (r.material) r.material.opacity = (1 - phase) * phase * 1.4 * alive * 0.5;
    });
  });

  return (
    <group ref={group} position={ANCHORS.finale}>
      <group ref={mark}>
        <Bookmark charge={chargeRef.current} tilt={0.02} responsive scale={1.55} />
      </group>

      <mesh ref={halo} raycast={() => null}>
        <planeGeometry args={[3.2, 3.2]} />
        <meshBasicMaterial
          map={glintTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* slow rings, like something still listening */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            ringsRef.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.92, 0]}
          raycast={() => null}
        >
          <ringGeometry args={[0.6, 0.63, 64, 1, 0, TAU]} />
          <meshBasicMaterial
            color="#8fd6ff"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh
        ref={plinth}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.94, 0]}
        raycast={() => null}
      >
        <circleGeometry args={[2.6, 48]} />
        <meshBasicMaterial
          color="#1b4a6e"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <Dust
        count={Math.round(quality.dust * 0.3)}
        area={[5, 4, 4]}
        color="#bfe2ff"
        size={16}
        opacity={0.45}
        seed={219}
        visibleRange={[0.9, 1.001]}
        fade={0.12}
      />

      <spotLight
        ref={spot}
        position={[0.6, 4, 2.4]}
        angle={0.42}
        penumbra={0.95}
        intensity={0}
        distance={11}
        decay={2}
        color="#dceeff"
      />
      <pointLight
        position={[-1.6, 0.2, -1.4]}
        intensity={6}
        distance={7}
        decay={2}
        color="#3f7fbf"
      />
    </group>
  );
}
