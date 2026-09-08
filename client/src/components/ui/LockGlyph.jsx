import React from 'react';

// Small SVG lock icon. Replaces the 🔒 emoji used in tab labels.
// Default size 13 — keeps the same visual weight as the previous emoji.
export default function LockGlyph({ size = 13, color = 'currentColor', title = 'Locked' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      className="lock-glyph"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
