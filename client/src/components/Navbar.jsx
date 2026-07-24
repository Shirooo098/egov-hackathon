import React from 'react';

export default function Navbar({ currentRole, verified, tier, userProfile, onSignOut }) {
  const roleLabels = {
    recipient: 'Recipient',
    donor: 'Donor',
    doctor: 'Medical Doctor',
  };

  return (
    <nav className="navbar">
      {/* rainbow stripe rendered via CSS ::before */}
      <div className="container navbar-inner">
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">e</div>
          <div>
            <div className="brand-name">eBuhay</div>
            <div className="brand-sub">DICT eGov Platform</div>
          </div>
        </div>

        {/* Center / Right info based on session state */}
        {currentRole && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Active Role Label */}
            <span className={`badge badge-${currentRole === 'doctor' ? 'moderate' : currentRole === 'donor' ? 'success' : 'primary'}`}>
              {roleLabels[currentRole]} Portal
            </span>

            {/* Global eVerify status */}
            <div className={`ev-pill${verified ? ' done' : ''}`} style={{ padding: '6px 14px' }}>
              <ShieldIcon />
              <span>{verified ? `PhilSys ${tier}` : 'Unverified'}</span>
            </div>

            {/* Profile greeting & Sign out */}
            {userProfile && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground-muted)' }}>
                {userProfile.first_name} {userProfile.last_name}
              </span>
            )}

            <button className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ height: 32, padding: '0 12px' }}>
              Exit Role
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function ShieldIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
