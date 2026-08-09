import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { HoloPanel } from '../objects/HoloPanel.jsx';
import { Dust } from '../objects/Dust.jsx';
import { useReveal } from '../objects/useReveal.js';
import { featurePanel } from '../../lib/textures.js';
import { useQuality } from '../../hooks/useTier.js';
import { ANCHORS } from '../../lib/timeline.js';
import { scroll } from '../../lib/scroll.js';
import { range, clamp, lerp, damp, TAU } from '../../lib/math.js';
import {
  PageTrackingDemo,
  ProgressDemo,
  VocabularyDemo,
  NotesDemo,
  RemindersDemo,
  PersonalDemo,
} from './features/demos.jsx';

export const FEATURES = [
  {
    eyebrow: 'Track',
    title: 'It knows the line, not just the page.',
    body: 'Closing the book stores the exact line you stopped on, so returning takes no searching at all.',
    Demo: PageTrackingDemo,
  },
  {
    eyebrow: 'Progress',
    title: 'Reading you can actually see.',
    body: 'Pace, chapters cleared and time left — measured by the book itself rather than guessed at.',
    Demo: ProgressDemo,
  },
  {
    eyebrow: 'Vocabulary',
    title: 'The word you did not know, kept.',
    body: 'Tap an unfamiliar word and its meaning is saved to the book, ready when you next open it.',
    Demo: VocabularyDemo,
  },
  {
    eyebrow: 'Notes',
    title: 'What mattered, marked where it happened.',
    body: 'Key passages are pinned in place and gathered into one thread you can walk back through.',
    Demo: NotesDemo,
  },
  {
    eyebrow: 'Rhythm',
    title: 'A quiet nudge, at your hour.',
    body: 'It learns when you actually read and reminds you then — never in the middle of everything else.',
    Demo: RemindersDemo,
  },
  {
    eyebrow: 'Personal',
    title: 'It adapts to the reader, not the book.',
    body: 'Difficulty, pacing and recall prompts shift with how you read, so the support fits you.',
    Demo: PersonalDemo,
  },
];

const STATION_X = 1.9;

/**
 * One capability station.
 *
 * The demo sits low and physical; the panel floats above and slightly behind
 * it, angled into the corridor so the camera meets it face-on as it weaves
 * past. A light beam pins the station to the floor so it feels installed in
 * the space rather than floating in a void.
 */
function Station({ index, feature }) {
  const side = index % 2 === 0 ? -1 : 1;
  const z = ANCHORS.featureZ[index];
  const base = 0.452 + index * 0.04;
  const revealWindow = useMemo(() => [base, base + 0.026, base + 0.056, base + 0.084], [base]);

  const reveal = useReveal(revealWindow, 7);
  const group = useRef();
  const beam = useRef();
  const ring = useRef();
  const light = useRef();

  const texture = useMemo(
    () => featurePanel(feature.eyebrow, feature.title, feature.body),
    [feature]
  );

  useFrame((state, dt) => {
    const r = reveal.current;
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.visible = r > 0.004;
      group.current.position.y = damp(group.current.position.y, lerp(-0.12, 0, r), 5, dt);
    }
    if (beam.current?.material) beam.current.material.opacity = r * 0.11;
    if (ring.current) {
      ring.current.rotation.z = t * 0.12 * side;
      if (ring.current.material) ring.current.material.opacity = r * 0.42;
      ring.current.scale.setScalar(lerp(0.6, 1, r));
    }
    if (light.current) light.current.intensity = damp(light.current.intensity, r * 5.5, 5, dt);
  });

  return (
    <group ref={group} position={[side * STATION_X, 0, z]}>
      {/* the demonstration, at eye height */}
      <group position={[0, 1.16, 0]} rotation={[0, -side * 0.55, 0]} scale={1.15}>
        <feature.Demo reveal={reveal} />
      </group>

      {/* the panel, angled into the corridor */}
      <HoloPanel
        texture={texture}
        width={1.5}
        height={0.83}
        position={[side * 0.1, 1.86, 0.22]}
        rotation={[0, -side * 0.55, 0]}
        revealRange={[
          revealWindow[0] + 0.008,
          revealWindow[1] + 0.01,
          revealWindow[2],
          revealWindow[3],
        ]}
        parallax={0.05}
      />

      {/* floor mark + beam */}
      <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.5, 0.62, 48, 1, 0, TAU * 0.72]} />
        <meshBasicMaterial
          color="#8fd6ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={beam} position={[0, 1.3, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.34, 0.62, 2.6, 18, 1, true]} />
        <meshBasicMaterial
          color="#6fc9ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight
        ref={light}
        position={[0, 1.4, 0.5]}
        intensity={0}
        distance={5.5}
        decay={2}
        color="#9fd8ff"
      />
    </group>
  );
}

/**
 * Scene 4 — the capability corridor.
 *
 * A dark hall with a reflective floor and six installations. The camera weaves
 * left and right so each station is approached, met, and left behind, which
 * gives the section a rhythm instead of a list.
 */
export function FeaturesScene() {
  const quality = useQuality();
  const group = useRef();
  const floor = useRef();

  useFrame((_, dt) => {
    const p = scroll.smooth;
    const alive = Math.min(range(p, 0.43, 0.47), 1 - range(p, 0.7, 0.74));
    if (group.current) group.current.visible = alive > 0.004;
    if (floor.current?.material) {
      floor.current.material.opacity = damp(
        floor.current.material.opacity,
        clamp(alive) * 0.55,
        4,
        dt
      );
    }
  });

  return (
    <group ref={group}>
      {/* a long dark floor with a faint centre line to lead the eye */}
      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -62]} raycast={() => null}>
        <planeGeometry args={[16, 52]} />
        <meshStandardMaterial
          color="#080d14"
          roughness={0.28}
          metalness={0.6}
          transparent
          opacity={0}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -62]} raycast={() => null}>
        <planeGeometry args={[0.02, 50]} />
        <meshBasicMaterial color="#2f6f96" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {FEATURES.map((f, i) => (
        <Station key={f.eyebrow} index={i} feature={f} />
      ))}

      <Dust
        count={Math.round(quality.dust * 0.4)}
        area={[10, 5, 46]}
        position={[0, 1.6, -62]}
        color="#8fbfe8"
        size={14}
        opacity={0.35}
        seed={57}
        visibleRange={[0.44, 0.73]}
        fade={0.14}
      />

      <pointLight position={[0, 3.4, -46]} intensity={3} distance={22} decay={2} color="#4a6f9a" />
      <pointLight position={[0, 3.4, -74]} intensity={3} distance={22} decay={2} color="#4a6f9a" />
    </group>
  );
}
