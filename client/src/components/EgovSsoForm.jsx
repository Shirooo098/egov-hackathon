import React from 'react';

export default function EgovSsoForm({
  pendingRole,
  authMode,
  exchangeCode,
  setExchangeCode,
  ssoError,
  ssoLoading,
  onSubmit,
  onBack,
}) {
  return (
    <div className="anim-in">
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
    </div>
  );
}
