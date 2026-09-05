import React from 'react';
import LockGlyph from './LockGlyph';

// Shared "feature currently restricted" panel.
// Replaces the 3 near-duplicate inline cards in the citizen dashboards.
export default function LockedTabPanel({
  title = 'Currently Restricted',
  message,
  ctaLabel = 'Return to My Match',
  onCta,
}) {
  return (
    <div
      className="card anim-in locked-panel"
      style={{
        padding: '48px 32px',
        textAlign: 'center',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="locked-panel-icon"
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'var(--sun-10)',
          color: 'var(--sun-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LockGlyph size={24} />
      </div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 8,
          color: 'var(--foreground)',
        }}
      >
        {title}
      </h3>
      {message && (
        <p
          style={{
            fontSize: 14,
            color: 'var(--foreground-muted)',
            maxWidth: 520,
            margin: '0 auto 24px',
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
      )}
      {onCta && (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onCta}
          style={{ fontWeight: 800, padding: '12px 24px' }}
        >
          {ctaLabel} ➔
        </button>
      )}
    </div>
  );
}
