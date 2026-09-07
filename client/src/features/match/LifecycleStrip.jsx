import React from 'react';
import { LIFECYCLE_STEPS, lifecycleStepIndex, formatStatus } from '../../utils/matchStatus';

function CheckMini({ color = 'white' }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Horizontal 6-step progress strip for the match lifecycle.
// Reads from a `status` prop (a match.status value) or accepts an
// explicit `active` index override.
// `compact` shrinks the strip for embed contexts (e.g. hospital dashboard).
export default function LifecycleStrip({ status = 'pending_hospital_approval', active, compact = false }) {
  const activeIdx = typeof active === 'number' ? active : lifecycleStepIndex(status);
  const isRejected = status === 'rejected';
  const headerLabel = isRejected ? 'Match Declined' : formatStatus(status);

  return (
    <div
      className={`lifecycle-strip${compact ? ' compact' : ''}`}
      role="group"
      aria-label={`Match lifecycle — currently ${headerLabel}`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: compact ? '10px 14px' : '14px 18px',
        boxShadow: 'var(--shadow-xs)',
        marginBottom: compact ? 0 : 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--foreground-subtle)',
          }}
        >
          Match Lifecycle
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: isRejected ? 'var(--destructive)' : 'var(--primary)',
          }}
        >
          {headerLabel}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {LIFECYCLE_STEPS.map((s, i) => {
          const isActive = i === activeIdx && !isRejected;
          const isDone = i < activeIdx && !isRejected;
          const dotBg = isActive
            ? 'var(--primary)'
            : isDone
            ? 'var(--emerald)'
            : 'var(--background-alt)';
          const labelColor = isActive
            ? 'var(--primary)'
            : isDone
            ? 'var(--emerald)'
            : 'var(--foreground-subtle)';
          return (
            <React.Fragment key={s.key}>
              <div
                className={`lifecycle-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                title={s.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  className="lifecycle-step-dot"
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: dotBg,
                    color: isActive || isDone ? 'white' : 'var(--foreground-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                    border: !isActive && !isDone ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {isDone ? <CheckMini /> : i + 1}
                </div>
                <div
                  className="lifecycle-step-label"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: labelColor,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {s.label}
                </div>
              </div>
              {i < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className="lifecycle-line"
                  aria-hidden="true"
                  style={{
                    flex: '0 0 12px',
                    height: 2,
                    background: i < activeIdx ? 'var(--emerald)' : 'var(--border)',
                    marginBottom: 16,
                    transition: 'background var(--t-std)',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
