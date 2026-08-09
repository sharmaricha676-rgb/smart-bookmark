import { create } from 'zustand';

/**
 * React-side state only. Deliberately coarse: nothing here updates per frame,
 * so component trees stay quiet while the scene animates.
 */
export const useStore = create((set) => ({
  // --- loading ---------------------------------------------------------------
  /** True once the renderer exists and the first frame has been drawn. */
  ready: false,
  setReady: () => set({ ready: true }),
  entered: false,
  enter: () => set({ entered: true }),

  // --- device tier -----------------------------------------------------------
  tier: 'high', // 'high' | 'mid' | 'low'
  setTier: (tier) => set({ tier }),

  // --- journey ---------------------------------------------------------------
  sceneIndex: 0,
  setSceneIndex: (sceneIndex) => set((s) => (s.sceneIndex === sceneIndex ? s : { sceneIndex })),

  hasScrolled: false,
  markScrolled: () => set((s) => (s.hasScrolled ? s : { hasScrolled: true })),

  // --- reading challenge -----------------------------------------------------
  /** 'idle' | 'wrong' | 'solved' */
  gameState: 'idle',
  attempts: 0,
  lastPick: -1,
  hinted: false,
  solvedAt: 0,
  /** Timestamp of the most recent pick — drives the 3D feedback animation. */
  pickedAt: 0,
  registerPick: (index, correct) =>
    set((s) => {
      if (s.gameState === 'solved') return s;
      const now = performance.now();
      if (correct) {
        return { gameState: 'solved', lastPick: index, solvedAt: now, pickedAt: now };
      }
      const attempts = s.attempts + 1;
      return {
        gameState: 'wrong',
        attempts,
        lastPick: index,
        hinted: attempts >= 2,
        pickedAt: now,
      };
    }),
  skipChallenge: () =>
    set({ gameState: 'solved', solvedAt: performance.now(), pickedAt: performance.now() }),
  resetGame: () =>
    set({ gameState: 'idle', attempts: 0, lastPick: -1, hinted: false, pickedAt: 0 }),

  // --- full reset ------------------------------------------------------------
  resetAll: () =>
    set({
      sceneIndex: 0,
      gameState: 'idle',
      attempts: 0,
      lastPick: -1,
      hinted: false,
      pickedAt: 0,
      hasScrolled: false,
    }),
}));
