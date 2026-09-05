import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import VerifiedPill from './VerifiedPill';

export default function Navbar({ currentRole, verified, tier, userProfile, onSignOut }) {
  const location = useLocation();
  const isHospitalRoute = location.pathname === '/hospital-dashboard';

  const roleLabels = {
    recipient: 'Recipient',
    donor: 'Donor',
    doctor: 'Medical Doctor',
    hospital: 'Hospital Administration'
  };

  return (
    <nav className="navbar">
      {/* rainbow stripe rendered via CSS ::before */}
      <div className="container navbar-inner">
        {/* Brand */}
        <Link
          to={isHospitalRoute ? '/hospital-dashboard' : '/'}
          aria-current={location.pathname === '/' || location.pathname === '/hospital-dashboard' ? 'page' : undefined}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div className="brand-mark" style={{ background: isHospitalRoute ? 'var(--emerald)' : undefined }}>
              {isHospitalRoute ? '🏥' : 'e'}
            </div>
            <div>
              <div className="brand-name">{isHospitalRoute ? 'Philippine General Hospital' : 'eBuhay'}</div>
              <div className="brand-sub">{isHospitalRoute ? 'Clinical Governance Triage & On-Chain Vault' : 'DICT eGov Platform'}</div>
            </div>
          </div>
        </Link>

        {/* Conditional Navigation / Actions */}
        {isHospitalRoute ? (
          /* Institutional Hospital Context */
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="nav-context-label badge badge-success" style={{ background: 'var(--emerald)', color: 'white', fontWeight: 700, padding: '4px 10px' }}>
              Institutional Triage Portal
            </span>
            <span className="nav-facility-id" style={{ fontSize: 12, color: 'var(--foreground-muted)', fontWeight: 600 }}>
              Facility ID: PGH-MNL-1000
            </span>
            <Link to="/" className="btn btn-outline btn-sm" style={{ height: 34, padding: '0 14px', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to Citizen Portal
            </Link>
          </div>
        ) : (
          /* Citizen Portal Context */
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Single Hospital CTA when no role is active (avoid CTA collision) */}
            {!currentRole && (
              <Link to="/hospital-dashboard" className="btn btn-ghost btn-sm" style={{ height: 32, padding: '0 12px', fontSize: 12, color: 'var(--emerald)', border: '1px solid var(--emerald)', textDecoration: 'none' }}>
                🏥 Hospital Console
              </Link>
            )}

            {currentRole && (
              <>
                {/* Active Role Label */}
                <span className={`nav-context-label badge badge-${currentRole === 'doctor' || currentRole === 'hospital' ? 'moderate' : currentRole === 'donor' ? 'success' : 'primary'}`}>
                  {roleLabels[currentRole] || 'Citizen'} Portal
                </span>

                {/* Humane avatar-style verified pill (replaces the small "PhilSys Tier I" text) */}
                {verified && userProfile && (
                  <VerifiedPill
                    firstName={userProfile.first_name}
                    lastName={userProfile.last_name}
                    tier={tier || 'Tier I'}
                  />
                )}
                {!verified && (
                  <div className="ev-pill" style={{ padding: '6px 14px' }}>
                    <ShieldIcon />
                    <span>Unverified</span>
                  </div>
                )}

                {/* Switch-role hint to the hospital console, with subtle styling (no dashed border) */}
                <Link
                  to="/hospital-dashboard"
                  className="btn btn-ghost btn-sm"
                  style={{ height: 32, padding: '0 12px', fontSize: 12, color: 'var(--emerald)', textDecoration: 'none' }}
                  title="Open the institutional triage console"
                >
                  🏥 Hospital Console
                </Link>

                {/* Exit Role control */}
                <button className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ height: 32, padding: '0 12px' }}>
                  <span className="nav-exit-text">Exit Role</span>
                  <span className="nav-exit-icon" style={{ display: 'none' }}>✕</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function ShieldIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
