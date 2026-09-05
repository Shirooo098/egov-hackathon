import React from 'react';

// Reusable brand mark + name + tagline block.
// Replaces the inline "e" / "eBuhay" / "DICT eGov Platform" pattern
// that was repeated across onboarding headers.
export default function BrandLockup({ size = 'md', align = 'center', tagline = 'DICT eGov Platform' }) {
  const mark = size === 'sm' ? 36 : 48;
  const titleSize = size === 'sm' ? 18 : 24;
  const subSize = size === 'sm' ? 11 : 13;

  return (
    <div
      className="brand-lockup"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: 6,
        textAlign: align,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: mark,
          height: mark,
          borderRadius: 12,
          background: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: mark * 0.46,
          fontWeight: 900,
          fontFamily: 'var(--font-heading)',
          boxShadow: 'var(--shadow-blue)',
        }}
      >
        e
      </div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: titleSize, letterSpacing: '-0.03em', color: 'var(--foreground)' }}>
        eBuhay
      </div>
      {tagline && (
        <div style={{ fontSize: subSize, color: 'var(--foreground-muted)' }}>
          {tagline}
        </div>
      )}
    </div>
  );
}
