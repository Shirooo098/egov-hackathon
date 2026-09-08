import React from 'react';

// Replaces the small identity-status text in the navbar with a
// avatar-style initial circle + first name + demo profile marker.
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
    >
      <div
        aria-hidden="true"
        className="verified-pill-avatar"
      >
        {initial}
      </div>
      <span className="verified-pill-name">
        {displayName}
      </span>
      <span
        title={`Demo identity profile · ${tier}`}
        className="verified-pill-check"
      >
        <CheckGlyph />
      </span>
    </div>
  );
}
