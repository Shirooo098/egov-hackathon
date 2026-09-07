import React, { useState } from 'react';
import { useMatch } from '../../context/MatchContext';
import { CheckIcon, MatchIcon } from '../../shared/ui/Icons';

export default function ClinicalMatchCard({ role = 'recipient', onNavigateTab }) {
  const { match, proposeSchedule, setScheduledDate, resetMatch } = useMatch();

  const [dateInput, setDateInput] = useState('2026-08-10');
  const [timeInput, setTimeInput] = useState('10:00 AM');
  const [locationInput, setLocationInput] = useState('Philippine General Hospital (PGH) - Organ Transplant Center');
  const [showCounterForm, setShowCounterForm] = useState(false);

  const selfRole = role === 'donor' ? 'Donor' : 'Recipient';
  const partnerName = role === 'donor' ? `${match.recipient.first_name} ${match.recipient.last_name}` : `${match.donor.first_name} ${match.donor.last_name}`;
  const partnerRole = role === 'donor' ? 'Recipient' : 'Donor';

  const hasProposal = Boolean(match.proposedSchedule?.date);
  const isProposedBySelf = hasProposal && match.proposedSchedule?.proposedBy === selfRole;
  const isProposedByOther = hasProposal && match.proposedSchedule?.proposedBy !== selfRole;

  const handlePropose = (e) => {
    e.preventDefault();
    proposeSchedule({ date: dateInput, time: timeInput, location: locationInput, proposedBy: selfRole });
    setShowCounterForm(false);
  };

  const handleConfirm = () => {
    if (match.proposedSchedule) {
      setScheduledDate(match.proposedSchedule.date, match.proposedSchedule.time, match.proposedSchedule.location);
    }
  };

  // 1. REJECTION FALLBACK (Issue #008)
  if (match.status === 'rejected') {
    return (
      <div className="card anim-in" style={{ padding: '48px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginBottom: 10, fontFamily: 'var(--font-heading)' }}>
          Demo match declined
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--foreground-muted)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.6 }}>
          No new match search has started. Choose Start over to review another sample match.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={resetMatch}
            style={{ fontSize: 12, color: 'var(--foreground-muted)' }}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // 2. PERSISTENT BIOLOGICAL MATCH PROFILE HEADER (Displayed across ALL active stages)
  const isSigned = match.donorSigned && match.recipientSigned || ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);

  return (
    <div className="card anim-in match-card" style={{ padding: 'clamp(20px, 4vw, 32px)', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
      {/* Persistent top header - editorial layout */}
      <div className="match-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '28px', position: 'relative' }}>
        {/* Eyebrow row: status pill + percentage on the same quiet line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className={`badge ${match.status === 'pending_hospital_approval' ? 'badge-warning' : 'badge-success'}`} style={{ letterSpacing: '0.08em' }}>
            {match.status === 'pending_hospital_approval' ? 'Hospital demo review pending' : <><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={12} /></span> Demo match approved</>}
          </span>
          <span className="match-header-score" style={{ fontSize: 14, color: 'var(--emerald)', fontWeight: 700, display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>{match.compatibilityScore}%</span>
            <span style={{ color: 'var(--foreground-muted)', fontWeight: 500 }}>match quality</span>
          </span>
        </div>

        {/* Editorial title - large, light weight, type-led */}
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(28px, 5vw, 38px)',
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: 'var(--foreground)',
          margin: 0,
        }}>
          Your {match.organ} match.
        </h2>

        {/* Hospital attribution - quiet, with hairline rule */}
        <p style={{
          fontSize: 15,
          color: 'var(--foreground-muted)',
          margin: '10px 0 0',
          paddingTop: 10,
          borderTop: '1px dashed var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <span>at</span>
          <strong style={{ color: 'var(--primary)', fontWeight: 700, overflowWrap: 'anywhere' }}>{match.hospital.name}</strong>
          <span aria-hidden="true">/</span>
          <span>Hospital review context / demo data</span>
        </p>
      </div>

      {/* Persistent Match Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: 'var(--background-alt)', padding: '18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: '28px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>What you're donating / receiving</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>{match.organ}</div>
          <div style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>Compatibility estimate / not clinical clearance</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>{partnerRole}'s name</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>
            {isSigned ? partnerName : 'Hidden until you sign'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>
            {isSigned ? 'You can both see each other now' : 'Their name shows up after you sign'}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Priority</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--destructive)', marginTop: 2 }}>{match.urgencyLevel ? match.urgencyLevel : 'Urgent'}</div>
          <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>Demo priority view</div>
        </div>
      </div>

      {/* STAGE A: PENDING HOSPITAL APPROVAL */}
      {match.status === 'pending_hospital_approval' && (
        <div role="status" aria-live="polite" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--r-md)', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#B45309' }}>
              Waiting for the hospital to review
            </div>
            <div style={{ fontSize: '13px', color: 'var(--foreground)', marginTop: '4px', lineHeight: 1.5 }}>
              A hospital administrator is reviewing this demo match. This screen does not provide clinical clearance or guarantee a text message.
            </div>
          </div>
        </div>
      )}

      {/* STAGE B: SCHEDULE CONFIRMED OR CONTRACT SIGNED */}
      {['scheduled', 'contract_signed', 'ready_for_transplant', 'agreement_finalized'].includes(match.status) && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><MatchIcon size={22} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--foreground)' }}>Appointment is set</div>
              <div style={{ fontSize: '13px', color: 'var(--emerald)', fontWeight: 700 }}><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={12} /></span> Schedule saved in this demo</div>
            </div>
            {isSigned ? (
              <span className="badge badge-verified"><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={11} /></span> Agreement signed</span>
            ) : (
              <span className="badge badge-warning">Sign agreement next</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px', background: 'rgba(5, 150, 105, 0.04)', borderRadius: 'var(--r-md)', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Your appointment
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--foreground)' }}>
                {match.scheduledDate || match.proposedSchedule?.date || 'August 10, 2026'}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--emerald)', marginTop: 2 }}>
                {match.scheduledTime || match.proposedSchedule?.time || '10:00 AM'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: 8 }}>
                at <strong>{match.scheduledLocation || match.proposedSchedule?.location || match.hospital.name}</strong>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Next step
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)' }}>
                  {isSigned ? 'Chat with your match' : 'Sign the agreement'}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: 6, lineHeight: 1.5, marginBottom: 16 }}>
                  {isSigned
                    ? 'You can now talk to your match about the day.'
                    : 'Both you and your match need to sign the agreement before you can chat.'}
                </p>
              </div>
              <div>
                {onNavigateTab && (
                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={() => onNavigateTab(isSigned ? 'chat' : 'agreement')}
                    style={{ fontWeight: 800 }}
                  >
                    {isSigned ? 'Open chat' : 'Sign the agreement'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE C: APPROVED / INTERACTIVE SCHEDULE HANDSHAKE */}
      {!['pending_hospital_approval', 'scheduled', 'contract_signed', 'ready_for_transplant', 'agreement_finalized'].includes(match.status) && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><MatchIcon size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--foreground)', margin: 0 }}>
                Pick a date together
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', margin: '4px 0 0' }}>
                The hospital review demo approved this match. Suggest a date below; a doctor must make any clinical decision.
              </p>
            </div>
          </div>

          {/* Handshake Display Logic */}
          {isProposedByOther && !showCounterForm ? (
            <div style={{ padding: '24px', background: 'rgba(0, 56, 168, 0.04)', borderRadius: 'var(--r-lg)', border: '2px solid rgba(0, 56, 168, 0.25)' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', marginBottom: '14px' }}>
                {partnerName} suggested a date
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'white', padding: '16px', borderRadius: 'var(--r-md)', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--foreground)', marginTop: 2 }}>{match.proposedSchedule.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Time</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--emerald)', marginTop: 2 }}>{match.proposedSchedule.time}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Where</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2, overflowWrap: 'anywhere' }}>{match.proposedSchedule.location}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg btn-full"
                style={{ fontWeight: 800, padding: '14px', background: 'var(--emerald)', border: 'none' }}
                onClick={handleConfirm}
              >
                <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={14} /></span> Confirm this date
              </button>
              <button
                type="button"
                onClick={() => setShowCounterForm(true)}
                style={{ background: 'none', border: 'none', width: '100%', marginTop: 12, padding: '6px', fontSize: 13, fontWeight: 600, color: 'var(--foreground-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Suggest a different date
              </button>
            </div>
          ) : isProposedBySelf && !showCounterForm ? (
            <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#B45309', marginBottom: '14px' }}>
                Waiting for {partnerName} to confirm
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'white', padding: '16px', borderRadius: 'var(--r-md)', marginBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--foreground)', marginTop: 2 }}>{match.proposedSchedule.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Time</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--emerald)', marginTop: 2 }}>{match.proposedSchedule.time}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Where</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2, overflowWrap: 'anywhere' }}>{match.proposedSchedule.location}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                A simulated notification was queued in this demo. Check back here for their response.
              </p>
              <button
                type="button"
                onClick={() => setShowCounterForm(true)}
                style={{ background: 'none', border: 'none', width: '100%', marginTop: 12, padding: '6px', fontSize: 13, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Change the date
              </button>
            </div>
          ) : (
            /* Propose / Counter-Propose Form */
            <form onSubmit={handlePropose} style={{ padding: '24px', background: 'var(--background-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--foreground)', margin: 0, marginBottom: '16px' }}>
                {showCounterForm ? 'Suggest a different date' : 'Pick a date'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label htmlFor="clinical-date" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                    Date
                  </label>
                  <input
                    id="clinical-date" type="date"
                    className="input"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="clinical-time" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                    Time
                  </label>
                  <select
                    id="clinical-time" className="input"
                    value={timeInput}
                    onChange={e => setTimeInput(e.target.value)}
                    style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                  >
                    <option value="08:00 AM">8:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="01:30 PM">1:30 PM</option>
                    <option value="03:30 PM">3:30 PM</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="clinical-location" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                    Where
                  </label>
                  <input
                    id="clinical-location" type="text"
                    className="input"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    style={{ width: '100%', fontWeight: 600, fontSize: 13 }}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ fontWeight: 800, padding: '14px' }}>
                <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={14} /></span> Send this date to {partnerName}
              </button>
              {showCounterForm && (
                <button
                  type="button"
                  onClick={() => setShowCounterForm(false)}
                  style={{ background: 'none', border: 'none', width: '100%', marginTop: 10, padding: '6px', fontSize: 13, fontWeight: 600, color: 'var(--foreground-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Cancel
                </button>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
