import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { softCircle } from '../../lib/textures.js';
import { seeded, range, clamp } from '../../lib/math.js';
import { scroll } from '../../lib/scroll.js';
import { pointer } from '../../hooks/usePointer.js';

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uParallax;
  uniform float uTurbulence;
  attribute float aScale;
  attribute vec3 aSeed;
  varying float vFade;

  void main() {
    vec3 p = position;
    float s = aSeed.x * 6.2831;
    float s2 = aSeed.y * 6.2831;
    p.x += sin(uTime * 0.13 + s) * aSeed.z * (0.7 + uTurbulence * 2.2);
    p.y += sin(uTime * 0.11 + s2) * aSeed.z * (0.5 + uTurbulence * 1.6);
    p.z += cos(uTime * 0.09 + s) * aSeed.y * (0.7 + uTurbulence * 2.2);
    p.xy += uParallax * (0.25 + aScale * 0.5);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.1);
    gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / dist);
    // fade out very close and very far so particles never pop
    vFade = smoothstep(0.4, 1.6, dist) * (1.0 - smoothstep(14.0, 34.0, dist));
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vFade;

  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    float a = tex.a * uOpacity * vFade;
    if (a < 0.006) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Motes of dust / light. Animated entirely on the GPU so even the 1400-particle
 * desktop field costs nothing per frame on the CPU.
 *
 * `visibleRange` ties the field's opacity to the scroll timeline, which is how
 * warm library dust hands over to cold paper debris without a hard cut.
 */
export function Dust({
  count = 800,
  area = [12, 6, 20],
  color = '#e8d3a8',
  size = 26,
  opacity = 0.55,
  seed = 7,
  turbulence = 0,
  visibleRange,
  fade = 0.18,
  ...props
}) {
  const mat = useRef();

  const geometry = useMemo(() => {
    const rnd = seeded(seed);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * area[0];
      positions[i * 3 + 1] = (rnd() - 0.5) * area[1];
      positions[i * 3 + 2] = (rnd() - 0.5) * area[2];
      scales[i] = 0.35 + rnd() * rnd() * 1.9;
      seeds[i * 3] = rnd();
      seeds[i * 3 + 1] = rnd();
      seeds[i * 3 + 2] = 0.15 + rnd() * 0.7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.max(area[0], area[1], area[2]));
    return geo;
  }, [count, area, seed]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uMap: { value: softCircle() },
      uOpacity: { value: visibleRange ? 0 : opacity },
      uColor: { value: new THREE.Color(color) },
      uParallax: { value: new THREE.Vector2() },
      uTurbulence: { value: turbulence },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, dt) => {
    const u = uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uParallax.value.set(pointer.x * 0.16, pointer.y * 0.1);
    if (visibleRange) {
      const [a, b] = visibleRange;
      const t = scroll.smooth;
      const inn = range(t, a, a + (b - a) * fade);
      const out = 1 - range(t, b - (b - a) * fade, b);
      u.uOpacity.value +=
        (clamp(Math.min(inn, out)) * opacity - u.uOpacity.value) * Math.min(dt * 4, 1);
    }
  });

  return (
    <points geometry={geometry} raycast={() => null} frustumCulled={false} {...props}>
      <shaderMaterial
        ref={mat}
        args={[
          {
            uniforms,
            vertexShader: VERT,
            fragmentShader: FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}
