import React, { useState } from 'react';
import { useMatch } from '../context/MatchContext';

export default function ClinicalMatchCard({ role = 'recipient', onNavigateTab }) {
  const { match, proposeSchedule, setScheduledDate, resetMatch } = useMatch();

  const [dateInput, setDateInput] = useState('2026-08-10');
  const [timeInput, setTimeInput] = useState('10:00 AM');
  const [locationInput, setLocationInput] = useState('Philippine General Hospital (PGH) - Organ Transplant Center');
  const [showCounterForm, setShowCounterForm] = useState(false);

  const selfRole = role === 'donor' ? 'Donor' : 'Recipient';
  const partnerName = role === 'donor' ? `${match.recipient.first_name} ${match.recipient.last_name}` : `${match.donor.first_name} ${match.donor.last_name}`;
  const partnerRole = role === 'donor' ? 'Recipient' : 'Donor';

  // 1. REJECTION FALLBACK (Issue #008)
  if (match.status === 'rejected') {
    return (
      <div className="card anim-in" style={{ padding: '48px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 20px', width: 44, height: 44, borderWidth: 4 }} />
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginBottom: 10, fontFamily: 'var(--font-heading)' }}>
          Searching for compatible matches...
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--foreground-muted)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.6 }}>
          The clinical evaluation for your previous match candidate was declined during institutional medical triage. The DOH National Organ &amp; Blood Matching Registry is actively scanning verified PhilSys patient profiles in real-time for your next compatible biological match.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: 'rgba(0, 56, 168, 0.05)', borderRadius: 'var(--r-full)', border: '1px solid rgba(0, 56, 168, 0.2)', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
            Automated DOH Health Registry Scan Active
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={resetMatch}
            style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}
          >
            ↺ Reset Evaluation Demo State
          </button>
        </div>
      </div>
    );
  }

  // 2. PERSISTENT BIOLOGICAL MATCH PROFILE HEADER (Displayed across ALL active stages)
  const isSigned = match.donorSigned && match.recipientSigned || ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);

  return (
    <div className="card anim-in" style={{ padding: '32px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)' }}>
      {/* Persistent Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ width: 54, height: 54, borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 800, flexShrink: 0, boxShadow: '0 8px 20px rgba(0,56,168,0.2)' }}>
          🏥
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${match.status === 'pending_hospital_approval' ? 'badge-warning' : 'badge-success'}`}>
              {match.status === 'pending_hospital_approval' ? 'Under Medical Evaluation' : 'PGH Institutional Approval Granted ✓'}
            </span>
            <span className="badge badge-verified">Automated ABO Match Discovered ✓</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px', color: 'var(--foreground)' }}>
            Compatible {match.organ} Match Partner ({partnerRole})
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', margin: 0 }}>
            Assigned Medical Facility: <strong style={{ color: 'var(--primary)' }}>{match.hospital.name} ({match.hospital.facility})</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 120 }}>
          <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Compatibility Score</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--emerald)' }}>{match.compatibilityScore}%</div>
          <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>HLA / ABO Confirmed</div>
        </div>
      </div>

      {/* Persistent Anatomical Match Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: 'var(--background-alt)', padding: '18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Biological Match Type</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>{match.organ} Transplantation</div>
          <div style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 600 }}>Cross-Match Verified</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>{partnerRole} Identity Status</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>
            {isSigned ? `${partnerName} (Unmasked ✓)` : 'Masked (Tier I Verified)'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>
            {isSigned ? 'Verified identity unmasked' : 'Unmasks upon agreement execution'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Triage Priority Level</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--destructive)', marginTop: 2 }}>{match.urgencyLevel ? match.urgencyLevel.toUpperCase() : 'URGENT'}</div>
          <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>National Queue Protected</div>
        </div>
      </div>

      {/* STAGE A: PENDING HOSPITAL APPROVAL */}
      {match.status === 'pending_hospital_approval' && (
        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--r-md)', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#B45309' }}>
              Awaiting Institutional Doctor Approval
            </div>
            <div style={{ fontSize: '13px', color: 'var(--foreground)', marginTop: '4px', lineHeight: '1.6' }}>
              Under Philippine Clinical Governance rules (RA No. 7170), automated biological match pairings must be reviewed and clinically cleared by authorized hospital transplant coordinators before direct peer scheduling and secure communication can begin.
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 600, color: 'var(--foreground-muted)' }}>
              <span>ℹ️ No manual action required on your part. You will receive an instantaneous DICT eMessage SMS push alert upon clinical decision.</span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE B: SCHEDULE CONFIRMED OR CONTRACT SIGNED */}
      {['scheduled', 'contract_signed', 'ready_for_transplant', 'agreement_finalized'].includes(match.status) && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: 24 }}>🤝</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--foreground)' }}>Clinical Consultation &amp; Admission Confirmed</div>
              <div style={{ fontSize: '13px', color: 'var(--emerald)', fontWeight: 700 }}>✓ Appointment Reserved in PGH Operating Registry</div>
            </div>
            {isSigned ? (
              <span className="badge badge-verified">Agreement Completed &amp; Audited ✓</span>
            ) : (
              <span className="badge badge-warning">Awaiting Agreement Signatures ⏳</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px', background: 'rgba(5, 150, 105, 0.04)', borderRadius: 'var(--r-md)', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                📅 Confirmed Schedule Handshake
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--foreground)' }}>
                {match.scheduledDate || match.proposedSchedule?.date || 'August 10, 2026'}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--emerald)', marginTop: 2 }}>
                Time: {match.scheduledTime || match.proposedSchedule?.time || '10:00 AM'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: 8 }}>
                Location: <strong>{match.scheduledLocation || match.proposedSchedule?.location || match.hospital.name}</strong>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--foreground-subtle)', marginTop: 10, fontStyle: 'italic' }}>
                ✓ Reserved in PGH Operating &amp; Specialist Consultation Registry
              </div>
            </div>

            <div style={{ padding: '20px', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  📜 Next Clinical Milestone
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--foreground)' }}>
                  {isSigned ? 'Ready for Pre-Operative Admission' : 'Execute Official Donation Agreement'}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: 6, lineHeight: 1.5, marginBottom: 16 }}>
                  {isSigned
                    ? 'Your digital consent has been legally executed under DOH authority. You may use direct clinical chat to coordinate logistics with your matching peer.'
                    : 'Now that your consultation schedule is confirmed, both parties must affix their verified DICT electronic signatures onto the official government consent document.'}
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
                    {isSigned ? 'Open Unmasked Clinical Chat 💬' : 'Proceed to Agreement Form ➔'}
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
            <span style={{ fontSize: 24 }}>🤝</span>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--foreground)', margin: 0 }}>
                Coordinate Clinical Procedure Schedule
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', margin: '4px 0 0' }}>
                An attending medical specialist at <strong style={{ color: 'var(--primary)' }}>{match.hospital.name}</strong> has cleared your compatibility matrix. You may now agree upon a mutual appointment time.
              </p>
            </div>
          </div>

          {/* Handshake Display Logic */}
          {isProposedByOther && !showCounterForm ? (
            <div style={{ padding: '24px', background: 'rgba(0, 56, 168, 0.04)', borderRadius: 'var(--r-lg)', border: '2px solid rgba(0, 56, 168, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📩 Schedule Proposed by {partnerRole} ({partnerName})</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>Requires Your Confirmation or Suggestion</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'white', padding: '18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Proposed Date</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--foreground)', marginTop: 2 }}>{match.proposedSchedule.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Proposed Time</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--emerald)', marginTop: 2 }}>{match.proposedSchedule.time}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Assigned Location</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>{match.proposedSchedule.location}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1, fontWeight: 800, padding: '14px', background: 'var(--emerald)', border: 'none', minWidth: 200 }}
                  onClick={handleConfirm}
                >
                  Confirm Schedule ✓
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  style={{ fontWeight: 700, padding: '14px 20px', minWidth: 200 }}
                  onClick={() => setShowCounterForm(true)}
                >
                  Suggest Alternative Date ⇄
                </button>
              </div>
            </div>
          ) : isProposedBySelf && !showCounterForm ? (
            <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#B45309', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⏳ Awaiting {partnerRole}'s Schedule Confirmation</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '11px' }}>Proposal Sent via DICT eMessage Push</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--foreground)', marginBottom: '16px', lineHeight: 1.5 }}>
                You have sent a proposed consultation schedule to the {partnerRole}. They have received a reactive DICT eMessage SMS alert and can confirm or suggest an alternative window in their portal.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'white', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Your Proposed Date</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>{match.proposedSchedule.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Your Proposed Time</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--emerald)', marginTop: 2 }}>{match.proposedSchedule.time}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Facility Location</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--foreground)', marginTop: 2 }}>{match.proposedSchedule.location}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCounterForm(true)}
                style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}
              >
                Modify Proposed Schedule ⇄
              </button>
            </div>
          ) : (
            /* Propose / Counter-Propose Form */
            <form onSubmit={handlePropose} style={{ padding: '24px', background: 'var(--background-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                  {showCounterForm ? 'Suggest Alternative Consultation Schedule' : 'Propose Initial Consultation Date'}
                </h3>
                {showCounterForm && hasProposal && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCounterForm(false)} style={{ color: 'var(--destructive)', fontSize: 12 }}>
                    Cancel Counter-Proposal
                  </button>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                Submitting a date will generate an instantaneous DICT eMessage SMS alert on your partner's citizen command console for simple 1-click confirmation or interactive scheduling adjustments.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                    Time Window
                  </label>
                  <select
                    className="input"
                    value={timeInput}
                    onChange={e => setTimeInput(e.target.value)}
                    style={{ width: '100%', fontWeight: 700, fontSize: 14 }}
                  >
                    <option value="08:00 AM">08:00 AM - Morning Clearance</option>
                    <option value="10:00 AM">10:00 AM - Specialist Consultation</option>
                    <option value="01:30 PM">01:30 PM - Afternoon Evaluation</option>
                    <option value="03:30 PM">03:30 PM - Clinical Pre-Admission</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--foreground)' }}>
                    Designated Hospital Facility &amp; Transplant Unit
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    style={{ width: '100%', fontWeight: 600, fontSize: 13 }}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ fontWeight: 800, padding: '14px' }}>
                Transmit Schedule Proposal via DICT eMessage ➔
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
