import { useEffect, useRef } from 'react';
import { onScrollTick } from '../lib/scroll.js';
import { SCENES } from '../lib/timeline.js';

/**
 * The only persistent chrome: where you are in the journey, and what it is
 * called. Updated from the shared rAF loop, so it costs no renders.
 */
export function ProgressRail() {
  const fill = useRef();
  const ticks = useRef([]);
  const labels = useRef([]);
  const count = useRef();

  useEffect(() => {
    let lastIndex = -1;
    return onScrollTick((p) => {
      if (fill.current) fill.current.style.height = `${(p * 100).toFixed(2)}%`;

      let index = 0;
      for (let i = SCENES.length - 1; i >= 0; i--) {
        if (p >= SCENES[i].start) {
          index = i;
          break;
        }
      }
      if (index !== lastIndex) {
        lastIndex = index;
        ticks.current.forEach((el, i) => el?.setAttribute('data-active', String(i === index)));
        labels.current.forEach((el, i) => {
          if (el) el.style.opacity = i === index ? '1' : '0';
        });
        if (count.current) {
          count.current.textContent = `${String(index + 1).padStart(2, '0')} / ${String(
            SCENES.length
          ).padStart(2, '0')}`;
        }
      }
    });
  }, []);

  return (
    <div className="rail" aria-hidden="true">
      <div className="rail-track">
        <div ref={fill} className="rail-fill" />
        {SCENES.map((scene, i) => (
          <div
            key={scene.id}
            style={{ position: 'absolute', top: `${scene.start * 100}%`, right: 0 }}
          >
            <div
              ref={(el) => {
                ticks.current[i] = el;
              }}
              className="rail-tick"
              data-active={i === 0 ? 'true' : 'false'}
            />
            <div
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="rail-label"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {scene.label}
            </div>
          </div>
        ))}
      </div>
      <div ref={count} className="rail-count">
        01 / {String(SCENES.length).padStart(2, '0')}
      </div>
    </div>
  );
}
