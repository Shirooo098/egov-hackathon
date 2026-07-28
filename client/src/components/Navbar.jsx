import React from 'react';
import { useLocation, Link } from 'react-router-dom';

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
        <Link to={isHospitalRoute ? '/hospital-dashboard' : '/'} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <span className="badge badge-success" style={{ background: 'var(--emerald)', color: 'white', fontWeight: 700, padding: '4px 10px' }}>
              Institutional Triage Portal
            </span>
            <span style={{ fontSize: 12, color: 'var(--foreground-muted)', fontWeight: 600 }}>
              Facility ID: PGH-MNL-1000
            </span>
            <Link to="/" className="btn btn-outline btn-sm" style={{ height: 34, padding: '0 14px', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to Citizen Portal
            </Link>
          </div>
        ) : (
          /* Citizen Portal Context */
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Optional link for presentation evaluators / judges if no role active */}
            {!currentRole && (
              <Link to="/hospital-dashboard" className="btn btn-ghost btn-sm" style={{ height: 32, padding: '0 12px', fontSize: 12, color: 'var(--emerald)', border: '1px dashed var(--emerald)' }}>
                🏥 Hospital Triage Console
              </Link>
            )}

            {currentRole && (
              <>
                {/* Active Role Label */}
                <span className={`badge badge-${currentRole === 'doctor' || currentRole === 'hospital' ? 'moderate' : currentRole === 'donor' ? 'success' : 'primary'}`}>
                  {roleLabels[currentRole] || 'Citizen'} Portal
                </span>

                {/* Global eVerify status */}
                <div className={`ev-pill${verified ? ' done' : ''}`} style={{ padding: '6px 14px' }}>
                  <ShieldIcon />
                  <span>{verified ? `PhilSys ${tier || 'Verified'}` : 'Unverified'}</span>
                </div>

                {/* Profile greeting */}
                {userProfile && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground-muted)' }}>
                    {userProfile.first_name} {userProfile.last_name}
                  </span>
                )}

                {/* Exit Role control */}
                <button className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ height: 32, padding: '0 12px' }}>
                  Exit Role
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
