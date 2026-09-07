import React from 'react';
import { HeartIcon, DropIcon } from '../../shared/ui/Icons';
import Stepper from './Stepper';

const STEPS = [
  { key: 'role', label: 'Role' },
  { key: 'auth', label: 'Access' },
  { key: 'sso', label: 'Demo code' },
  { key: 'face', label: 'Face check' },
  { key: 'profile', label: 'Profile' },
];

export function RoleSelectCard({ choosePortal }) {
  return (
    <div className="anim-in">
      <p className="hero-eyebrow">eBuhay demo / prototype</p>
      <h1 className="onboarding-hero-title">Connecting people, Donors, and care teams through one guided journey.</h1>
      <p className="onboarding-hero-copy">Choose how you will begin the demonstrated citizen workflow.</p>
      <Stepper steps={STEPS} active={1} />
      <div className="role-pick-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { id: 'recipient', title: 'Recipient Portal', desc: 'Review a demo request for blood or organ support and choose a sample consultation slot.', icon: <HeartIcon size={24} />, badge: 'primary' },
          { id: 'donor', title: 'Donor Portal', desc: 'Review a demo donation pledge and upload a sample consent document.', icon: <DropIcon size={24} />, badge: 'success' },
        ].map((item) => (
          <button
            key={item.id}
            aria-label={item.id === 'recipient' ? 'Recipient' : 'Donor'}
            onClick={() => choosePortal(item.id)}
            className={`card card-interactive role-card role-card-${item.id}`}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 18, textAlign: 'left' }}
          >
            <div className="role-card-icon" style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
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
      <Stepper steps={STEPS} active={2} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--background-alt)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: 24, fontSize: 12, color: 'var(--foreground-muted)' }}>
        <span>Portal selected:</span>
        <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{pendingRole}</strong>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onBack}>Change</button>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', marginBottom: 16, textAlign: 'center' }}>Step 2 — Sign In or Sign Up</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary btn-lg btn-full btn-stacked" onClick={() => chooseAuthMode('signin')}>
          <span className="btn-stacked-title">Sign In with eGov (Demo)</span>
          <span className="btn-caption btn-caption-on-primary">Use the demo exchange code supplied by the presenter</span>
        </button>
        <button className="btn btn-outline btn-lg btn-full btn-stacked" onClick={() => chooseAuthMode('signup')}>
          <span className="btn-stacked-title">Sign Up with eGov (Demo)</span>
          <span className="btn-caption">Walk through the sample profile and consent steps</span>
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 16 }}>
        This prototype shows a sample eGov exchange and face check for Recipient and Donor citizen journeys. It does not verify a government identity.
      </p>
    </div>
  );
}
