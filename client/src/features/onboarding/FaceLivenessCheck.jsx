import './FaceLivenessCheck.css';
import React from 'react';
import Stepper from './Stepper';

const STEPS = [
  { key: 'role', label: 'Role' },
  { key: 'auth', label: 'Access' },
  { key: 'sso', label: 'Demo code' },
  { key: 'face', label: 'Face check' },
  { key: 'profile', label: 'Profile' },
];

// Stage chip helpers
const STAGE_CHIPS = [
  { id: 1, label: 'Capture' },
  { id: 2, label: 'Detect' },
  { id: 3, label: 'Verify' },
  { id: 4, label: 'Done' },
];

export default function FaceLivenessCheck({
  livenessStage,
  setLivenessStage,
  livenessMessage,
  onBack,
}) {
  return (
    <div className="anim-in migrated-7f597a40" >
      <div className="migrated-05a2dd68">
        <Stepper steps={STEPS} active={4} />
      </div>
      <h3 className="migrated-9f19d7d0">Face Liveness Check (Demo)</h3>
      <p className="migrated-dd39b1f9">
        Follow the sample face-check prompts. This prototype demonstrates the step; it does not verify your identity or provide a government liveness result.
      </p>

      {/* Stage chips */}
      <div className="migrated-beb2c9f2">
        {STAGE_CHIPS.map((chip) => {
          const isActive =
            (chip.id === 1 && (livenessStage === 1 || livenessStage === 2)) ||
            (chip.id === 2 && livenessStage === 2) ||
            (chip.id === 3 && livenessStage === 3) ||
            (chip.id === 4 && livenessStage === 4);
          const isDone = livenessStage === 3 && chip.id < 4;
          return (
            <span
              key={chip.id}
              className={`badge migrated-46a2b1dd ${isActive ? 'badge-primary' : isDone ? 'badge-success' : 'badge-muted'}`}

            >
              {chip.id}. {chip.label}
            </span>
          );
        })}
      </div>

      <div className="face-liveness-preview" style={{ borderColor: livenessStage === 3 ? 'var(--emerald)' : livenessStage === 4 ? 'var(--danger, #DC2626)' : 'var(--primary)' }}>
        {livenessStage < 3 && (
          <div className="migrated-6a6769ab" />
        )}
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" className="migrated-f73aaf90">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {livenessStage === 3 && (
          <div className="anim-in migrated-446b105d" >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      <div className="face-liveness-status" style={{ color: livenessStage === 3 ? 'var(--emerald)' : livenessStage === 4 ? 'var(--danger, #DC2626)' : 'var(--primary)' }}>
        {livenessMessage}
      </div>

      {livenessStage === 4 && (
        <div className="migrated-1d233a92">
          <button className="btn btn-ghost" onClick={onBack}>Back</button>
          <button className="btn btn-primary" onClick={() => setLivenessStage(0)}>Retry Liveness Check</button>
        </div>
      )}
    </div>
  );
}
