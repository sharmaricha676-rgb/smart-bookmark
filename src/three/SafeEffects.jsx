import { Component } from 'react';
import { Effects } from './Effects.jsx';

/**
 * The post pipeline is the one part of the scene that depends on a second
 * rendering library, and it is also the only part that is purely cosmetic.
 * If it ever fails to construct — an unsupported extension, a version skew in
 * `postprocessing` — the experience should lose its bloom, not its picture.
 */
class EffectsBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[smart-bookmark] post-processing disabled:', error?.message ?? error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SafeEffects() {
  return (
    <EffectsBoundary>
      <Effects />
    </EffectsBoundary>
  );
}
