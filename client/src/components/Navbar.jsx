import React, { useState } from 'react';
import { api } from '../services/api';

const ROLES = [
  { id: 'recipient', label: 'Recipient' },
  { id: 'donor',     label: 'Donor'     },
  { id: 'doctor',    label: 'Doctor'    },
];

export default function Navbar({ currentRole, onRoleChange }) {
  const [verifying, setVerifying] = useState(false);
  const [verified,  setVerified]  = useState(false);
  const [tier,      setTier]      = useState('');

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const r = await api.verify({ first_name:'Juan', last_name:'Dela Cruz', birth_date:'1992-05-15', face_liveness_session_id:'demo-001' });
      setTier(r.data.meta?.tier_level || 'Tier I');
      setVerified(true);
    } catch { /* demo mode */ setVerified(true); setTier('Tier I'); }
    finally { setVerifying(false); }
  };

  return (
    <nav className="navbar">
      {/* rainbow stripe rendered via CSS ::before */}
      <div className="container navbar-inner">
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">e</div>
          <div>
            <div className="brand-name">eHealth</div>
            <div className="brand-sub">DICT eGov Platform</div>
          </div>
        </div>

        {/* Role switcher */}
        <div className="role-switcher">
          {ROLES.map(r => (
            <button key={r.id} className={`role-btn${currentRole === r.id ? ' active' : ''}`} onClick={() => onRoleChange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>

        {/* eVerify */}
        <button className={`ev-pill${verified ? ' done' : ''}`} onClick={handleVerify} disabled={verifying || verified}>
          {verifying ? <span className="spinner" style={{width:12,height:12}} /> : <ShieldIcon />}
          {verifying ? 'Verifyingâ€¦' : verified ? `PhilSys ${tier}` : 'Verify ID'}
        </button>
      </div>
    </nav>
  );
}

function ShieldIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
