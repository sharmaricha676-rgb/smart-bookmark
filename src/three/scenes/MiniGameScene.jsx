import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Bookmark } from '../objects/Bookmark.jsx';
import { Dust } from '../objects/Dust.jsx';
import { challengePage } from '../../lib/textures.js';
import {
  CHALLENGE_LINES,
  CHALLENGE_LAYOUT,
  CORRECT_INDEX,
  bandBounds,
} from '../../lib/challenge.js';
import { useStore } from '../../state/store.js';
import { useQuality } from '../../hooks/useTier.js';
import { scroll } from '../../lib/scroll.js';
import { ANCHORS } from '../../lib/timeline.js';
import { range, clamp, lerp, damp, easeOutCubic } from '../../lib/math.js';

const PAGE_W = 1.34;
const PAGE_H = 1.675; // 1024 x 1280
const ACTIVE_FROM = 0.705;
const ACTIVE_TO = 0.815;

/**
 * Scene 5 — the reading challenge.
 *
 * A real one-question game, not a quiz overlay: the passage is printed on the
 * page in 3D, the six lines are physically clickable bands on that page, and
 * the bookmark itself is the reward — it flies in and clips onto whichever line
 * you got right. Wrong picks give the line a red shudder and hand control
 * straight back, so failing costs nothing but a second.
 */
export function MiniGameScene() {
  const quality = useQuality();
  const group = useRef();
  const bars = useRef([]);
  const glows = useRef([]);
  const bookmarkRef = useRef();
  const successRing = useRef();
  const spot = useRef();
  const hover = useRef(-1);
  const shake = useRef(0);

  const pageTex = useMemo(() => challengePage(), []);

  /**
   * Convert the texture's pixel layout into local plane coordinates. Both the
   * printed page and these hit-zones come from `bandBounds`, so they cannot
   * drift apart when the passage is rewritten.
   */
  const bands = useMemo(() => {
    const { height, bandHeight } = CHALLENGE_LAYOUT;
    return CHALLENGE_LINES.map((line, i) => ({
      ...line,
      index: i,
      y: ((height / 2 - bandBounds(i).centre) / height) * PAGE_H,
      h: (bandHeight / height) * PAGE_H,
    }));
  }, []);

  const isLive = () => {
    const p = scroll.smooth;
    return p > ACTIVE_FROM && p < ACTIVE_TO;
  };

  const handlePick = (e, band) => {
    e.stopPropagation();
    if (!isLive()) return;
    const st = useStore.getState();
    if (st.gameState === 'solved') return;
    st.registerPick(band.index, band.correct);
    if (!band.correct) shake.current = 1;
  };

  const handleOver = (e, band) => {
    e.stopPropagation();
    if (!isLive() || useStore.getState().gameState === 'solved') return;
    hover.current = band.index;
    document.body.style.cursor = 'pointer';
  };

  const handleOut = (e, band) => {
    e.stopPropagation();
    if (hover.current === band.index) hover.current = -1;
    document.body.style.cursor = '';
  };

  useFrame((state, dt) => {
    const p = scroll.smooth;
    const t = state.clock.elapsedTime;
    const st = useStore.getState();
    const alive = Math.min(range(p, 0.68, 0.72), 1 - range(p, 0.82, 0.86));
    const solved = st.gameState === 'solved';
    const since = st.pickedAt ? (performance.now() - st.pickedAt) / 1000 : 99;

    if (group.current) group.current.visible = alive > 0.004;
    if (spot.current) spot.current.intensity = damp(spot.current.intensity, alive * 22, 4, dt);

    // Never leave a pointer cursor behind after scrolling away mid-hover.
    if ((!isLive() || solved) && hover.current !== -1) {
      hover.current = -1;
      document.body.style.cursor = '';
    }

    shake.current = damp(shake.current, 0, 7, dt);

    bars.current.forEach((mesh, i) => {
      if (!mesh?.material) return;
      const band = bands[i];
      const hovered = hover.current === i && !solved && isLive();
      const isWrongPick = st.gameState === 'wrong' && st.lastPick === i && since < 1.1;
      const isRightPick = solved && st.lastPick === i;
      // After two misses the correct line starts breathing very faintly — a
      // nudge rather than an answer.
      const nudged = st.hinted && !solved && band.correct;

      let target = hovered ? 0.16 : 0;
      let color = 0;
      if (nudged) target = Math.max(target, 0.05 + Math.sin(t * 1.7) * 0.035);
      if (isWrongPick) {
        target = 0.34 * Math.max(0, 1 - since / 1.1);
        color = 1;
      }
      if (isRightPick) {
        target = 0.3 + Math.sin(t * 2.2) * 0.05;
        color = 2;
      }

      mesh.material.opacity = damp(mesh.material.opacity, target * alive, 12, dt);
      mesh.material.color.set(color === 1 ? '#ff7a5e' : color === 2 ? '#ffd48a' : '#8fd6ff');
      mesh.position.x =
        isWrongPick && shake.current > 0.01 ? Math.sin(t * 46) * 0.012 * shake.current : 0;

      const glow = glows.current[i];
      if (glow?.material) {
        glow.material.opacity = damp(
          glow.material.opacity,
          (isRightPick ? 0.9 : hovered ? 0.5 : nudged ? 0.4 : 0.18) * alive,
          10,
          dt
        );
        glow.scale.x = damp(glow.scale.x, isRightPick ? 1 : hovered ? 0.55 : 0.16, 8, dt);
        glow.material.color.set(isRightPick ? '#ffd48a' : '#8fd6ff');
      }
    });

    // The bookmark arrives and clips onto the answer.
    if (bookmarkRef.current) {
      const land = solved ? easeOutCubic(clamp(since / 1.25)) : 0;
      const band = bands[st.lastPick] ?? bands[CORRECT_INDEX];
      bookmarkRef.current.visible = land > 0.001;
      bookmarkRef.current.position.set(
        lerp(0.95, -PAGE_W / 2 + 0.075, land),
        lerp(1.1, band.y, land),
        lerp(0.55, 0.028, land)
      );
      bookmarkRef.current.rotation.z = lerp(-0.9, 0, land);
      bookmarkRef.current.scale.setScalar(lerp(0.5, 0.42, land));
    }

    if (successRing.current?.material) {
      const s = solved ? clamp(since / 1.4) : 0;
      const band = bands[st.lastPick] ?? bands[CORRECT_INDEX];
      successRing.current.position.y = band.y;
      successRing.current.scale.setScalar(0.15 + easeOutCubic(s) * 3.4);
      successRing.current.material.opacity = s > 0 && s < 1 ? (1 - easeOutCubic(s)) * 0.5 : 0;
    }
  });

  return (
    <group
      ref={group}
      position={[ANCHORS.challenge[0], ANCHORS.challenge[1], ANCHORS.challenge[2]]}
      rotation={[-0.26, 0, 0]}
    >
      {/* lectern */}
      <mesh position={[0, -0.06, -0.06]} rotation={[0.26, 0, 0]} receiveShadow>
        <boxGeometry args={[PAGE_W + 0.3, 0.06, PAGE_H + 0.28]} />
        <meshStandardMaterial color="#2a1d12" roughness={0.7} metalness={0.08} />
      </mesh>

      {/* the page */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshStandardMaterial map={pageTex} roughness={0.94} />
      </mesh>

      {/* per-line highlight bar, marker rule, and hit zone */}
      {bands.map((band, i) => (
        <group key={band.text} position={[0, band.y, 0]}>
          <mesh
            ref={(el) => {
              bars.current[i] = el;
            }}
            position={[0, 0, 0.004]}
            raycast={() => null}
          >
            <planeGeometry args={[PAGE_W * 0.93, band.h * 0.86]} />
            <meshBasicMaterial
              color="#8fd6ff"
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* the marginal rule that grows as you consider a line */}
          <mesh
            ref={(el) => {
              glows.current[i] = el;
            }}
            position={[-PAGE_W / 2 + 0.03, 0, 0.006]}
            scale={[0.16, 1, 1]}
            raycast={() => null}
          >
            <planeGeometry args={[0.012, band.h * 0.8]} />
            <meshBasicMaterial
              color="#8fd6ff"
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          <mesh
            position={[0, 0, 0.02]}
            onPointerDown={(e) => handlePick(e, band)}
            onPointerOver={(e) => handleOver(e, band)}
            onPointerOut={(e) => handleOut(e, band)}
          >
            <planeGeometry args={[PAGE_W * 0.95, band.h]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* the reward */}
      <group ref={bookmarkRef} position={[0.95, 1.1, 0.55]}>
        <Bookmark charge={1} tilt={0} responsive={false} scale={0.42} />
      </group>

      <mesh ref={successRing} position={[0, 0, 0.03]} raycast={() => null}>
        <ringGeometry args={[0.3, 0.34, 48]} />
        <meshBasicMaterial
          color="#ffd48a"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <Dust
        count={Math.round(quality.dust * 0.25)}
        area={[5, 4, 4]}
        position={[0, 0.4, 0.8]}
        color="#d8c8a0"
        size={16}
        opacity={0.4}
        seed={131}
        visibleRange={[0.68, 0.86]}
        fade={0.2}
      />

      <spotLight
        ref={spot}
        position={[0.4, 2.2, 2.6]}
        angle={0.55}
        penumbra={0.85}
        intensity={0}
        distance={9}
        decay={2}
        color="#ffe6c0"
        castShadow={quality.shadows}
        shadow-mapSize={[512, 512]}
      />
      <pointLight
        position={[-1.4, 0.4, 1.4]}
        intensity={2.4}
        distance={6}
        decay={2}
        color="#6f9ccc"
      />
    </group>
  );
}
