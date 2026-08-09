import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LibraryField, DEFAULT_AISLE } from '../objects/Shelves.jsx';
import { Dust } from '../objects/Dust.jsx';
import { useQuality } from '../../hooks/useTier.js';
import { scroll } from '../../lib/scroll.js';
import { range, clamp, lerp, damp, seeded, easeOutCubic, TAU } from '../../lib/math.js';

const CENTRE = [0, 0, -118];
const dummy = new THREE.Object3D();

/**
 * Scene 6 — impact.
 *
 * The camera climbs and the one desk becomes a hall of them. Readers are single
 * warm points of light at their tables; every bookmark in the room is a cool
 * one. As the shot widens, threads reach between the bookmarks — the same
 * marked-and-remembered idea happening in hundreds of places at once.
 *
 * The whole hall is four draw calls, so the widest shot in the piece is also
 * one of the cheapest.
 */
export function ImpactScene() {
  const quality = useQuality();
  const group = useRef();
  const readers = useRef();
  const desks = useRef();
  const threads = useRef();
  const floorRef = useRef();

  // Desks are placed off the nave, so the camera's exit route stays clear.
  const readerData = useMemo(() => {
    const rnd = seeded(1717);
    const out = [];
    let guard = 0;
    while (out.length < quality.readers && guard++ < quality.readers * 12) {
      const a = rnd() * TAU;
      const r = 5 + rnd() * 22;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.7;
      if (Math.abs(x) < DEFAULT_AISLE.halfWidth && z < DEFAULT_AISLE.fromZ) continue;
      out.push({
        x,
        z,
        y: -1.4,
        rot: rnd() * TAU,
        phase: rnd() * TAU,
        speed: 0.4 + rnd() * 0.8,
      });
    }
    return out;
  }, [quality.readers]);

  const threadGeo = useMemo(() => {
    const rnd = seeded(2323);
    const pairs = Math.round(quality.readers * 2.2);
    const arr = new Float32Array(pairs * 2 * 3);
    for (let i = 0; i < pairs; i++) {
      const a = readerData[Math.floor(rnd() * readerData.length)];
      const b = readerData[Math.floor(rnd() * readerData.length)];
      if (!a || !b) continue;
      arr[i * 6] = a.x;
      arr[i * 6 + 1] = a.y + 0.9;
      arr[i * 6 + 2] = a.z;
      arr[i * 6 + 3] = b.x;
      arr[i * 6 + 4] = b.y + 0.9;
      arr[i * 6 + 5] = b.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [readerData, quality.readers]);

  useLayoutEffect(() => {
    const dm = desks.current;
    if (!dm) return;
    readerData.forEach((d, i) => {
      dummy.position.set(d.x, d.y + 0.42, d.z);
      dummy.rotation.set(0, d.rot, 0);
      dummy.scale.set(1.5, 0.06, 0.9);
      dummy.updateMatrix();
      dm.setMatrixAt(i, dummy.matrix);
    });
    dm.instanceMatrix.needsUpdate = true;
  }, [readerData]);

  useFrame((state, dt) => {
    const p = scroll.smooth;
    const t = state.clock.elapsedTime;
    const alive = Math.min(range(p, 0.775, 0.83), 1 - range(p, 0.915, 0.955));
    const spread = easeOutCubic(range(p, 0.79, 0.9));

    if (group.current) {
      group.current.visible = alive > 0.004;
      group.current.scale.setScalar(lerp(0.55, 1, spread));
    }

    // reader lamps warm up one after another as the room fills
    const rm = readers.current;
    if (rm && alive > 0.004) {
      for (let i = 0; i < readerData.length; i++) {
        const d = readerData[i];
        const on = clamp((spread * readerData.length * 1.4 - i) * 0.7);
        const flicker = 0.85 + Math.sin(t * d.speed + d.phase) * 0.15;
        const s = 0.16 * on * flicker;
        dummy.position.set(d.x, d.y + 0.62, d.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(Math.max(s, 0.0001));
        dummy.updateMatrix();
        rm.setMatrixAt(i, dummy.matrix);
      }
      rm.instanceMatrix.needsUpdate = true;
    }

    // the network draws itself in, late
    const link = clamp((spread - 0.45) / 0.5);
    const total = threadGeo.attributes.position.count;
    threadGeo.setDrawRange(0, Math.floor((total / 2) * link) * 2);
    if (threads.current?.material) {
      threads.current.material.opacity = link * (0.16 + Math.sin(t * 0.9) * 0.04) * alive;
    }

    if (floorRef.current?.material) {
      floorRef.current.material.opacity = damp(
        floorRef.current.material.opacity,
        alive * 0.9,
        4,
        dt
      );
    }
  });

  return (
    <group ref={group} position={CENTRE}>
      {/* the hall floor, polished enough to double the lights */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.45, 0]}
        raycast={() => null}
      >
        <circleGeometry args={[46, 64]} />
        <meshStandardMaterial
          color="#0a0f18"
          roughness={0.22}
          metalness={0.75}
          transparent
          opacity={0}
        />
      </mesh>

      <LibraryField
        count={quality.libraryBooks}
        marks={Math.round(quality.libraryBooks * 0.16)}
        radius={40}
        position={[0, 1.2, 0]}
      />

      {/* desks */}
      <instancedMesh
        ref={desks}
        args={[undefined, undefined, readerData.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1b1409" roughness={0.8} />
      </instancedMesh>

      {/* readers, as warm points of light */}
      <instancedMesh
        ref={readers}
        args={[undefined, undefined, readerData.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffcf94" toneMapped={false} />
      </instancedMesh>

      <lineSegments ref={threads} geometry={threadGeo} raycast={() => null} frustumCulled={false}>
        <lineBasicMaterial color="#8fd6ff" transparent opacity={0} toneMapped={false} />
      </lineSegments>

      <Dust
        count={Math.round(quality.dust * 0.5)}
        area={[60, 18, 50]}
        position={[0, 4, 0]}
        color="#a8c4e8"
        size={20}
        opacity={0.3}
        seed={177}
        visibleRange={[0.775, 0.955]}
        fade={0.18}
      />

      <pointLight position={[0, 10, 6]} intensity={26} distance={64} decay={2} color="#5f7ba8" />
      <pointLight position={[0, 1.4, -18]} intensity={16} distance={44} decay={2} color="#3c5680" />
    </group>
  );
}
