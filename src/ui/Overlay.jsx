import { useEffect, useRef } from 'react';
import { SceneCopy } from './SceneCopy.jsx';
import { ProgressRail } from './ProgressRail.jsx';
import { ChallengeUI } from './ChallengeUI.jsx';
import { FinaleUI } from './FinaleUI.jsx';
import { useStore } from '../state/store.js';
import { onScrollTick } from '../lib/scroll.js';

/**
 * Copy windows: [fade in from, fully in by, hold until, fully out by].
 *
 * There is deliberately no copy at all through the capability corridor and the
 * challenge — those sections speak through the 3D and their own UI, and silence
 * there is what keeps the whole piece from feeling narrated.
 */
const COPY = [
  {
    window: [0.0, 0.012, 0.062, 0.1],
    lede: 'Smart Bookmark',
    title: 'What if a bookmark could do more than remember your page?',
  },
  {
    window: [0.155, 0.185, 0.225, 0.255],
    align: 'left',
    title: 'You did not read it badly.',
    body: 'You read it once, closed it, and nothing kept the part that mattered.',
  },
  {
    window: [0.245, 0.272, 0.298, 0.325],
    align: 'left',
    title: 'A bookmark has only ever saved a page number.',
    body: 'Not the argument. Not the word you looked up. Not the reason you stopped.',
  },
  {
    window: [0.345, 0.378, 0.435, 0.472],
    align: 'lower-center',
    lede: 'Activation',
    title: 'Meet the Smart Bookmark.',
    body: 'It sits where a bookmark has always sat, and keeps everything a bookmark never could.',
  },
  {
    window: [0.795, 0.825, 0.878, 0.912],
    align: 'left',
    title: 'One reader. Then a whole hall of them.',
    body: 'The same book, read by hundreds — each one keeping what mattered to them, and finding it again.',
  },
];

/**
 * All DOM chrome. Kept entirely separate from the scene graph: nothing in here
 * knows about Three.js, and nothing in the scene knows about the DOM.
 */
export function Overlay({ lenisRef }) {
  const hasScrolled = useStore((s) => s.hasScrolled);
  const hint = useRef();

  // Hide the scroll hint once the reader is clearly under way.
  useEffect(
    () =>
      onScrollTick((p) => {
        if (hint.current) {
          hint.current.setAttribute('data-hidden', p > 0.012 ? 'true' : 'false');
        }
      }),
    []
  );

  return (
    <div className="overlay">
      <div className="masthead">
        <span className="mark" />
        <span>Smart Bookmark</span>
      </div>

      <ProgressRail />

      {COPY.map((c) => (
        <SceneCopy key={c.title} {...c} />
      ))}

      <ChallengeUI />
      <FinaleUI lenisRef={lenisRef} />

      <div ref={hint} className="scroll-hint" data-hidden={hasScrolled ? 'true' : 'false'}>
        <span>Scroll to begin</span>
        <span className="line" />
      </div>
    </div>
  );
}
