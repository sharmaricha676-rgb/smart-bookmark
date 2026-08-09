import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { pageTexture, coverTexture } from '../../lib/textures.js';
import { clamp } from '../../lib/math.js';

/**
 * Builds a single page: a plane that curls up toward the gutter and sags at the
 * outer edge, the way a real page under its own weight does. `side` is -1 for
 * the left leaf and +1 for the right.
 */
export function makePageGeometry(width, height, segments, side, curl = 0.09) {
  const geo = new THREE.PlaneGeometry(width, height, segments, Math.max(2, segments >> 1));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // u = 0 at the gutter, 1 at the outer edge
    const u = clamp(side > 0 ? x / width + 0.5 : 0.5 - x / width);
    const lift = Math.sin(u * Math.PI * 0.5) * curl;
    const sag = Math.pow(u, 2.2) * curl * 0.55;
    const cross = Math.cos((y / height) * Math.PI) * curl * 0.16;
    pos.setZ(i, lift - sag + cross);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * An open book on a flat surface. Pages breathe very slightly and one loose
 * leaf near the top lifts and settles — enough movement to feel alive without
 * ever reading as an animation loop.
 */
export function OpenBook({
  width = 0.62,
  height = 0.86,
  segments = 20,
  coverHue = 24,
  pageVariant = 1,
  breathe = 1,
  rightPageTexture,
  children,
  ...props
}) {
  const leftPage = useRef();
  const rightPage = useRef();
  const loose = useRef();

  const geoL = useMemo(
    () => makePageGeometry(width, height, segments, -1),
    [width, height, segments]
  );
  const geoR = useMemo(
    () => makePageGeometry(width, height, segments, 1),
    [width, height, segments]
  );
  const geoLoose = useMemo(
    () => makePageGeometry(width * 0.96, height * 0.96, Math.max(8, segments >> 1), 1, 0.14),
    [width, height, segments]
  );

  const texL = useMemo(() => pageTexture(pageVariant), [pageVariant]);
  const texR = useMemo(() => pageTexture(pageVariant + 1), [pageVariant]);
  const texCover = useMemo(() => coverTexture(coverHue, pageVariant), [coverHue, pageVariant]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = breathe;
    if (leftPage.current) leftPage.current.rotation.y = Math.sin(t * 0.5) * 0.012 * b;
    if (rightPage.current) rightPage.current.rotation.y = Math.sin(t * 0.5 + 1.6) * 0.012 * b;
    if (loose.current) {
      const lift = (Math.sin(t * 0.42) * 0.5 + 0.5) ** 2;
      loose.current.rotation.y = -lift * 0.5 * b;
      loose.current.position.y = 0.028 + lift * 0.02 * b;
    }
  });

  return (
    <group {...props}>
      {/* cover slabs */}
      <mesh position={[-width / 2 - 0.01, -0.016, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 0.05, 0.022, height + 0.05]} />
        <meshStandardMaterial map={texCover} roughness={0.78} metalness={0.05} />
      </mesh>
      <mesh position={[width / 2 + 0.01, -0.016, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 0.05, 0.022, height + 0.05]} />
        <meshStandardMaterial map={texCover} roughness={0.78} metalness={0.05} />
      </mesh>

      {/* paper block — a stack, not a slab */}
      <mesh position={[-width / 2, 0.002, 0]} receiveShadow>
        <boxGeometry args={[width, 0.03, height]} />
        <meshStandardMaterial color="#e9dfc9" roughness={0.95} />
      </mesh>
      <mesh position={[width / 2, 0.002, 0]} receiveShadow>
        <boxGeometry args={[width, 0.03, height]} />
        <meshStandardMaterial color="#e9dfc9" roughness={0.95} />
      </mesh>

      {/* spine shadow in the gutter */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.075, height]} />
        <meshBasicMaterial color="#2a1e12" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* top pages */}
      <mesh
        ref={leftPage}
        geometry={geoL}
        position={[-width / 2, 0.019, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial map={texL} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        ref={rightPage}
        geometry={geoR}
        position={[width / 2, 0.019, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          map={rightPageTexture ?? texR}
          roughness={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* one leaf that lifts */}
      <group ref={loose} position={[0, 0.028, 0]}>
        <mesh geometry={geoLoose} position={[width / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            map={texR}
            roughness={0.9}
            side={THREE.DoubleSide}
            transparent
            opacity={0.96}
          />
        </mesh>
      </group>

      {children}
    </group>
  );
}

/** A closed book — used for props and for the odd hero volume. */
export function ClosedBook({ hue = 24, variant = 0, size = [0.16, 0.86, 0.6], ...props }) {
  const tex = useMemo(() => coverTexture(hue, variant), [hue, variant]);
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={0.82} metalness={0.04} />
    </mesh>
  );
}
