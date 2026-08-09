import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { CameraRig } from './CameraRig.jsx';
import { Atmosphere } from './Atmosphere.jsx';
import { SafeEffects } from './SafeEffects.jsx';
import { LibraryScene } from './scenes/LibraryScene.jsx';
import { ChaosScene } from './scenes/ChaosScene.jsx';
import { ActivationScene } from './scenes/ActivationScene.jsx';
import { FeaturesScene } from './scenes/FeaturesScene.jsx';
import { MiniGameScene } from './scenes/MiniGameScene.jsx';
import { ImpactScene } from './scenes/ImpactScene.jsx';
import { FinaleScene } from './scenes/FinaleScene.jsx';
import { useQuality } from '../hooks/useTier.js';
import { useStore } from '../state/store.js';
import { CAMERA_KEYS } from '../lib/timeline.js';

/**
 * The world.
 *
 * All seven scenes exist in one continuous space along -Z and are mounted for
 * the whole session; each one hides itself when the camera is nowhere near it.
 * Keeping them mounted is what allows scenes to overlap at their seams — the
 * library is still visible in the fog while the page tunnel is already forming
 * ahead — which is most of why the journey has no visible joins.
 */
export function Experience() {
  const quality = useQuality();
  const setReady = useStore((s) => s.setReady);

  return (
    <div className="stage">
      <Canvas
        dpr={quality.dpr}
        shadows={quality.shadows}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        camera={{
          position: CAMERA_KEYS[0].pos,
          fov: CAMERA_KEYS[0].fov,
          near: 0.1,
          far: 220,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          // One frame of headroom so the loader never lifts on a black canvas.
          requestAnimationFrame(() => requestAnimationFrame(setReady));
        }}
      >
        <Suspense fallback={null}>
          <CameraRig />
          <Atmosphere />

          <LibraryScene />
          <ChaosScene />
          <ActivationScene />
          <FeaturesScene />
          <MiniGameScene />
          <ImpactScene />
          <FinaleScene />

          <SafeEffects />
          <Preload all />
        </Suspense>

        <AdaptiveDpr pixelated={false} />
      </Canvas>
    </div>
  );
}
