import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OpenBook, ClosedBook } from '../objects/Book.jsx';
import { Bookmark } from '../objects/Bookmark.jsx';
import { Bookcase } from '../objects/Shelves.jsx';
import { Dust } from '../objects/Dust.jsx';
import { useQuality } from '../../hooks/useTier.js';
import { scroll } from '../../lib/scroll.js';
import { range, damp, seeded } from '../../lib/math.js';

/**
 * Scene 1 — a reading room at the end of the afternoon.
 *
 * The room is deliberately asymmetric: light arrives from one tall window on
 * the left, the desk sits slightly off-centre, and the shelves run past the
 * camera rather than framing it. That is what stops it reading as a "3D demo
 * room" and starts it reading as a place.
 */
export function LibraryScene() {
  const quality = useQuality();
  const lamp = useRef();
  const shaft = useRef();
  const room = useRef();
  const bookmarkGroup = useRef();

  // A few volumes stacked on the desk, seeded so the arrangement is stable.
  const stack = useMemo(() => {
    const rnd = seeded(21);
    return Array.from({ length: 4 }).map((_, i) => ({
      y: 0.985 + i * 0.055,
      rot: (rnd() - 0.5) * 0.5,
      x: -0.92 + (rnd() - 0.5) * 0.05,
      z: -0.12 + (rnd() - 0.5) * 0.12,
      hue: [22, 30, 208, 130][i],
      h: 0.05,
    }));
  }, []);

  useFrame((state, dt) => {
    const p = scroll.smooth;
    const t = state.clock.elapsedTime;

    // The room stays lit until the camera is inside the page, then releases.
    const alive = 1 - range(p, 0.15, 0.23);
    if (room.current) room.current.visible = alive > 0.01;

    if (lamp.current) {
      // filament flicker — very small, irregular, never rhythmic
      const flick = 0.94 + Math.sin(t * 9.1) * 0.02 + Math.sin(t * 23.7) * 0.014;
      lamp.current.intensity = damp(lamp.current.intensity, 5.2 * flick * alive, 8, dt);
    }
    if (shaft.current?.material) {
      shaft.current.material.opacity = damp(shaft.current.material.opacity, 0.055 * alive, 4, dt);
    }
    if (bookmarkGroup.current) {
      // the bookmark is asleep here — it only stirs as the camera closes in
      const wake = range(p, 0.07, 0.135);
      bookmarkGroup.current.position.y = damp(
        bookmarkGroup.current.position.y,
        1.0 + wake * 0.012,
        4,
        dt
      );
    }
  });

  return (
    <group ref={room}>
      {/* ---------------------------------------------------------------- room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 34]} />
        <meshStandardMaterial color="#241a12" roughness={0.85} metalness={0.02} />
      </mesh>
      {/* rug under the desk — breaks up the floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.6]} receiveShadow>
        <planeGeometry args={[5.4, 4.2]} />
        <meshStandardMaterial color="#3a2114" roughness={0.98} />
      </mesh>

      {/* back wall with a tall window */}
      <group position={[0, 0, -6.4]}>
        <mesh position={[0, 3, 0]} receiveShadow>
          <boxGeometry args={[24, 6, 0.3]} />
          <meshStandardMaterial color="#191108" roughness={0.95} />
        </mesh>
        <mesh position={[-4.4, 2.5, 0.18]}>
          <planeGeometry args={[1.9, 4.2]} />
          <meshBasicMaterial color="#ffdcae" toneMapped={false} />
        </mesh>
        {/* window mullions */}
        {[-0.6, 0.6].map((x, i) => (
          <mesh key={i} position={[-4.4 + x, 2.5, 0.2]}>
            <boxGeometry args={[0.05, 4.2, 0.05]} />
            <meshStandardMaterial color="#120c06" roughness={0.9} />
          </mesh>
        ))}
        {[1.2, 2.5, 3.8].map((y, i) => (
          <mesh key={`h${i}`} position={[-4.4, y, 0.2]}>
            <boxGeometry args={[1.95, 0.05, 0.05]} />
            <meshStandardMaterial color="#120c06" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* volumetric-ish light shaft from the window — one cheap angled plane */}
      <mesh
        ref={shaft}
        position={[-2.6, 2.2, -3.2]}
        rotation={[0, 0.5, -0.34]}
        raycast={() => null}
      >
        <planeGeometry args={[3.4, 7.2]} />
        <meshBasicMaterial
          color="#ffd8a0"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ------------------------------------------------------------- shelves */}
      <Bookcase
        position={[-5.6, 0, -2.2]}
        rotation={[0, 0.42, 0]}
        bays={3}
        shelvesPerBay={6}
        seed={5}
      />
      <Bookcase
        position={[5.6, 0, -2.2]}
        rotation={[0, -0.42, 0]}
        bays={3}
        shelvesPerBay={6}
        seed={12}
      />
      <Bookcase position={[-1.2, 0, -7.6]} bays={2} shelvesPerBay={5} seed={31} />
      <Bookcase position={[4.6, 0, -7.6]} bays={2} shelvesPerBay={5} seed={44} />

      {/* ---------------------------------------------------------------- desk */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.1, 0.07, 1.5]} />
          <meshStandardMaterial color="#3d2716" roughness={0.55} metalness={0.06} />
        </mesh>
        {/* leather blotter */}
        <mesh position={[0, 0.957, 0.02]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.1, 1.1]} />
          <meshStandardMaterial color="#1e2a33" roughness={0.75} />
        </mesh>
        {[
          [-1.42, 0.46, 0.62],
          [1.42, 0.46, 0.62],
          [-1.42, 0.46, -0.62],
          [1.42, 0.46, -0.62],
        ].map((pos, i) => (
          <mesh key={i} position={pos} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.92, 8]} />
            <meshStandardMaterial color="#2c1c10" roughness={0.7} />
          </mesh>
        ))}

        {/* desk lamp: shade, arm, and the light itself */}
        <group position={[-1.15, 0.955, -0.44]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.02, 16]} />
            <meshStandardMaterial color="#1f2830" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.28, 0.05]} rotation={[0.34, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.56, 8]} />
            <meshStandardMaterial color="#2b3540" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.55, 0.24]} rotation={[0.95, 0, 0]} castShadow>
            <coneGeometry args={[0.16, 0.2, 20, 1, true]} />
            <meshStandardMaterial
              color="#26313b"
              metalness={0.6}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.5, 0.28]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color="#ffdfae" toneMapped={false} />
          </mesh>
        </group>

        {/* the book, slightly off-square to the desk */}
        <group position={[0.22, 0.96, 0.06]} rotation={[0, -0.16, 0]}>
          <OpenBook
            width={0.62}
            height={0.86}
            segments={quality.pageSegments}
            coverHue={24}
            pageVariant={1}
          />
          {/* the bookmark, resting in the gutter */}
          <group ref={bookmarkGroup} position={[0.02, 0.028, 0.06]}>
            <Bookmark
              charge={0}
              tilt={Math.PI / 2 - 0.04}
              rotation={[0, 0, 0.06]}
              scale={0.62}
              responsive={false}
            />
          </group>
        </group>

        {/* stacked volumes + a pair of glasses' worth of clutter */}
        {stack.map((s, i) => (
          <ClosedBook
            key={i}
            hue={s.hue}
            variant={i}
            size={[0.62, s.h, 0.44]}
            position={[s.x, s.y, s.z]}
            rotation={[0, s.rot, 0]}
          />
        ))}
        <mesh position={[1.18, 0.985, 0.3]} rotation={[-Math.PI / 2, 0, 0.4]} castShadow>
          <ringGeometry args={[0.055, 0.075, 20]} />
          <meshStandardMaterial color="#c9a86a" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[1.3, 0.985, 0.33]} rotation={[-Math.PI / 2, 0, 0.4]} castShadow>
          <ringGeometry args={[0.055, 0.075, 20]} />
          <meshStandardMaterial color="#c9a86a" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- lights */}
      <pointLight
        ref={lamp}
        position={[-1.15, 1.5, -0.16]}
        intensity={5.2}
        distance={7}
        decay={2}
        color="#ffcf94"
        castShadow={quality.shadows}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0012}
      />
      <directionalLight
        position={[-7.5, 5.2, -4]}
        intensity={1.5}
        color="#ffcf9c"
        castShadow={quality.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0016}
      />
      {/* cool bounce from behind the camera so the fronts of shelves aren't dead */}
      <pointLight position={[2.4, 2.6, 6]} intensity={2.2} distance={16} color="#7c93b8" />

      {/* dust in the light shaft */}
      <Dust
        count={quality.dust}
        area={[11, 5.5, 16]}
        position={[-1.2, 2.2, -2]}
        color="#f0d7a6"
        size={22}
        opacity={0.5}
        seed={9}
        visibleRange={[0, 0.2]}
        fade={0.22}
      />
    </group>
  );
}
