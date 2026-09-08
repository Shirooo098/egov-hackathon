import React from 'react';

// Pulsing green status dot. Used on the "My Match (Live)" tab label
// to signal real-time match state. Pure CSS animation, no JS.
export default function LiveDot({ size = 8, color = 'var(--emerald)' }) {
  return (
    <span
      className="live-dot"
      aria-hidden="true"
      style={{ width: size, height: size, background: color }}
    />
  );
}
