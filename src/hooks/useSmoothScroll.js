import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useStore } from '../state/store.js';
import { setRawProgress, scroll } from '../lib/scroll.js';
import { GATE_PROGRESS, SCROLL_VIEWPORTS, sceneIndexAt } from '../lib/timeline.js';

/**
 * Smooth scroll + the challenge gate.
 *
 * The gate is implemented by shrinking the scroll spacer rather than by
 * fighting the user's input: while the challenge is unsolved the page simply
 * is not tall enough to scroll past it. No snapping, no jitter, and the
 * scrollbar tells the truth. Solving it grows the page back and the journey
 * continues from exactly where it was.
 */
export function useSmoothScroll() {
  const gameState = useStore((s) => s.gameState);
  const entered = useStore((s) => s.entered);
  const setSceneIndex = useStore((s) => s.setSceneIndex);
  const markScrolled = useStore((s) => s.markScrolled);
  const lenisRef = useRef(null);
  const metricsRef = useRef({ full: 0, denom: 1 });
  const gatedRef = useRef(gameState !== 'solved');

  gatedRef.current = gameState !== 'solved';

  useEffect(() => {
    const spacer = document.getElementById('scroll-spacer');
    if (!spacer) return undefined;

    const lenis = new Lenis({
      duration: 1.15,
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      syncTouch: false,
      gestureOrientation: 'vertical',
    });
    lenisRef.current = lenis;

    const measure = () => {
      const vh = window.innerHeight;
      const full = vh * SCROLL_VIEWPORTS;
      metricsRef.current = { full, denom: Math.max(full - vh, 1) };
      applyHeight();
      lenis.resize();
    };

    const applyHeight = () => {
      const { full, denom } = metricsRef.current;
      const vh = window.innerHeight;
      const height = gatedRef.current ? Math.round(GATE_PROGRESS * denom) + vh : full;
      spacer.style.height = `${height}px`;
    };

    const onScroll = ({ scroll: y }) => {
      const p = y / metricsRef.current.denom;
      setRawProgress(p);
      if (p > 0.004) markScrolled();
      setSceneIndex(sceneIndexAt(scroll.smooth));
    };

    lenis.on('scroll', onScroll);
    measure();

    let raf = 0;
    const tick = (time) => {
      lenis.raf(time);
      // keep the scene index in step even when momentum has stopped firing events
      setSceneIndex(sceneIndexAt(scroll.smooth));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [markScrolled, setSceneIndex]);

  // Nothing moves until the reader has chosen to begin.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (entered) lenis.start();
    else lenis.stop();
  }, [entered]);

  // Re-apply the spacer height whenever the gate opens or closes.
  useEffect(() => {
    const spacer = document.getElementById('scroll-spacer');
    const lenis = lenisRef.current;
    if (!spacer || !lenis) return;
    const { full, denom } = metricsRef.current;
    const vh = window.innerHeight;
    spacer.style.height =
      gameState === 'solved' ? `${full}px` : `${Math.round(GATE_PROGRESS * denom) + vh}px`;
    lenis.resize();
  }, [gameState]);

  return lenisRef;
}

/** Animate the page back to the very beginning. Used by "Explore Again". */
export function scrollToStart(lenisRef, onDone) {
  const lenis = lenisRef?.current;
  if (!lenis) {
    window.scrollTo(0, 0);
    onDone?.();
    return;
  }
  const proxy = { y: lenis.scroll };
  gsap.to(proxy, {
    y: 0,
    duration: 2.4,
    ease: 'power3.inOut',
    onUpdate: () => lenis.scrollTo(proxy.y, { immediate: true, force: true }),
    onComplete: () => {
      lenis.scrollTo(0, { immediate: true, force: true });
      onDone?.();
    },
  });
}
