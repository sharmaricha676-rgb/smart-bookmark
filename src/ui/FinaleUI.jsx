import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from '../state/store.js';
import { onScrollTick, resetScrollState } from '../lib/scroll.js';
import { scrollToStart } from '../hooks/useSmoothScroll.js';
import { range, clamp, easeOutCubic } from '../lib/math.js';

/**
 * The two closing lines and the way back.
 *
 * The lines cross-fade against each other on scroll rather than appearing
 * together, so the second one lands as a reply to the first.
 */
export function FinaleUI({ lenisRef }) {
  const resetAll = useStore((s) => s.resetAll);
  const [resetting, setResetting] = useState(false);
  const root = useRef();
  const lineA = useRef();
  const lineB = useRef();
  const cta = useRef();

  useEffect(
    () =>
      onScrollTick((p) => {
        const enter = easeOutCubic(range(p, 0.9, 0.945));
        const swap = easeOutCubic(range(p, 0.955, 0.985));
        const ctaIn = easeOutCubic(range(p, 0.972, 0.996));

        if (root.current) {
          root.current.style.opacity = enter.toFixed(3);
          root.current.style.visibility = enter < 0.004 ? 'hidden' : 'visible';
        }
        if (lineA.current) {
          const v = clamp(1 - swap);
          lineA.current.style.opacity = v.toFixed(3);
          lineA.current.style.transform = `translate3d(0, ${(-10 * swap).toFixed(1)}px, 0)`;
        }
        if (lineB.current) {
          lineB.current.style.opacity = swap.toFixed(3);
          lineB.current.style.transform = `translate3d(0, ${(14 * (1 - swap)).toFixed(1)}px, 0)`;
        }
        if (cta.current) {
          cta.current.style.opacity = ctaIn.toFixed(3);
          cta.current.style.pointerEvents = ctaIn > 0.7 ? 'auto' : 'none';
        }
      }),
    []
  );

  const handleReset = () => {
    if (resetting) return;
    setResetting(true);
    // Fade the overlay out first so the reset reads as the world travelling
    // back, not as the interface blinking.
    gsap.to(root.current, { opacity: 0, duration: 0.5, ease: 'power2.out' });
    scrollToStart(lenisRef, () => {
      resetScrollState();
      resetAll();
      setResetting(false);
    });
  };

  return (
    <div ref={root} className="finale">
      <div style={{ position: 'relative', minHeight: '5.5em' }}>
        <h2 ref={lineA} className="copy-title" style={{ position: 'absolute', inset: 0 }}>
          A bookmark that doesn&rsquo;t just remember where you stopped.
        </h2>
        <h2
          ref={lineB}
          className="copy-title"
          style={{ position: 'absolute', inset: 0, opacity: 0 }}
        >
          It helps you remember what matters.
        </h2>
      </div>
      <button
        ref={cta}
        type="button"
        className="cta"
        onClick={handleReset}
        disabled={resetting}
        style={{ opacity: 0 }}
      >
        <span>{resetting ? 'Returning' : 'Explore Again'}</span>
      </button>
    </div>
  );
}
