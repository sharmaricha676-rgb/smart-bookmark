import { useEffect, useState } from 'react';
import { Experience } from './three/Experience.jsx';
import { Overlay } from './ui/Overlay.jsx';
import { Loader } from './ui/Loader.jsx';
import { StageBoundary, NoWebGL, detectWebGL } from './ui/StageFallback.jsx';
import { useSmoothScroll } from './hooks/useSmoothScroll.js';
import { useTierDetection } from './hooks/useTier.js';
import { bindPointer } from './hooks/usePointer.js';
import { startScrollLoop } from './lib/scroll.js';
import { SCROLL_VIEWPORTS } from './lib/timeline.js';

export default function App() {
  useTierDetection();
  const lenisRef = useSmoothScroll();
  const [webgl] = useState(detectWebGL);

  useEffect(() => {
    const stopLoop = startScrollLoop();
    const unbind = bindPointer();
    return () => {
      stopLoop();
      unbind();
    };
  }, []);

  if (!webgl) return <NoWebGL />;

  return (
    <>
      <StageBoundary>
        <Experience />
      </StageBoundary>
      <Overlay lenisRef={lenisRef} />
      <Loader />
      {/* The page's only real content: height for the journey to happen in. */}
      <div id="scroll-spacer" style={{ height: `${SCROLL_VIEWPORTS * 100}vh` }} />
    </>
  );
}
