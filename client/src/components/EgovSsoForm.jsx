import React from 'react';
import Stepper from './Stepper';

const STEPS = [
  { key: 'role', label: 'Role' },
  { key: 'auth', label: 'Auth' },
  { key: 'sso', label: 'SSO' },
  { key: 'face', label: 'Liveness' },
  { key: 'profile', label: 'Profile' },
];

export default function EgovSsoForm({
  pendingRole,
  authMode,
  exchangeCode,
  setExchangeCode,
  ssoError,
  ssoLoading,
  onSubmit,
  onDemoSignIn,
  onBack,
}) {
  return (
    <div className="anim-in">
      <Stepper steps={STEPS} active={3} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--background-alt)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: 24, fontSize: 12, color: 'var(--foreground-muted)' }}>
        <span>{pendingRole === 'recipient' ? 'Recipient' : 'Donor'} portal — {authMode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onBack}>Back</button>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>eGov Single Sign-On</h3>
      <p style={{ fontSize: 13, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 20 }}>
        Authenticate on eGov, then paste the exchange code it issues below. We exchange it for an access token and pull your verified profile.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label className="label">Exchange Code</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. generated_exchange_code"
            value={exchangeCode}
            onChange={(e) => setExchangeCode(e.target.value)}
          />
        </div>

        {ssoError && (
          <div style={{ fontSize: 12, color: 'var(--danger, #DC2626)', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
            {ssoError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" type="button" onClick={onBack} style={{ flex: 1 }} disabled={ssoLoading}>
            Back
          </button>
          <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={ssoLoading}>
            {ssoLoading ? <><span className="spinner" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> Verifying with eGov…</> : 'Continue'}
          </button>
        </div>
      </form>

      {onDemoSignIn && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 14px', color: 'var(--foreground-subtle)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>Or shortcut for evaluators</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button
            type="button"
            className="btn btn-demo btn-full"
            onClick={onDemoSignIn}
            disabled={ssoLoading}
            style={{
              borderColor: 'var(--emerald)',
              color: 'var(--emerald)',
              fontWeight: 800,
              padding: '12px 18px',
              fontSize: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>⚡ Quick Demo Sign-In</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--foreground-muted)' }}>(skips eGov network + liveness, lands you in the dashboard)</span>
          </button>
        </>
      )}
    </div>
  );
}
