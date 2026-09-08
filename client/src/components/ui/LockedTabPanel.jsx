import React from 'react';
import LockGlyph from './LockGlyph';

// Shared "feature currently restricted" panel.
// Replaces the 3 near-duplicate inline cards in the citizen dashboards.
export default function LockedTabPanel({
  title = 'Not available yet',
  message,
  ctaLabel = 'Return to My Match',
  onCta,
}) {
  return (
    <div
      className="card anim-in locked-panel"
    >
      <div
        className="locked-panel-icon"
        aria-hidden="true"
      >
        <LockGlyph size={24} />
      </div>
      <h3
        className="locked-panel-title"
      >
        {title}
      </h3>
      {message && (
        <p
          className="locked-panel-message"
        >
          {message}
        </p>
      )}
      {onCta && (
        <button
          type="button"
          onClick={onCta}
          className="btn btn-primary btn-lg locked-panel-cta"
        >
          {ctaLabel} ➔
        </button>
      )}
    </div>
  );
}
