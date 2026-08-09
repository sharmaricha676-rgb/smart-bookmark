import { useEffect } from 'react';
import { useStore } from '../state/store.js';

/**
 * Quality tiers. The story and every interaction stay identical across tiers —
 * only counts, effect passes and resolution change.
 */
export const QUALITY = {
  high: {
    dpr: [1, 2],
    dust: 1400,
    chaosPages: 130,
    chaosWords: 22,
    notes: 26,
    orbitParticles: 260,
    libraryBooks: 1100,
    readers: 46,
    shelfBooks: 220,
    postFx: true,
    depthOfField: true,
    grain: true,
    shadows: true,
    pageSegments: 24,
    envResolution: 128,
  },
  mid: {
    dpr: [1, 1.6],
    dust: 700,
    chaosPages: 78,
    chaosWords: 14,
    notes: 16,
    orbitParticles: 150,
    libraryBooks: 620,
    readers: 28,
    shelfBooks: 130,
    postFx: true,
    depthOfField: false,
    grain: false,
    shadows: true,
    pageSegments: 16,
    envResolution: 96,
  },
  low: {
    dpr: [1, 1.4],
    dust: 320,
    chaosPages: 44,
    chaosWords: 9,
    notes: 10,
    orbitParticles: 80,
    libraryBooks: 300,
    readers: 16,
    shelfBooks: 70,
    postFx: false,
    depthOfField: false,
    grain: false,
    shadows: false,
    pageSegments: 10,
    envResolution: 64,
  },
};

export function detectTier() {
  if (typeof window === 'undefined') return 'high';

  const w = window.innerWidth;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reduced) return 'low';
  if (w < 780 || (coarse && w < 1100)) return 'low';
  if (w < 1280 || cores <= 4 || mem <= 4) return 'mid';
  return 'high';
}

export function useTierDetection() {
  const setTier = useStore((s) => s.setTier);

  useEffect(() => {
    const apply = () => setTier(detectTier());
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [setTier]);
}

/** Read the quality preset for the current tier. */
export function useQuality() {
  const tier = useStore((s) => s.tier);
  return QUALITY[tier] ?? QUALITY.high;
}
