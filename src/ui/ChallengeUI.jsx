import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from '../state/store.js';
import { CHALLENGE_LINES } from '../lib/textures.js';
import { onScrollTick } from '../lib/scroll.js';

const IDLE = 'Six lines. One of them is the reason the other five were written.';
const SOLVED_HINT = 'Scroll on — the bookmark has it now.';

/**
 * The challenge's text layer.
 *
 * Deliberately thin: the prompt, one line of feedback and a way out. Every
 * wrong answer gets its own response rather than a generic "try again", which
 * is what makes it feel like something is reading with you.
 */
export function ChallengeUI() {
  const gameState = useStore((s) => s.gameState);
  const attempts = useStore((s) => s.attempts);
  const lastPick = useStore((s) => s.lastPick);
  const skipChallenge = useStore((s) => s.skipChallenge);

  const [visible, setVisible] = useState(false);
  const shown = useRef(false);
  const root = useRef();
  const sub = useRef();

  // Only touch React when the band is actually crossed, not on every frame.
  useEffect(
    () =>
      onScrollTick((p) => {
        const shouldShow = p > 0.708 && p < 0.815;
        if (shouldShow !== shown.current) {
          shown.current = shouldShow;
          setVisible(shouldShow);
        }
      }),
    []
  );

  // Nudge the feedback line on every new attempt so a repeat answer still reads
  // as a response.
  useEffect(() => {
    if (!sub.current || gameState === 'idle') return;
    gsap.fromTo(
      sub.current,
      { y: 6, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }
    );
    if (gameState === 'wrong' && root.current) {
      root.current.classList.remove('shake');
      // force reflow so the animation can restart
      void root.current.offsetWidth;
      root.current.classList.add('shake');
    }
  }, [gameState, attempts, lastPick]);

  const picked = CHALLENGE_LINES[lastPick];
  let tone = 'idle';
  let message = IDLE;
  if (gameState === 'wrong' && picked) {
    tone = 'wrong';
    message = picked.note;
  } else if (gameState === 'solved') {
    tone = 'right';
    message = picked?.correct ? `${picked.note} ${SOLVED_HINT}` : SOLVED_HINT;
  }

  return (
    <div ref={root} className="challenge" data-visible={visible ? 'true' : 'false'}>
      <p className="challenge-prompt">
        {gameState === 'solved' ? 'Marked.' : 'Find the most important idea.'}
      </p>
      <p ref={sub} className="challenge-sub" data-tone={tone}>
        {message}
      </p>
      <div className="challenge-meta">
        <span>
          {gameState === 'solved'
            ? 'Challenge complete'
            : `Attempts ${String(attempts).padStart(2, '0')}`}
        </span>
        {gameState !== 'solved' && (
          <button type="button" className="link-btn" onClick={skipChallenge}>
            Skip and continue
          </button>
        )}
      </div>
    </div>
  );
}
