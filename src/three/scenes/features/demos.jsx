import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { pageTexture, wordTexture, softCircle } from '../../../lib/textures.js';
import { makePageGeometry } from '../../objects/Book.jsx';
import { lerp, clamp, easeOutCubic, TAU, seeded } from '../../../lib/math.js';

/**
 * Six demonstrations, one per capability.
 *
 * Each takes the station's `reveal` ref (0..1) and animates from it, so the
 * demo literally performs while the camera is looking at it and rests when it
 * is not. They share a visual language — warm paper, one cyan light source,
 * hairline geometry — so the corridor reads as one product, not six widgets.
 */

const ACCENT = '#8fd6ff';

/* -------------------------------------------------------------- 1. tracking */

export function PageTrackingDemo({ reveal }) {
  const flip = useRef();
  const marker = useRef();
  const blade = useRef();
  const geo = useMemo(() => makePageGeometry(0.34, 0.46, 10, 1, 0.06), []);
  const texA = useMemo(() => pageTexture(11, { density: 1.4 }), []);
  const texB = useMemo(() => pageTexture(12, { density: 1.4 }), []);

  useFrame((state) => {
    const r = reveal.current;
    const t = state.clock.elapsedTime;
    if (flip.current) {
      // pages turn, then the last one stops half-turned as the marker lands
      const turn = clamp((Math.sin(t * 0.9) * 0.5 + 0.5) * (1 - r * 0.72));
      flip.current.rotation.y = -turn * Math.PI * 0.86;
      flip.current.visible = r > 0.02;
    }
    if (marker.current) {
      const snap = easeOutCubic(clamp((r - 0.35) / 0.5));
      marker.current.scale.x = snap;
      marker.current.position.y = lerp(0.09, -0.03, snap);
      if (marker.current.material) marker.current.material.opacity = snap * 0.95;
    }
    if (blade.current) {
      const drop = easeOutCubic(clamp((r - 0.45) / 0.45));
      blade.current.position.y = lerp(0.5, 0.021, drop);
      blade.current.rotation.z = lerp(0.6, 0.04, drop);
      blade.current.visible = drop > 0.01;
    }
  });

  return (
    <group rotation={[-0.9, 0, 0]}>
      <mesh position={[-0.18, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.46]} />
        <meshStandardMaterial map={texA} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.18, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.46]} />
        <meshStandardMaterial map={texB} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* the page mid-turn */}
      <group ref={flip} position={[0, 0.004, 0]}>
        <mesh geometry={geo} position={[0.17, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial map={texB} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* the exact line, found */}
      <mesh ref={marker} position={[0.18, -0.03, 0.003]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.28, 0.012]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} toneMapped={false} />
      </mesh>

      <mesh ref={blade} position={[0.18, 0.5, -0.12]}>
        <boxGeometry args={[0.03, 0.34, 0.006]} />
        <meshStandardMaterial
          color="#1d242c"
          metalness={0.9}
          roughness={0.3}
          emissive={ACCENT}
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------- 2. progress */

const ARC_SEGMENTS = 64;

export function ProgressDemo({ reveal }) {
  const fill = useRef();
  const slabs = useRef([]);

  const trackGeo = useMemo(
    () => new THREE.RingGeometry(0.24, 0.29, ARC_SEGMENTS, 1, Math.PI / 2, TAU),
    []
  );
  // The sweep is drawn by growing the index draw range — no geometry rebuilds
  // per frame, and the arc genuinely fills rather than fading in.
  const arcGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.235, 0.295, ARC_SEGMENTS, 1, Math.PI / 2, -TAU);
    g.setDrawRange(0, 0);
    return g;
  }, []);

  useFrame(() => {
    const r = reveal.current;
    const target = 0.61 * easeOutCubic(clamp((r - 0.15) / 0.7));

    arcGeo.setDrawRange(0, Math.max(0, Math.floor(target * ARC_SEGMENTS) * 6));

    if (fill.current) {
      fill.current.scale.y = Math.max(target, 0.001);
      fill.current.position.y = -0.29 + target * 0.29;
      if (fill.current.material) fill.current.material.opacity = r;
    }
    slabs.current.forEach((m, i) => {
      if (!m?.material) return;
      const lit = clamp((target * 7 - i) * 1.6);
      m.material.emissiveIntensity = lit * 1.5;
      m.position.x = lerp(0, 0.02, lit);
    });
  });

  return (
    <group>
      {/* the arc */}
      <mesh geometry={trackGeo}>
        <meshBasicMaterial color="#1d3448" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={arcGeo} position={[0, 0, 0.001]}>
        <meshBasicMaterial color={ACCENT} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* a spine of chapters, filling from the bottom */}
      <group position={[0.52, 0, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[0.1, 0.6]} />
          <meshBasicMaterial color="#122334" transparent opacity={0.9} />
        </mesh>
        <mesh ref={fill} scale={[1, 0.001, 1]}>
          <planeGeometry args={[0.1, 0.58]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0} toneMapped={false} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              slabs.current[i] = el;
            }}
            position={[0.14, -0.26 + i * 0.086, 0]}
          >
            <boxGeometry args={[0.11, 0.052, 0.03]} />
            <meshStandardMaterial
              color="#22303c"
              emissive={ACCENT}
              emissiveIntensity={0}
              roughness={0.5}
              metalness={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------ 3. vocabulary */

export function VocabularyDemo({ reveal }) {
  const word = useRef();
  const underline = useRef();
  const card = useRef();
  const shards = useRef([]);

  const wordTex = useMemo(() => wordTexture('ephemeral', '#f0e4c8'), []);
  const defTex = useMemo(() => wordTexture('lasting a very short time', '#9fd8ff'), []);
  const pageTex = useMemo(() => pageTexture(15, { density: 1.5 }), []);

  useFrame((state) => {
    const r = reveal.current;
    const t = state.clock.elapsedTime;
    const lift = easeOutCubic(clamp((r - 0.2) / 0.5));
    const open = easeOutCubic(clamp((r - 0.45) / 0.5));

    if (word.current) {
      word.current.position.z = lift * 0.16;
      word.current.position.y = 0.02 + lift * 0.1;
      if (word.current.material) word.current.material.opacity = 0.35 + r * 0.65;
    }
    if (underline.current) {
      underline.current.scale.x = Math.max(lift, 0.001);
      if (underline.current.material) underline.current.material.opacity = lift;
    }
    if (card.current) {
      card.current.position.x = lerp(0, 0.34, open);
      card.current.position.y = -0.14;
      card.current.scale.setScalar(Math.max(open, 0.001));
      card.current.rotation.y = lerp(0.5, 0.06, open);
    }
    shards.current.forEach((m, i) => {
      if (!m) return;
      const a = t * 0.3 + i * 2.1;
      m.position.set(
        Math.cos(a) * 0.3 * open,
        0.16 + Math.sin(a * 1.3) * 0.08,
        0.12 + Math.sin(a) * 0.1 * open
      );
      m.rotation.set(a, a * 0.7, 0);
      if (m.material) m.material.opacity = open * 0.5;
    });
  });

  return (
    <group>
      {/* the page the word lives on */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[0.66, 0.44]} />
        <meshStandardMaterial map={pageTex} roughness={0.95} />
      </mesh>

      <mesh ref={word} position={[0, 0.02, 0.01]}>
        <planeGeometry args={[0.44, 0.11]} />
        <meshBasicMaterial
          map={wordTex}
          transparent
          opacity={0.4}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={underline} position={[0, -0.045, 0.012]} scale={[0.001, 1, 1]}>
        <planeGeometry args={[0.3, 0.008]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} toneMapped={false} />
      </mesh>

      {/* the definition, projected clear of the page */}
      <group ref={card} position={[0, -0.14, 0.16]} scale={0.001}>
        <mesh>
          <planeGeometry args={[0.56, 0.14]} />
          <meshBasicMaterial color="#0a1a2a" transparent opacity={0.62} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[0.52, 0.13]} />
          <meshBasicMaterial map={defTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[-0.28, 0, 0.003]}>
          <planeGeometry args={[0.006, 0.14]} />
          <meshBasicMaterial color={ACCENT} toneMapped={false} />
        </mesh>
      </group>

      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            shards.current[i] = el;
          }}
        >
          <planeGeometry args={[0.05, 0.012]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------- 4. notes */

export function NotesDemo({ reveal }) {
  const pins = useRef([]);
  const thread = useRef();
  const pageTex = useMemo(() => pageTexture(18, { density: 1.5 }), []);

  const anchors = useMemo(
    () => [
      [-0.16, 0.12],
      [0.09, 0.02],
      [-0.06, -0.11],
    ],
    []
  );

  // Two segments joining three pins: (a0,a1) and (a1,a2).
  const threadGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
    return g;
  }, []);

  useFrame((state) => {
    const r = reveal.current;
    const t = state.clock.elapsedTime;
    const pos = threadGeo.attributes.position;

    pins.current.forEach((g, i) => {
      if (!g) return;
      const local = easeOutCubic(clamp((r - 0.18 - i * 0.16) / 0.4));
      const [x, y] = anchors[i];
      g.position.set(x, y, lerp(0.34, 0.012, local));
      g.scale.setScalar(Math.max(local, 0.001));
      const halo = g.children[1];
      if (halo?.material) {
        halo.material.opacity = local * (0.35 + Math.sin(t * 2 + i) * 0.12);
        halo.scale.setScalar(1 + Math.sin(t * 1.6 + i) * 0.12);
      }
    });
    const [a0, a1, a2] = anchors;
    pos.setXYZ(0, a0[0], a0[1], 0.014);
    pos.setXYZ(1, a1[0], a1[1], 0.014);
    pos.setXYZ(2, a1[0], a1[1], 0.014);
    pos.setXYZ(3, a2[0], a2[1], 0.014);
    pos.needsUpdate = true;

    if (thread.current?.material) {
      thread.current.material.opacity = clamp((r - 0.55) / 0.35) * 0.8;
    }
  });

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.62, 0.46]} />
        <meshStandardMaterial map={pageTex} roughness={0.95} />
      </mesh>

      {anchors.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            pins.current[i] = el;
          }}
        >
          <mesh>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial
              color="#0d2233"
              emissive={ACCENT}
              emissiveIntensity={2.2}
              roughness={0.3}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[0.026, 0.036, 20]} />
            <meshBasicMaterial
              color={ACCENT}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          {/* the marked line under the pin */}
          <mesh position={[0.07, -0.022, 0]}>
            <planeGeometry args={[0.16, 0.007]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.75} toneMapped={false} />
          </mesh>
        </group>
      ))}

      <lineSegments ref={thread} geometry={threadGeo}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------- 5. reminders */

export function RemindersDemo({ reveal }) {
  const hand = useRef();
  const ping = useRef();
  const dots = useRef([]);

  useFrame((state) => {
    const r = reveal.current;
    const t = state.clock.elapsedTime;

    if (hand.current) hand.current.rotation.z = -t * 0.55;
    if (ping.current) {
      const cycle = (t * 0.42) % 1;
      ping.current.scale.setScalar(0.24 + cycle * 1.5);
      if (ping.current.material) ping.current.material.opacity = (1 - cycle) * 0.5 * r;
    }
    dots.current.forEach((m, i) => {
      if (!m?.material) return;
      // seven days; the streak lights up left to right
      const lit = clamp((r * 8 - i) * 1.4);
      m.material.opacity = 0.15 + lit * 0.85;
      m.scale.setScalar(0.6 + lit * 0.4);
    });
  });

  return (
    <group>
      <mesh>
        <ringGeometry args={[0.26, 0.276, 64]} />
        <meshBasicMaterial color="#1d3448" side={THREE.DoubleSide} />
      </mesh>
      {/* hour ticks — rotated as a group so they sit on the dial, not the hub */}
      {Array.from({ length: 12 }).map((_, i) => (
        <group key={i} rotation={[0, 0, (i * TAU) / 12]}>
          <mesh position={[0, 0.222, 0]}>
            <planeGeometry args={[0.012, i % 3 === 0 ? 0.05 : 0.028]} />
            <meshBasicMaterial color="#3d5c76" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
      <group ref={hand}>
        <mesh position={[0, 0.1, 0.002]}>
          <planeGeometry args={[0.008, 0.2]} />
          <meshBasicMaterial color={ACCENT} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.003]}>
        <circleGeometry args={[0.018, 20]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} />
      </mesh>

      <mesh ref={ping} position={[0, 0, -0.005]}>
        <ringGeometry args={[0.22, 0.25, 48]} />
        <meshBasicMaterial
          color={ACCENT}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* a week of kept promises */}
      <group position={[0, -0.4, 0]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              dots.current[i] = el;
            }}
            position={[-0.24 + i * 0.08, 0, 0]}
          >
            <circleGeometry args={[0.016, 16]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.15} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ----------------------------------------------------- 6. personalisation */

export function PersonalDemo({ reveal }) {
  const nodes = useRef([]);
  const links = useRef();
  const core = useRef();

  const layout = useMemo(() => {
    const rnd = seeded(808);
    return Array.from({ length: 9 }).map((_, i) => ({
      a: (i / 9) * TAU + rnd() * 0.4,
      r: 0.22 + rnd() * 0.24,
      y: (rnd() - 0.5) * 0.34,
      speed: 0.1 + rnd() * 0.18,
      size: 0.011 + rnd() * 0.012,
    }));
  }, []);

  const linkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 2 * 3), 3));
    return g;
  }, []);

  const sprite = useMemo(() => softCircle(), []);

  useFrame((state) => {
    const r = reveal.current;
    const t = state.clock.elapsedTime;
    const pos = linkGeo.attributes.position;

    layout.forEach((d, i) => {
      const g = nodes.current[i];
      if (!g) return;
      const a = d.a + t * d.speed;
      // the constellation contracts toward the reader as it learns them
      const rad = lerp(d.r * 2.1, d.r, easeOutCubic(clamp((r - 0.15) / 0.6)));
      const x = Math.cos(a) * rad;
      const y = d.y * lerp(1.6, 1, r) + Math.sin(t * 0.4 + i) * 0.02;
      const z = Math.sin(a) * rad * 0.5;
      g.position.set(x, y, z);
      g.scale.setScalar(Math.max(r, 0.001));
      pos.setXYZ(i * 2, 0, 0, 0);
      pos.setXYZ(i * 2 + 1, x, y, z);
    });
    pos.needsUpdate = true;

    if (links.current?.material) links.current.material.opacity = clamp((r - 0.3) / 0.5) * 0.35;
    if (core.current) {
      core.current.scale.setScalar(lerp(0.4, 1, r) + Math.sin(t * 1.6) * 0.03 * r);
      if (core.current.material) core.current.material.opacity = r;
    }
  });

  return (
    <group>
      {/* the reader at the centre */}
      <mesh ref={core}>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshStandardMaterial
          color="#0d2233"
          emissive={ACCENT}
          emissiveIntensity={2.4}
          roughness={0.25}
          transparent
        />
      </mesh>

      {layout.map((d, i) => (
        <group
          key={i}
          ref={(el) => {
            nodes.current[i] = el;
          }}
        >
          <mesh>
            <sphereGeometry args={[d.size, 10, 10]} />
            <meshStandardMaterial
              color="#12293d"
              emissive={ACCENT}
              emissiveIntensity={1.4}
              roughness={0.4}
            />
          </mesh>
          <sprite scale={[0.09, 0.09, 1]}>
            <spriteMaterial
              map={sprite}
              color={ACCENT}
              transparent
              opacity={0.35}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}

      <lineSegments ref={links} geometry={linkGeo}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0} toneMapped={false} />
      </lineSegments>
    </group>
  );
}
