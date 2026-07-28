import React from 'react';
import { HeartIcon, DropIcon } from './Icons';

export function RoleSelectCard({ choosePortal }) {
  return (
    <div className="anim-in">
      <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', marginBottom: 16, textAlign: 'center' }}>Step 1 — Choose Your Portal</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { id: 'recipient', title: 'Recipient Portal', desc: 'Search compatible blood/organ matches, request transplants, and coordinate clinical procedure schedules.', icon: <HeartIcon size={24} />, badge: 'primary' },
          { id: 'donor', title: 'Donor Portal', desc: 'Register eligibility details, pledge organ/blood donations, and execute encrypted e-signature consent.', icon: <DropIcon size={24} />, badge: 'success' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => choosePortal(item.id)}
            className="card card-interactive"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 18, textAlign: 'left', border: '1px solid var(--border)' }}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{item.title}</strong>
                <span className={`badge badge-${item.badge}`} style={{ fontSize: 9 }}>Select</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthChoiceCard({ pendingRole, chooseAuthMode, onBack }) {
  return (
    <div className="anim-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--background-alt)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: 24, fontSize: 12, color: 'var(--foreground-muted)' }}>
        <span>Portal selected:</span>
        <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{pendingRole}</strong>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onBack}>Change</button>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', marginBottom: 16, textAlign: 'center' }}>Step 2 — Sign In or Sign Up</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary btn-lg btn-full" onClick={() => chooseAuthMode('signin')}>
          Sign In with eGov (existing account)
        </button>
        <button className="btn btn-outline btn-lg btn-full" onClick={() => chooseAuthMode('signup')}>
          Sign Up with eGov (new registration)
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 16 }}>
        Both options authenticate via eGov SSO and confirm you're a live person via Face Liveness before continuing.
      </p>
    </div>
  );
}
