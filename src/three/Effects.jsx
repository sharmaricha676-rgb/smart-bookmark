import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  DepthOfField,
  ChromaticAberration,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useQuality } from '../hooks/useTier.js';
import { scroll } from '../lib/scroll.js';
import { range, clamp, damp, lerp } from '../lib/math.js';

/**
 * Post pipeline.
 *
 * Two passes actually carry story weight and are animated by scroll:
 *  - chromatic aberration peaks inside the chaos scene and clears the instant
 *    the bookmark activates, which is most of why "calm" lands;
 *  - depth of field pulls focus tighter for the hero shots.
 * Everything else is held steady so the image never looks busy.
 */
export function Effects() {
  const quality = useQuality();
  const ca = useRef();
  const dof = useRef();
  const bloom = useRef();
  const caOffset = useMemo(() => new THREE.Vector2(0.0004, 0.0004), []);

  useFrame((_, dt) => {
    const p = scroll.smooth;

    // Chaos builds from 0.15 and resolves the moment the bookmark activates.
    const chaos = Math.min(range(p, 0.15, 0.24), 1 - range(p, 0.3, 0.355));
    if (ca.current?.offset) {
      const amt = clamp(chaos) * 0.0026 + clamp(Math.abs(scroll.velocity) * 1.4) * 0.0007;
      ca.current.offset.x = damp(ca.current.offset.x, amt, 6, dt);
      ca.current.offset.y = damp(ca.current.offset.y, amt * 0.6, 6, dt);
    }

    if (bloom.current) {
      const hero = Math.max(
        Math.min(range(p, 0.32, 0.4), 1 - range(p, 0.46, 0.52)),
        range(p, 0.93, 0.99)
      );
      bloom.current.intensity = damp(bloom.current.intensity, lerp(0.55, 1.3, hero), 4, dt);
    }

    const coc = dof.current?.circleOfConfusionMaterial;
    if (coc) {
      const near = Math.max(range(p, 0.06, 0.13), range(p, 0.36, 0.45), range(p, 0.72, 0.78));
      const wide = range(p, 0.83, 0.9);
      const focus = lerp(lerp(0.03, 0.013, near), 0.055, wide);
      // Written through the uniform so this holds across postprocessing
      // versions that expose the setter differently.
      const uniform = coc.uniforms?.get?.('focusDistance') ?? coc.uniforms?.focusDistance;
      if (uniform) uniform.value = damp(uniform.value, focus, 4, dt);
      else coc.focusDistance = focus;
    }
  });

  if (!quality.postFx) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {quality.depthOfField && (
        <DepthOfField
          ref={dof}
          focusDistance={0.024}
          focalLength={0.035}
          bokehScale={3.0}
          height={480}
        />
      )}
      <Bloom
        ref={bloom}
        intensity={0.6}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.3}
        mipmapBlur
        radius={0.72}
      />
      <ChromaticAberration
        ref={ca}
        blendFunction={BlendFunction.NORMAL}
        offset={caOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      {quality.grain && (
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.3} />
      )}
      <Vignette eskil={false} offset={0.25} darkness={0.88} />
    </EffectComposer>
  );
}
