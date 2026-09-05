import React from 'react';

// Replaces the small "PhilSys ✓ Tier I" text in the navbar with a
// avatar-style initial circle + first name + verified check.
// More humane, less institutional, and reads as a person not a system.

function CheckGlyph({ size = 12, color = 'white' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function VerifiedPill({ firstName, lastName, tier = 'Tier I' }) {
  const initial = (firstName || 'C').trim().charAt(0).toUpperCase();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Citizen';
  return (
    <div
      className="verified-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px 4px 4px',
        background: 'var(--background-alt)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-full)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #0284C7)',
          color: 'white',
          fontSize: 12,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {initial}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
        {displayName}
      </span>
      <span
        title={`PhilSys ${tier} Verified`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--emerald)',
          color: 'white',
        }}
      >
        <CheckGlyph />
      </span>
    </div>
  );
}
