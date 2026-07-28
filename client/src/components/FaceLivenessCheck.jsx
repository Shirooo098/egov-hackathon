import React from 'react';

export default function FaceLivenessCheck({
  livenessStage,
  setLivenessStage,
  livenessMessage,
  onBack,
}) {
  return (
    <div className="anim-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800 }}>Face Liveness Verification</h3>
      <p style={{ fontSize: 13, color: 'var(--foreground-muted)', maxWidth: 440 }}>
        A secure eGov capture window has opened. Follow the on-screen prompts to blink and confirm you're a live person.
      </p>

      <div style={{
        position: 'relative', width: 200, height: 200, borderRadius: '50%',
        border: `4px solid ${livenessStage === 3 ? 'var(--emerald)' : livenessStage === 4 ? 'var(--danger, #DC2626)' : 'var(--primary)'}`,
        background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
      }}>
        {livenessStage < 3 && (
          <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'var(--primary)', animation: 'flowDash 2s linear infinite', top: '50%' }} />
        )}
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" style={{ zIndex: 1 }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {livenessStage === 3 && (
          <div className="anim-in" style={{ position: 'absolute', inset: 0, background: 'rgba(5,150,105,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 5 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, color: livenessStage === 3 ? 'var(--emerald)' : livenessStage === 4 ? 'var(--danger, #DC2626)' : 'var(--primary)', padding: '8px 16px', background: 'var(--background-alt)', borderRadius: 'var(--r-full)', border: '1px solid var(--border)' }}>
        {livenessMessage}
      </div>

      {livenessStage === 4 && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onBack}>Back</button>
          <button className="btn btn-primary" onClick={() => setLivenessStage(0)}>Retry Liveness Check</button>
        </div>
      )}
    </div>
  );
}
