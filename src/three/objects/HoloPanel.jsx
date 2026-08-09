import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scroll } from '../../lib/scroll.js';
import { range, clamp, easeOutCubic, damp } from '../../lib/math.js';
import { pointer } from '../../hooks/usePointer.js';

/**
 * A projected panel.
 *
 * Reveals by scaling out from a hairline: the panel opens horizontally first,
 * then fills in — the way a real projection would draw itself. It never just
 * fades in, which is what makes it read as hardware rather than a div.
 */
export function HoloPanel({
  texture,
  width = 1.44,
  height = 0.8,
  revealRange,
  parallax = 0.06,
  drift = 1,
  intensity = 1,
  billboardTo = null,
  ...props
}) {
  const group = useRef();
  const plane = useRef();
  const mat = useRef();
  const rule = useRef();

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    let reveal = 1;
    if (revealRange) {
      const [a, b, c, d] = revealRange;
      const inn = easeOutCubic(range(scroll.smooth, a, b));
      const out = 1 - easeOutCubic(range(scroll.smooth, c ?? 9, d ?? 9.1));
      reveal = clamp(Math.min(inn, out));
    }

    if (plane.current) {
      plane.current.scale.x = damp(plane.current.scale.x, 0.02 + reveal * 0.98, 9, dt);
      plane.current.scale.y = damp(
        plane.current.scale.y,
        0.02 + clamp((reveal - 0.25) / 0.75) * 0.98,
        7,
        dt
      );
    }
    if (mat.current) mat.current.opacity = reveal * intensity;
    if (rule.current?.material) {
      rule.current.material.opacity = reveal * 0.9;
      rule.current.scale.x = 0.05 + reveal * 0.95;
    }
    if (group.current) {
      group.current.position.x = damp(group.current.position.x, pointer.x * parallax, 2.5, dt);
      group.current.position.y = damp(
        group.current.position.y,
        Math.sin(t * 0.55) * 0.012 * drift + pointer.y * parallax * 0.6,
        2.5,
        dt
      );
      group.current.rotation.y = damp(
        group.current.rotation.y,
        pointer.x * 0.05 + Math.sin(t * 0.4) * 0.01 * drift,
        2.5,
        dt
      );
      if (billboardTo) group.current.lookAt(billboardTo);
      group.current.visible = reveal > 0.002;
    }
  });

  return (
    <group ref={group} {...props}>
      <mesh ref={plane} raycast={() => null}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={mat}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* projection base line */}
      <mesh ref={rule} position={[0, -height / 2 - 0.03, 0]} raycast={() => null}>
        <planeGeometry args={[width, 0.004]} />
        <meshBasicMaterial
          color="#8fd6ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
