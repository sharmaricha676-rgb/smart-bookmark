import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Bookmark } from '../objects/Bookmark.jsx';
import { OpenBook } from '../objects/Book.jsx';
import { HoloPanel } from '../objects/HoloPanel.jsx';
import { Dust } from '../objects/Dust.jsx';
import { holoChip, softCircle, glint } from '../../lib/textures.js';
import { useQuality } from '../../hooks/useTier.js';
import { scroll } from '../../lib/scroll.js';
import { range, lerp, damp, easeOutCubic, easeOutBack, seeded, TAU } from '../../lib/math.js';

const ORIGIN = [0, 1.35, -34];

/**
 * Scene 3 — activation.
 *
 * The beat order matters more than any single effect:
 *   settle → the book lands and the noise stops
 *   rise   → the bookmark lifts out of the gutter, slowly, with weight
 *   spin   → one deliberate rotation as it orients itself
 *   charge → the light channel fills and the lens opens
 *   project→ readouts unfold around it
 * Each stage is a separate window on the scroll, so the user's own scrolling
 * is what performs the sequence rather than a timer.
 */
export function ActivationScene() {
  const quality = useQuality();
  const group = useRef();
  const markGroup = useRef();
  const halo = useRef();
  const floor = useRef();
  const spot = useRef();
  const rim = useRef();
  const orbitRef = useRef();
  const shock = useRef();
  const chargeRef = useRef(0);

  const orbit = useMemo(() => {
    const rnd = seeded(505);
    const n = quality.orbitParticles;
    const positions = new Float32Array(n * 3);
    const scales = new Float32Array(n);
    const seeds = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const r = 0.34 + rnd() * rnd() * 1.15;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (rnd() - 0.5) * 1.2;
      positions[i * 3 + 2] = Math.sin(a) * r;
      scales[i] = 0.3 + rnd() * 1.4;
      seeds[i * 3] = a;
      seeds[i * 3 + 1] = r;
      seeds[i * 3 + 2] = 0.3 + rnd() * 1.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    return geo;
  }, [quality.orbitParticles]);

  const orbitUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCharge: { value: 0 },
      uMap: { value: softCircle() },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  const chips = useMemo(
    () => [
      { tex: holoChip('page', '214'), pos: [-1.32, 0.42, 0.24], rot: [0, 0.5, 0] },
      { tex: holoChip('read', '61%'), pos: [1.32, 0.5, 0.14], rot: [0, -0.5, 0] },
      { tex: holoChip('saved', '18'), pos: [1.18, -0.42, 0.4], rot: [0, -0.44, 0] },
      { tex: holoChip('streak', '9d'), pos: [-1.2, -0.5, 0.36], rot: [0, 0.44, 0] },
    ],
    []
  );

  const glintTex = useMemo(() => glint(), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scroll.smooth;

    const present = Math.min(range(p, 0.285, 0.33), 1 - range(p, 0.47, 0.53));
    const rise = easeOutCubic(range(p, 0.325, 0.395));
    const spin = easeOutCubic(range(p, 0.345, 0.425));
    const charge = easeOutCubic(range(p, 0.365, 0.44));
    const bloom = easeOutBack(range(p, 0.372, 0.43));
    chargeRef.current = damp(chargeRef.current, charge, 6, dt);

    if (group.current) {
      group.current.visible = present > 0.004;
      group.current.scale.setScalar(lerp(0.94, 1, present));
    }

    if (markGroup.current) {
      markGroup.current.position.y = damp(
        markGroup.current.position.y,
        lerp(0.03, 0.72, rise) + Math.sin(t * 0.7) * 0.02 * charge,
        5,
        dt
      );
      // one full, deliberate turn — never a continuous idle spin
      markGroup.current.rotation.y = damp(
        markGroup.current.rotation.y,
        spin * TAU + Math.sin(t * 0.35) * 0.16 * charge,
        4,
        dt
      );
    }

    if (halo.current?.material) {
      halo.current.material.opacity = charge * 0.32;
      halo.current.scale.setScalar(lerp(0.4, 1.5, bloom) + Math.sin(t * 1.4) * 0.03 * charge);
    }
    if (shock.current?.material) {
      // a single expanding ring at the moment the lens opens
      const s = range(p, 0.378, 0.44);
      const eased = easeOutCubic(s);
      shock.current.scale.setScalar(0.2 + eased * 5.6);
      shock.current.material.opacity = s > 0 && s < 1 ? (1 - eased) * 0.45 * present : 0;
      shock.current.rotation.z = t * 0.1;
    }
    if (floor.current?.material) {
      floor.current.material.opacity = present * 0.5;
    }
    if (spot.current) {
      spot.current.intensity = damp(spot.current.intensity, present * (14 + charge * 26), 5, dt);
    }
    if (rim.current) {
      rim.current.intensity = damp(rim.current.intensity, present * (4 + charge * 16), 5, dt);
    }

    orbitUniforms.uTime.value = t;
    orbitUniforms.uCharge.value = damp(orbitUniforms.uCharge.value, charge * present, 5, dt);
    if (orbitRef.current) orbitRef.current.rotation.y = t * 0.14;
  });

  return (
    <group ref={group} position={ORIGIN}>
      {/* the book, landed and still */}
      <group position={[0, -0.62, 0]}>
        <OpenBook
          width={0.62}
          height={0.86}
          segments={quality.pageSegments}
          coverHue={210}
          pageVariant={3}
          breathe={0.35}
        />
      </group>

      {/* pool of light the book is resting in */}
      <mesh
        ref={floor}
        position={[0, -0.66, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <circleGeometry args={[3.2, 48]} />
        <meshBasicMaterial
          color="#2d6a9a"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* the hero */}
      <group ref={markGroup}>
        <Bookmark charge={chargeRef.current} tilt={0.06} responsive scale={1.25} />

        <mesh ref={halo} raycast={() => null}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial
            map={glintTex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* single expanding shock ring */}
      <mesh ref={shock} position={[0, 0.2, -0.1]} raycast={() => null}>
        <ringGeometry args={[0.46, 0.5, 64]} />
        <meshBasicMaterial
          color="#8fd6ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* orbiting motes, GPU-animated */}
      <points
        ref={orbitRef}
        geometry={orbit}
        position={[0, 0.3, 0]}
        raycast={() => null}
        frustumCulled={false}
      >
        <shaderMaterial
          args={[
            {
              uniforms: orbitUniforms,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              vertexShader: /* glsl */ `
                uniform float uTime; uniform float uCharge; uniform float uPixelRatio;
                attribute float aScale; attribute vec3 aSeed;
                varying float vA;
                void main() {
                  float a = aSeed.x + uTime * (0.16 + aSeed.z * 0.24);
                  float r = aSeed.y * mix(1.5, 1.0, uCharge);
                  vec3 p = vec3(cos(a) * r, position.y + sin(uTime * 0.5 + aSeed.x) * 0.16, sin(a) * r);
                  p.y += uCharge * 0.35;
                  vec4 mv = modelViewMatrix * vec4(p, 1.0);
                  gl_Position = projectionMatrix * mv;
                  gl_PointSize = 18.0 * aScale * uPixelRatio * (1.0 / max(-mv.z, 0.1));
                  vA = uCharge * (0.35 + aScale * 0.45);
                }
              `,
              fragmentShader: /* glsl */ `
                uniform sampler2D uMap;
                varying float vA;
                void main() {
                  vec4 tex = texture2D(uMap, gl_PointCoord);
                  float a = tex.a * vA;
                  if (a < 0.01) discard;
                  gl_FragColor = vec4(vec3(0.75, 0.9, 1.0), a);
                }
              `,
            },
          ]}
        />
      </points>

      {/* projected readouts */}
      {chips.map((c, i) => (
        <HoloPanel
          key={i}
          texture={c.tex}
          width={0.62}
          height={0.34}
          position={c.pos}
          rotation={c.rot}
          revealRange={[0.385 + i * 0.008, 0.425 + i * 0.008, 0.47, 0.52]}
          parallax={0.03 + i * 0.008}
          intensity={0.9}
        />
      ))}

      <Dust
        count={Math.round(quality.dust * 0.3)}
        area={[6, 4, 6]}
        color="#a8d8ff"
        size={18}
        opacity={0.5}
        seed={91}
        visibleRange={[0.3, 0.53]}
        fade={0.2}
      />

      <spotLight
        ref={spot}
        position={[0, 4.2, 1.6]}
        angle={0.5}
        penumbra={0.9}
        intensity={0}
        distance={14}
        decay={2}
        color="#cfe6ff"
        castShadow={quality.shadows}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
      />
      <pointLight
        ref={rim}
        position={[0, 0.3, -1.6]}
        intensity={0}
        distance={7}
        decay={2}
        color="#5aa8ff"
      />
    </group>
  );
}
