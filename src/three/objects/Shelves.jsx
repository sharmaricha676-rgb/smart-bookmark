import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seeded } from '../../lib/math.js';

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

/**
 * A wall of bookcases. Everything is one InstancedMesh for the spines plus a
 * handful of boxes for the carcass, so a full library wall costs three draw
 * calls. Book heights, depths and lean are seeded, so shelves look hand-filled
 * rather than tiled — including the odd volume tipped against its neighbour.
 */
export function Bookcase({
  bays = 3,
  shelvesPerBay = 5,
  bayWidth = 1.8,
  shelfHeight = 0.52,
  depth = 0.34,
  booksPerShelf = 14,
  seed = 3,
  palette = [18, 26, 34, 200, 120, 8],
  ...props
}) {
  const spines = useRef();

  const layout = useMemo(() => {
    const rnd = seeded(seed);
    const items = [];
    const totalW = bays * bayWidth;
    for (let b = 0; b < bays; b++) {
      for (let s = 0; s < shelvesPerBay; s++) {
        let x = -totalW / 2 + b * bayWidth + 0.07;
        const shelfY = s * shelfHeight + 0.16;
        const limit = bayWidth - 0.14;
        let guard = 0;
        while (x < -totalW / 2 + b * bayWidth + limit && guard++ < 60) {
          const w = 0.035 + rnd() * 0.05;
          if (x + w > -totalW / 2 + b * bayWidth + limit) break;
          const h = 0.26 + rnd() * 0.12;
          const d = depth * (0.62 + rnd() * 0.3);
          const lean = rnd() > 0.93 ? (rnd() - 0.5) * 0.35 : 0;
          const hue = palette[Math.floor(rnd() * palette.length)];
          items.push({
            x: x + w / 2,
            y: shelfY + h / 2,
            z: -depth / 2 + d / 2,
            w,
            h,
            d,
            lean,
            hue,
            light: 0.1 + rnd() * 0.16,
            sat: 0.14 + rnd() * 0.3,
          });
          x += w + 0.004 + rnd() * 0.008;
          // occasional gap where a book has been taken out
          if (rnd() > 0.94) x += 0.04 + rnd() * 0.06;
        }
      }
    }
    return { items, totalW };
  }, [bays, shelvesPerBay, bayWidth, shelfHeight, depth, booksPerShelf, seed, palette]);

  useLayoutEffect(() => {
    const mesh = spines.current;
    if (!mesh) return;
    layout.items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, 0, it.lean);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tint.setHSL(it.hue / 360, it.sat, it.light);
      mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [layout]);

  const carcassH = shelvesPerBay * shelfHeight + 0.24;

  return (
    <group {...props}>
      <instancedMesh
        ref={spines}
        args={[undefined, undefined, layout.items.length]}
        castShadow
        receiveShadow
        raycast={() => null}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.86} metalness={0.02} />
      </instancedMesh>

      {/* carcass: back, sides, shelf boards */}
      <mesh position={[0, carcassH / 2, -depth / 2 - 0.02]} receiveShadow>
        <boxGeometry args={[layout.totalW, carcassH, 0.04]} />
        <meshStandardMaterial color="#150f0a" roughness={0.95} />
      </mesh>
      {Array.from({ length: shelvesPerBay + 1 }).map((_, i) => (
        <mesh key={i} position={[0, i * shelfHeight + 0.13, 0]} receiveShadow castShadow>
          <boxGeometry args={[layout.totalW, 0.028, depth]} />
          <meshStandardMaterial color="#2a1d12" roughness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: bays + 1 }).map((_, i) => (
        <mesh
          key={`d${i}`}
          position={[-layout.totalW / 2 + i * bayWidth, carcassH / 2, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[0.05, carcassH, depth]} />
          <meshStandardMaterial color="#241a10" roughness={0.82} />
        </mesh>
      ))}
      {/* crown moulding */}
      <mesh position={[0, carcassH + 0.03, 0.02]} castShadow>
        <boxGeometry args={[layout.totalW + 0.08, 0.07, depth + 0.06]} />
        <meshStandardMaterial color="#2e2013" roughness={0.72} />
      </mesh>
    </group>
  );
}

/**
 * The impact scene's library: a vast field of floating shelf slabs, each with
 * its own instanced spines and a single bookmark light. Two InstancedMeshes
 * carry the whole thing.
 */
/**
 * Keeps a nave clear down the far side of the hall — the route the camera takes
 * out of this scene and into the finale. Hoisted so the layout memo is stable.
 */
export const DEFAULT_AISLE = { halfWidth: 4.6, fromZ: -6 };

export function LibraryField({
  count = 900,
  marks = 140,
  radius = 42,
  seed = 11,
  aisle = DEFAULT_AISLE,
  ...props
}) {
  const books = useRef();
  const lights = useRef();

  const data = useMemo(() => {
    const rnd = seeded(seed);
    const items = [];
    const lit = [];
    // arrange into concentric rings of shelf runs, receding into the fog
    const rings = 9;
    for (let i = 0; i < count; i++) {
      const ring = Math.floor((i / count) * rings);
      const r = 8 + ring * (radius / rings) + rnd() * 2.2;
      const a = rnd() * Math.PI * 2;
      const tierY = Math.floor(rnd() * 5) * 2.4 - 2.0;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.72;
      const inAisle = aisle && Math.abs(x) < aisle.halfWidth && z < aisle.fromZ;
      items.push({
        hidden: inAisle,
        x,
        y: tierY + rnd() * 0.3,
        z,
        rot: -a + Math.PI / 2,
        w: 0.06 + rnd() * 0.06,
        h: 0.3 + rnd() * 0.18,
        d: 0.2 + rnd() * 0.1,
        hue: [18, 28, 36, 206, 214, 130][Math.floor(rnd() * 6)],
        sat: 0.12 + rnd() * 0.3,
        light: 0.09 + rnd() * 0.15,
      });
    }
    const visible = items.filter((it) => !it.hidden);
    for (let i = 0; i < marks; i++) {
      const src = visible[Math.floor(rnd() * visible.length)];
      if (!src) break;
      lit.push({ x: src.x, y: src.y + src.h * 0.35, z: src.z + 0.06, phase: rnd() * 6.28 });
    }
    return { items, lit };
  }, [count, marks, radius, seed, aisle]);

  useLayoutEffect(() => {
    const mesh = books.current;
    if (mesh) {
      data.items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.rot, 0);
        // Books in the nave are collapsed to nothing rather than removed, so
        // the instance count stays fixed.
        if (it.hidden) dummy.scale.setScalar(0);
        else dummy.scale.set(it.w, it.h, it.d);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        tint.setHSL(it.hue / 360, it.sat, it.light);
        mesh.setColorAt(i, tint);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const lm = lights.current;
    if (lm) {
      data.lit.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.03, 0.16, 0.03);
        dummy.updateMatrix();
        lm.setMatrixAt(i, dummy.matrix);
      });
      lm.instanceMatrix.needsUpdate = true;
    }
  }, [data]);

  return (
    <group {...props}>
      <instancedMesh
        ref={books}
        args={[undefined, undefined, data.items.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.88} metalness={0.03} />
      </instancedMesh>

      <instancedMesh
        ref={lights}
        args={[undefined, undefined, data.lit.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#8fd6ff" toneMapped={false} transparent opacity={0.95} />
      </instancedMesh>
    </group>
  );
}
