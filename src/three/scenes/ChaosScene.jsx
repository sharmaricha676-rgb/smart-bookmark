import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { pageTexture, wordTexture, stickyNote } from '../../lib/textures.js';
import { Dust } from '../objects/Dust.jsx';
import { useQuality } from '../../hooks/useTier.js';
import { scroll } from '../../lib/scroll.js';
import { seeded, range, clamp, lerp, damp, TAU } from '../../lib/math.js';
import { pointer } from '../../hooks/usePointer.js';

const dummy = new THREE.Object3D();

const RANGE = [0.14, 0.335];
const Z_START = -2.5;
const Z_END = -27;

/**
 * Scene 2 — the reading problem, staged rather than stated.
 *
 * Five failures of ordinary reading are each given a physical behaviour:
 *  - losing your place → a torn strip that slides off every page it lands on
 *  - forgetting        → words that drift up and dissolve as you reach them
 *  - scattered notes   → sticky notes caught in a slow vortex, none legible
 *  - lost progress     → a progress ring broken into drifting arcs
 *  - the noise itself  → a tumbling corridor of loose pages
 * Nothing here is labelled in 3D; the copy overlay names them only after you
 * have already seen them behave.
 */
export function ChaosScene() {
  const quality = useQuality();
  const group = useRef();
  const pages = useRef();
  const notes = useRef();
  const strip = useRef();
  const arcs = useRef();
  const wordsRef = useRef([]);

  const pageData = useMemo(() => {
    const rnd = seeded(77);
    return Array.from({ length: quality.chaosPages }).map(() => ({
      x: (rnd() - 0.5) * 7.2,
      y: (rnd() - 0.5) * 4.6,
      z: Z_START - rnd() * (Z_START - Z_END),
      rx: rnd() * TAU,
      ry: rnd() * TAU,
      rz: rnd() * TAU,
      sx: 0.34 + rnd() * 0.46,
      spin: (rnd() - 0.5) * 0.5,
      drift: 0.15 + rnd() * 0.5,
      phase: rnd() * TAU,
      torn: rnd() > 0.72,
    }));
  }, [quality.chaosPages]);

  const noteData = useMemo(() => {
    const rnd = seeded(303);
    return Array.from({ length: quality.notes }).map(() => ({
      a: rnd() * TAU,
      r: 0.7 + rnd() * 2.1,
      y: (rnd() - 0.5) * 2.4,
      z: -11 - rnd() * 6,
      s: 0.14 + rnd() * 0.14,
      spin: (rnd() - 0.5) * 1.6,
      variant: Math.floor(rnd() * 4),
    }));
  }, [quality.notes]);

  const words = useMemo(() => {
    const pool = [
      'photosynthesis',
      'catalyst',
      'the thesis',
      'page 214',
      '1789',
      'ephemeral',
      'chapter three',
      'her name',
      'the formula',
      'why it mattered',
      'the second reason',
      'entropy',
      'the quote',
      'inference',
      'the date',
      'contrapposto',
      'the conclusion',
      'lucid',
      'the argument',
      'a promise',
      'the footnote',
      'meridian',
    ];
    const rnd = seeded(1301);
    return pool.slice(0, quality.chaosWords).map((w, i) => ({
      word: w,
      x: (rnd() - 0.5) * 5.4,
      y: (rnd() - 0.5) * 3.2,
      z: -4 - (i / quality.chaosWords) * 19 - rnd() * 1.4,
      s: 0.5 + rnd() * 0.5,
      phase: rnd() * TAU,
      rise: 0.25 + rnd() * 0.5,
    }));
  }, [quality.chaosWords]);

  const pageTex = useMemo(() => pageTexture(4, { density: 1.3 }), []);
  const tornTex = useMemo(() => pageTexture(6, { density: 1.1, tint: '#e6dbc4' }), []);
  const noteTexes = useMemo(() => [0, 1, 2, 3].map((v) => stickyNote(v)), []);
  const wordTexes = useMemo(() => words.map((w) => wordTexture(w.word, '#d8c69c')), [words]);

  useLayoutEffect(() => {
    const mesh = pages.current;
    if (!mesh) return;
    pageData.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.set(p.sx, p.sx * 1.35, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [pageData]);

  // Notes share one geometry and texture; per-instance colour is what makes the
  // pad look like four different colours instead of one.
  useLayoutEffect(() => {
    const nm = notes.current;
    if (!nm) return;
    const tints = ['#e8d879', '#e2a0a0', '#9fd7c4', '#d9c3e8'].map((c) => new THREE.Color(c));
    noteData.forEach((d, i) => nm.setColorAt(i, tints[d.variant]));
    if (nm.instanceColor) nm.instanceColor.needsUpdate = true;
  }, [noteData]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scroll.smooth;

    // one envelope for the whole scene: builds, holds, then is swept away
    const build = range(p, RANGE[0], RANGE[0] + 0.05);
    const clear = range(p, 0.3, RANGE[1]);
    const life = clamp(build * (1 - clear));
    const chaosAmt = clamp(build * (1 - range(p, 0.285, 0.33)));

    if (group.current) {
      group.current.visible = life > 0.004;
      // as calm arrives everything is pulled outward and up, out of frame
      group.current.position.y = damp(group.current.position.y, clear * 5.5, 3, dt);
      group.current.rotation.z = damp(group.current.rotation.z, clear * 0.35, 3, dt);
    }

    // --- tumbling pages ---
    const mesh = pages.current;
    if (mesh && life > 0.004) {
      for (let i = 0; i < pageData.length; i++) {
        const d = pageData[i];
        const wob = chaosAmt * d.drift;
        dummy.position.set(
          d.x + Math.sin(t * 0.5 + d.phase) * wob * 1.5 + pointer.x * 0.24,
          d.y + Math.cos(t * 0.42 + d.phase) * wob * 1.1 + pointer.y * 0.16,
          d.z + Math.sin(t * 0.3 + d.phase) * wob
        );
        dummy.rotation.set(
          d.rx + t * d.spin * chaosAmt,
          d.ry + t * d.spin * 0.7 * chaosAmt,
          d.rz + Math.sin(t * 0.4 + d.phase) * 0.3 * chaosAmt
        );
        const s = d.sx * lerp(0.2, 1, life);
        dummy.scale.set(s, s * 1.35, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // --- scattered notes caught in a vortex ---
    const nm = notes.current;
    if (nm && life > 0.004) {
      for (let i = 0; i < noteData.length; i++) {
        const d = noteData[i];
        const a = d.a + t * 0.28 * chaosAmt;
        const r = d.r * lerp(0.4, 1, life);
        dummy.position.set(
          Math.cos(a) * r,
          d.y + Math.sin(t * 0.6 + d.a) * 0.2,
          d.z + Math.sin(a) * r * 0.6
        );
        dummy.rotation.set(t * d.spin * 0.4, a, Math.sin(t + d.a) * 0.5);
        dummy.scale.setScalar(d.s * life);
        dummy.updateMatrix();
        nm.setMatrixAt(i, dummy.matrix);
      }
      nm.instanceMatrix.needsUpdate = true;
    }

    // --- the strip that will not stay put ---
    if (strip.current) {
      const slide = (t * 0.34) % 1;
      strip.current.position.set(
        -1.1 + Math.sin(t * 0.5) * 0.5,
        1.05 - slide * 2.6,
        -6.5 + Math.cos(t * 0.4) * 0.6
      );
      strip.current.rotation.z = 0.5 + Math.sin(t * 0.9) * 0.5;
      strip.current.rotation.x = Math.sin(t * 0.7) * 0.4;
      const mat = strip.current.children[0]?.material;
      if (mat) mat.opacity = life * (0.35 + 0.65 * Math.sin(slide * Math.PI));
    }

    // --- the broken progress ring ---
    if (arcs.current) {
      arcs.current.rotation.z = t * 0.16;
      arcs.current.children.forEach((child, i) => {
        const off = (i + 1) * 0.35;
        child.position.x = Math.sin(t * 0.4 + i) * 0.42 * chaosAmt;
        child.position.y = Math.cos(t * 0.33 + i) * 0.34 * chaosAmt;
        child.rotation.z = Math.sin(t * 0.25 + off) * 0.5 * chaosAmt;
        if (child.material) child.material.opacity = life * 0.75;
      });
    }

    // --- words that fade the moment you reach them ---
    wordsRef.current.forEach((ref, i) => {
      if (!ref) return;
      const d = words[i];
      // distance along the tunnel between the camera and the word
      const near = 1 - clamp(Math.abs(scroll.smooth - (0.17 + (i / words.length) * 0.12)) / 0.055);
      ref.position.y = d.y + Math.sin(t * 0.4 + d.phase) * 0.12 + near * d.rise * 1.4;
      ref.position.x = d.x + pointer.x * 0.3;
      const mat = ref.children[0]?.material;
      if (mat) mat.opacity = life * near * 0.95;
      ref.scale.setScalar(d.s * lerp(1, 1.35, near));
      ref.visible = near > 0.01;
    });
  });

  return (
    <group ref={group}>
      {/* the corridor of loose pages */}
      <instancedMesh
        ref={pages}
        args={[undefined, undefined, pageData.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={pageTex}
          side={THREE.DoubleSide}
          roughness={0.95}
          transparent
          opacity={0.94}
        />
      </instancedMesh>

      {/* notes in the vortex */}
      <instancedMesh
        ref={notes}
        args={[undefined, undefined, noteData.length]}
        raycast={() => null}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={noteTexes[0]}
          side={THREE.DoubleSide}
          roughness={0.9}
          transparent
        />
      </instancedMesh>

      {/* the strip of paper standing in for a lost place */}
      <group ref={strip}>
        <mesh raycast={() => null}>
          <planeGeometry args={[0.09, 0.7]} />
          <meshStandardMaterial
            map={tornTex}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
            roughness={0.9}
          />
        </mesh>
      </group>

      {/* progress, in pieces */}
      <group ref={arcs} position={[1.35, -0.35, -17]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * TAU) / 4]} raycast={() => null}>
            <ringGeometry args={[0.52, 0.6, 24, 1, 0, 1.06]} />
            <meshBasicMaterial
              color="#8ba6c8"
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* words you were sure you would remember */}
      {words.map((w, i) => (
        <group
          key={w.word}
          ref={(el) => {
            wordsRef.current[i] = el;
          }}
          position={[w.x, w.y, w.z]}
        >
          <mesh raycast={() => null}>
            <planeGeometry args={[1.5, 0.38]} />
            <meshBasicMaterial
              map={wordTexes[i]}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* cold, sparse motes — the opposite of the library's warm dust */}
      <Dust
        count={Math.round(quality.dust * 0.45)}
        area={[9, 5, 22]}
        position={[0, 0, -14]}
        color="#8fb4d8"
        size={16}
        opacity={0.4}
        seed={41}
        turbulence={0.9}
        visibleRange={[0.14, 0.335]}
        fade={0.24}
      />

      {/* the only light in here is cold and comes from behind the debris */}
      <pointLight position={[0, 1.4, -8]} intensity={9} distance={16} decay={2} color="#7fa8d8" />
      <pointLight position={[1.2, -1, -20]} intensity={7} distance={16} decay={2} color="#5c76a8" />
    </group>
  );
}
