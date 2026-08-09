import { useEffect, useRef } from 'react';
import { onScrollTick } from '../lib/scroll.js';
import { range, clamp, easeOutCubic, lerp } from '../lib/math.js';

/**
 * A block of copy tied to a window on the scroll timeline.
 *
 * Opacity and a small vertical drift are written straight to the DOM from the
 * shared rAF loop — React never re-renders while you scroll, so the text tracks
 * the camera exactly rather than lagging a frame or two behind it.
 */
export function SceneCopy({ window: win, lede, title, body, align = 'left', className = '' }) {
  const root = useRef();
  const inner = useRef();

  useEffect(() => {
    const [a, b, c, d] = win;
    let last = -1;
    return onScrollTick((p) => {
      const inn = easeOutCubic(range(p, a, b));
      const out = 1 - easeOutCubic(range(p, c, d));
      const v = clamp(Math.min(inn, out));
      if (Math.abs(v - last) < 0.001) return;
      last = v;
      if (root.current) {
        root.current.style.opacity = v.toFixed(3);
        root.current.style.visibility = v < 0.004 ? 'hidden' : 'visible';
      }
      if (inner.current) {
        // rises on the way in, keeps rising on the way out — never bounces back
        const drift = lerp(26, -18, clamp((inn + (1 - out)) / 2));
        inner.current.style.transform = `translate3d(0, ${drift.toFixed(2)}px, 0)`;
      }
    });
  }, [win]);

  return (
    <div ref={root} className={`copy ${className}`} data-align={align}>
      <div ref={inner} className="copy-inner">
        <h2 className="copy-title">
          {lede && <span className="lede">{lede}</span>}
          {title}
        </h2>
        {body && <p className="copy-body">{body}</p>}
      </div>
    </div>
  );
}
