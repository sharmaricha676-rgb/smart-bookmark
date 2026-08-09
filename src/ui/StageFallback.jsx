import { Component } from 'react';

/** WebGL 2 is required. Checked once, before the Canvas is ever constructed. */
export function detectWebGL() {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function Card({ title, detail, hint }) {
  return (
    <div className="stage-fallback">
      <div className="stage-fallback-inner">
        <h1 className="loader-title">Smart Bookmark</h1>
        <p className="stage-fallback-title">{title}</p>
        {detail && <pre className="stage-fallback-detail">{detail}</pre>}
        {hint && <p className="loader-note">{hint}</p>}
      </div>
    </div>
  );
}

export function NoWebGL() {
  return (
    <Card
      title="This experience needs WebGL."
      hint="Try a current Chrome, Edge, Firefox or Safari with hardware acceleration on."
    />
  );
}

/**
 * Last line of defence around the whole 3D stage.
 *
 * A thrown error inside the R3F tree would otherwise unmount the canvas and
 * leave a black page with nothing but a console trace. Showing the message on
 * screen turns a mystery into something diagnosable.
 */
export class StageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[smart-bookmark] the 3D stage failed to start:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Card
          title="The 3D stage could not start."
          detail={String(this.state.error?.message ?? this.state.error)}
          hint="The full stack trace is in the browser console."
        />
      );
    }
    return this.props.children;
  }
}
