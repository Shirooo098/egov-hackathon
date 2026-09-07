import React from 'react';

export default function MatchReviewModal({ match, role, consentSigned, hospitalApproved = false, onClose, onAcceptChat, onSchedule }) {
  const [isMatched, setIsMatched] = React.useState(false);
  const dialogRef = React.useRef(null);
  const closeRef = React.useRef(null);
  React.useEffect(() => {
    if (!match) return undefined;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const dialog = dialogRef.current;
    dialog?.addEventListener('keydown', handleKeyDown);
    return () => { dialog?.removeEventListener('keydown', handleKeyDown); previousFocus?.focus?.(); };
  }, [match, onClose]);
  if (!match) return null;

  const isApproved = hospitalApproved;
  const isRecipientView = role === 'recipient';

  // Determine participant details
  const name = consentSigned
    ? (isRecipientView ? `${match.donor?.first_name || 'Juan'} ${match.donor?.last_name || 'Dela Cruz'}` : match.recipientName || 'Ana Reyes')
    : (isRecipientView ? `Anonymous Donor #${(match.donor?.id || '7C2A').substring(0, 4).toUpperCase()}` : 'Anonymous Recipient #9C41');

  const bloodType = isRecipientView ? (match.donor?.blood_type || 'O-') : (match.blood_type || 'A+');
  const score = match.compatibilityScore || match.score || 96;
  const scoreColor = score >= 85 ? 'var(--emerald)' : score >= 65 ? 'var(--sun)' : 'var(--destructive)';
  const location = isRecipientView ? (match.donor?.location_city || 'Manila City') : 'Makati City';

  return (
    <div className="anim-in" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div
        ref={dialogRef}
        className="card anim-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-review-title"
        aria-describedby="match-review-description"
        style={{
        background: 'white',
        maxWidth: 540,
        width: '100%',
        padding: 32,
        borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className={`badge badge-${isRecipientView ? 'primary' : 'success'}`} style={{ marginBottom: 6 }}>
              {isRecipientView ? 'Donor Evaluation' : 'Recipient Request Review'}
            </div>
            <h2 id="match-review-title" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Match Compatibility Review</h2>
          </div>
          <button
            ref={closeRef}
            className="btn btn-ghost btn-sm" 
            onClick={onClose}
            aria-label="Close match compatibility review"
            style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        {/* Participant Profile Banner */}
        <div style={{
          padding: 16,
          background: 'var(--background-alt)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div className={`blood-pill ${isRecipientView ? 'blood-pill-organ' : 'blood-pill-blood'}`} style={{ width: 46, height: 46, fontSize: 16 }}>
            {bloodType}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📍 {location} (Nearby)</span>
              <span>·</span>
              <span className="badge badge-verified" style={{ fontSize: 9 }}>Demo identity profile</span>
            </div>
          </div>
        </div>

        {/* Compatibility Metrics Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)' }}>
              Clinical Compatibility Rating
            </span>
            <strong style={{ fontSize: 16, fontWeight: 800, color: scoreColor }}>{score}% Match Index</strong>
          </div>

          {/* Progress bar */}
          <div className="compat-track" style={{ height: 10 }}>
            <div className="compat-fill" style={{ width: `${score}%`, background: scoreColor, borderRadius: 'var(--r-full)' }} />
          </div>

          <div className="grid-2" style={{ marginTop: 6 }}>
            <div style={{ padding: 12, background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontWeight: 600 }}>ABO/Rh Blood Match</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--emerald)', marginTop: 2 }}>100% Compatible</div>
            </div>
            <div style={{ padding: 12, background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontWeight: 600 }}>Urgency Status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginTop: 2, textTransform: 'capitalize' }}>
                {match.urgency || 'Moderate'} Need
              </div>
            </div>
          </div>
        </div>

        {/* Medical & Organ Notes */}
        <div id="match-review-description" style={{ padding: 14, background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', fontSize: 12, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>Clinical Match Summary</div>
            <span className={`badge ${isApproved ? 'badge-success' : isMatched ? 'badge-sun' : 'badge-primary'}`} style={{ fontSize: 9 }}>
              {isApproved ? 'Hospital Demo Review Complete ✓' : isMatched ? 'Awaiting Hospital Demo Review ⏳' : 'Sample Match Evaluation'}
            </span>
          </div>
          {isRecipientView ? (
            <div>Sample donor profile with active organ pledges ({match.donor?.donor_profile?.organ_pledges?.join(', ') || 'Kidney, Cornea'}). Direct messaging opens after the demo review step.</div>
          ) : (
            <div>Sample recipient profile under demo review. ABO blood type O- is shown as a compatibility estimate. Direct messaging opens after the demo review step.</div>
          )}
        </div>

        {/* Privacy Notice */}
        {!consentSigned && (
          <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔒</span>
            <span>Citizen name is masked for privacy. The prototype reveals sample names after the agreement step; this does not verify identity.</span>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Close
          </button>
          {onSchedule && (
            <button className="btn btn-outline" onClick={() => { onClose(); onSchedule(); }} style={{ flex: 1.2 }}>
              Clinical Schedule
            </button>
          )}
          {isApproved ? (
            <button className="btn btn-primary" onClick={() => { onClose(); onAcceptChat(); }} style={{ flex: 1.8 }}>
              Accept &amp; Chat →
            </button>
          ) : !isMatched ? (
            <button className="btn btn-primary" onClick={() => setIsMatched(true)} style={{ flex: 1.8 }}>
              Match →
            </button>
          ) : (
            <button className="btn btn-outline" disabled style={{ flex: 1.8, opacity: 0.7, cursor: 'not-allowed' }}>
              🔒 Awaiting Hospital Demo Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
