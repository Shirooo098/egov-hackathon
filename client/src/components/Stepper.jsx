import React from 'react';

// Horizontal 5-step progress indicator for the onboarding flow.
// `steps` is an array of strings or {label, key}.
// `active` is the 1-based index of the current step (1..N).
// Completed steps show a check; the active step is filled.

function CheckMini({ color = 'white' }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const DOT_SIZE = 26;
const LABEL_GAP = 6;
const LABEL_FONT_PX = 10;
const LINE_VERTICAL_OFFSET = (DOT_SIZE - 2) / 2; // center of the dot

export default function Stepper({ steps = [], active = 1 }) {
  return (
    <div
      className="stepper"
      role="list"
      aria-label="Onboarding progress"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        justifyContent: 'space-between',
        marginBottom: 24,
        width: '100%',
      }}
    >
      {steps.map((s, i) => {
        const idx = i + 1;
        const isActive = idx === active;
        const isDone = idx < active;
        const isFuture = idx > active;
        return (
          <React.Fragment key={s.key || s.label || s}>
            <div
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: LABEL_GAP,
                flex: '1 1 0',
                minWidth: 0,
                zIndex: 2,
              }}
            >
              <div
                className={`stepper-dot${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive
                    ? 'var(--primary)'
                    : isDone
                    ? 'var(--emerald)'
                    : 'var(--background-alt)',
                  border: isFuture ? '1px solid var(--border)' : 'none',
                  color: isActive || isDone ? 'white' : 'var(--foreground-muted)',
                  fontSize: 11,
                  fontWeight: 800,
                  transition: 'background var(--t-std)',
                }}
              >
                {isDone ? <CheckMini /> : idx}
              </div>
              <div
                style={{
                  fontSize: LABEL_FONT_PX,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: isActive ? 'var(--primary)' : isDone ? 'var(--emerald)' : 'var(--foreground-subtle)',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {s.label || s}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="stepper-line"
                aria-hidden="true"
                style={{
                  flex: '1 1 0',
                  height: 2,
                  background: idx < active ? 'var(--emerald)' : 'var(--border)',
                  marginTop: LINE_VERTICAL_OFFSET,
                  marginInline: 4,
                  minWidth: 8,
                  transition: 'background var(--t-std)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
