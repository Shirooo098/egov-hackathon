import React from 'react';

// Reusable brand mark + name + tagline block.
// Replaces repeated inline eBuhay branding patterns
// that was repeated across onboarding headers.
export default function BrandLockup({ size = 'md', align = 'center', tagline = 'eBuhay prototype' }) {
  const mark = size === 'sm' ? 36 : 48;
  const titleSize = size === 'sm' ? 18 : 24;
  const subSize = size === 'sm' ? 11 : 13;

  return (
    <div
      className="brand-lockup"
      style={{
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
      }}
    >
      <div
        aria-hidden="true"
        className="brand-lockup-mark"
        style={{ width: mark, height: mark, fontSize: mark * 0.46 }}
      >
        e
      </div>
      <div className="brand-lockup-title" style={{ fontSize: titleSize }}>
        eBuhay
      </div>
      {tagline && (
        <div className="brand-lockup-tagline" style={{ fontSize: subSize }}>
          {tagline}
        </div>
      )}
    </div>
  );
}
