import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { damp, clamp } from '../../lib/math.js';
import { pointer } from '../../hooks/usePointer.js';

/**
 * The hero object.
 *
 * A slim anodised blade with a notched tail, a brushed metal face, an inlaid
 * light channel down the spine and a small lens at the head. `charge` (0..1)
 * drives everything that reads as "powered": emissive strength, the travelling
 * pulse in the channel, and the lens bloom.
 */
export function Bookmark({ charge = 0, tilt = 0.35, responsive = false, scale = 1, ...props }) {
  const group = useRef();
  const channel = useRef();
  const lens = useRef();
  const spineMat = useRef();
  const lensMat = useRef();
  const ring = useRef();
  const settled = useRef(false);

  const shape = useMemo(() => {
    // Outline of the blade, with the classic notched tail.
    const w = 0.115;
    const h = 0.68;
    const s = new THREE.Shape();
    const r = 0.028;
    s.moveTo(-w + r, h);
    s.lineTo(w - r, h);
    s.quadraticCurveTo(w, h, w, h - r);
    s.lineTo(w, -h + 0.16);
    s.lineTo(0, -h + 0.02); // notch
    s.lineTo(-w, -h + 0.16);
    s.lineTo(-w, h - r);
    s.quadraticCurveTo(-w, h, -w + r, h);
    return s;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
      curveSegments: 6,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, [shape]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const c = clamp(charge);

    if (group.current) {
      const targetTilt = tilt + (responsive ? pointer.y * 0.16 : 0);
      const targetYaw = responsive ? pointer.x * 0.42 : 0;
      // Snap to the resting attitude on the first frame — otherwise a bookmark
      // that starts lying flat in a book visibly swings down into place.
      if (!settled.current) {
        group.current.rotation.x = targetTilt;
        settled.current = true;
      }
      group.current.rotation.x = damp(group.current.rotation.x, targetTilt, 3, dt);
      group.current.rotation.y = damp(
        group.current.rotation.y,
        targetYaw + Math.sin(t * 0.4) * 0.06 * c,
        2.4,
        dt
      );
      group.current.position.y = damp(
        group.current.position.y,
        Math.sin(t * 0.8) * 0.022 * c,
        3,
        dt
      );
    }

    if (spineMat.current) {
      spineMat.current.emissiveIntensity = 0.15 + c * (2.4 + Math.sin(t * 2.1) * 0.35);
    }
    if (channel.current) {
      // travelling pulse down the light channel
      const travel = ((t * 0.55) % 1) * 1.24 - 0.62;
      channel.current.position.y = travel;
      channel.current.scale.y = 0.16 + c * 0.5;
      channel.current.visible = c > 0.05;
    }
    if (lensMat.current) {
      lensMat.current.emissiveIntensity = 0.2 + c * (3.4 + Math.sin(t * 3.4) * 0.6);
    }
    if (lens.current) {
      const s = 1 + c * 0.12 + Math.sin(t * 2.6) * 0.03 * c;
      lens.current.scale.setScalar(s);
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.6;
      ring.current.scale.setScalar(0.9 + c * 0.35);
      if (ring.current.material) ring.current.material.opacity = c * 0.5;
    }
  });

  return (
    <group ref={group} scale={scale} {...props}>
      {/* body */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#20262f"
          metalness={0.92}
          roughness={0.26}
          clearcoat={0.9}
          clearcoatRoughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* inlaid light channel */}
      <mesh position={[0, 0, 0.0175]}>
        <planeGeometry args={[0.026, 1.16]} />
        <meshStandardMaterial
          ref={spineMat}
          color="#0a1622"
          emissive="#6fc9ff"
          emissiveIntensity={0.2}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* travelling pulse inside the channel */}
      <mesh ref={channel} position={[0, 0, 0.019]}>
        <planeGeometry args={[0.026, 0.34]} />
        <meshBasicMaterial
          color="#dff3ff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* head lens */}
      <group ref={lens} position={[0, 0.5, 0.0195]}>
        <mesh>
          <circleGeometry args={[0.048, 24]} />
          <meshStandardMaterial
            ref={lensMat}
            color="#08131f"
            emissive="#8fe0ff"
            emissiveIntensity={0.2}
            roughness={0.15}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <ringGeometry args={[0.05, 0.058, 28]} />
          <meshStandardMaterial color="#c9d6e2" metalness={1} roughness={0.28} />
        </mesh>
      </group>

      {/* fine machined lines on the face */}
      {[-0.22, -0.3, -0.38].map((y, i) => (
        <mesh key={i} position={[0, y, 0.0176]}>
          <planeGeometry args={[0.07 - i * 0.016, 0.006]} />
          <meshStandardMaterial color="#5d6a78" metalness={0.9} roughness={0.4} />
        </mesh>
      ))}

      {/* soft halo that only exists when powered */}
      <mesh ref={ring} position={[0, 0, -0.02]} raycast={() => null}>
        <ringGeometry args={[0.22, 0.6, 48]} />
        <meshBasicMaterial
          color="#6fc9ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
