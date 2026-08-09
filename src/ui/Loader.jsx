import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.js';

/**
 * Warm-up screen.
 *
 * There are no assets to download — everything is generated — so this covers
 * shader compilation and the first frame, then hands over on a deliberate
 * click. Starting on a gesture also means the experience never begins while
 * the reader is still scrolling something else.
 */
export function Loader() {
  const ready = useStore((s) => s.ready);
  const entered = useStore((s) => s.entered);
  const enter = useStore((s) => s.enter);
  const [pct, setPct] = useState(6);
  const bar = useRef();

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setPct((v) => {
        const target = ready ? 100 : 88;
        const next = v + (target - v) * 0.06;
        return next > 99.4 ? 100 : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  useEffect(() => {
    if (bar.current) bar.current.style.width = `${pct}%`;
  }, [pct]);

  const done = ready && pct > 99;

  return (
    <div className="loader" data-done={entered ? 'true' : 'false'}>
      <h1 className="loader-title">Smart Bookmark</h1>
      <div className="loader-bar">
        <i ref={bar} />
      </div>
      <p className="loader-note">{done ? 'Ready' : 'Preparing the library'}</p>
      {done && (
        <button type="button" className="enter-btn" onClick={enter}>
          Begin
        </button>
      )}
    </div>
  );
}
