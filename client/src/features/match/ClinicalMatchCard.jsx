import './ClinicalMatchCard.css';
import React, { useState } from 'react';
import { useMatch } from '../../context/MatchContext';
import { CheckIcon, MatchIcon } from '../../components/ui/Icons';

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
      <div className="card anim-in clinical-match-rejection-card">
        <h3 className="clinical-match-rejection-title">
          Demo match declined
        </h3>
        <p className="clinical-match-rejection-copy">
          No new match search has started. Choose Start over to review another sample match.
        </p>
        <div className="clinical-match-rejection-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm clinical-match-rejection-reset"
            onClick={resetMatch}
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
    <div className="card anim-in match-card clinical-match-match-card-shell">
      {/* Persistent top header - editorial layout */}
      <div className="match-header clinical-match-match-header">
        {/* Eyebrow row: status pill + percentage on the same quiet line */}
        <div className="clinical-match-match-eyebrow">
          <span className={`clinical-match-status-badge badge ${match.status === 'pending_hospital_approval' ? 'badge-warning' : 'badge-success'}`}>
            {match.status === 'pending_hospital_approval' ? 'Hospital demo review pending' : <><span className="clinical-match-status-check" aria-hidden="true"><CheckIcon size={12} /></span> Demo match approved</>}
          </span>
          <span className="match-header-score clinical-match-score-wrap">
            <span className="clinical-match-score-value">{match.compatibilityScore}%</span>
            <span className="clinical-match-score-label">match quality</span>
          </span>
        </div>

        {/* Editorial title - large, light weight, type-led */}
        <h2 className="clinical-match-title">
          Your {match.organ} match.
        </h2>

        {/* Hospital attribution - quiet, with hairline rule */}
        <p className="clinical-match-hospital-attribution">
          <span>at</span>
          <strong className="clinical-match-score-label">{match.hospital.name}</strong>
          <span aria-hidden="true">/</span>
          <span>Hospital review context / demo data</span>
        </p>
      </div>

      {/* Persistent Match Details Grid */}
      <div className="clinical-match-match-details">
        <div className="clinical-match-detail-organ">
          <div className="clinical-match-detail-label">What you're donating / receiving</div>
          <div className="clinical-match-detail-value">{match.organ}</div>
          <div className="clinical-match-detail-note">Compatibility estimate / not clinical clearance</div>
        </div>
        <div className="clinical-match-detail-partner">
          <div className="clinical-match-partner-label">{partnerRole}'s name</div>
          <div className="clinical-match-partner-value">
            {isSigned ? partnerName : 'Hidden until you sign'}
          </div>
          <div className="clinical-match-partner-note">
            {isSigned ? 'You can both see each other now' : 'Their name shows up after you sign'}
          </div>
        </div>
        <div className="clinical-match-detail-priority">
          <div className="clinical-match-priority-label">Priority</div>
          <div className="clinical-match-priority-value">{match.urgencyLevel ? match.urgencyLevel : 'Urgent'}</div>
          <div className="clinical-match-priority-note">Demo priority view</div>
        </div>
      </div>

      {/* STAGE A: PENDING HOSPITAL APPROVAL */}
      {match.status === 'pending_hospital_approval' && (
        <div className="clinical-match-review-pending" role="status" aria-live="polite">
          <div>
            <div className="clinical-match-review-title">
              Waiting for the hospital to review
            </div>
            <div className="clinical-match-review-copy">
              A hospital administrator is reviewing this demo match. This screen does not provide clinical clearance or guarantee a text message.
            </div>
          </div>
        </div>
      )}

      {/* STAGE B: SCHEDULE CONFIRMED OR CONTRACT SIGNED */}
      {['scheduled', 'contract_signed', 'ready_for_transplant', 'agreement_finalized'].includes(match.status) && (
        <div className="clinical-match-appointment-section">
          <div className="clinical-match-appointment-header">
            <span className="clinical-match-appointment-icon" aria-hidden="true"><MatchIcon size={22} /></span>
            <div className="clinical-match-appointment-copy">
              <div className="clinical-match-appointment-title">Appointment is set</div>
              <div className="clinical-match-appointment-status"><span className="clinical-match-appointment-check" aria-hidden="true"><CheckIcon size={12} /></span> Schedule saved in this demo</div>
            </div>
            {isSigned ? (
              <span className="badge badge-verified"><span className="clinical-match-appointment-icon" aria-hidden="true"><CheckIcon size={11} /></span> Agreement signed</span>
            ) : (
              <span className="badge badge-warning">Sign agreement next</span>
            )}
          </div>

          <div className="clinical-match-appointment-grid">
            <div className="clinical-match-appointment-card">
              <div className="clinical-match-appointment-label">
                Your appointment
              </div>
              <div className="clinical-match-appointment-date">
                {match.scheduledDate || match.proposedSchedule?.date || 'August 10, 2026'}
              </div>
              <div className="clinical-match-appointment-time">
                {match.scheduledTime || match.proposedSchedule?.time || '10:00 AM'}
              </div>
              <div className="clinical-match-appointment-location">
                at <strong>{match.scheduledLocation || match.proposedSchedule?.location || match.hospital.name}</strong>
              </div>
            </div>

            <div className="clinical-match-next-card">
              <div>
                <div className="clinical-match-next-label">
                  Next step
                </div>
                <div className="clinical-match-next-title">
                  {isSigned ? 'Chat with your match' : 'Sign the agreement'}
                </div>
                <p className="clinical-match-next-copy">
                  {isSigned
                    ? 'You can now talk to your match about the day.'
                    : 'Both you and your match need to sign the agreement before you can chat.'}
                </p>
              </div>
              <div>
                {onNavigateTab && (
                  <button
                    type="button"
                    className="btn btn-primary btn-full clinical-match-next-button"
                    onClick={() => onNavigateTab(isSigned ? 'chat' : 'agreement')}
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
        <div className="clinical-match-schedule-section">
          <div className="clinical-match-schedule-heading">
            <span className="clinical-match-schedule-icon" aria-hidden="true"><MatchIcon size={22} /></span>
            <div className="clinical-match-schedule-copy">
              <h3 className="clinical-match-schedule-title">
                Pick a date together
              </h3>
              <p className="clinical-match-schedule-description">
                The hospital review demo approved this match. Suggest a date below; a doctor must make any clinical decision.
              </p>
            </div>
          </div>

          {/* Handshake Display Logic */}
          {isProposedByOther && !showCounterForm ? (
            <div className="clinical-match-schedule-heading">
              <div className="clinical-match-schedule-icon">
                {partnerName} suggested a date
              </div>
              <div className="clinical-match-schedule-copy">
                <div>
                  <div className="clinical-match-schedule-title">Date</div>
                  <div className="clinical-match-schedule-description">{match.proposedSchedule.date}</div>
                </div>
                <div>
                  <div className="clinical-match-proposal-card">Time</div>
                  <div className="clinical-match-proposal-heading">{match.proposedSchedule.time}</div>
                </div>
                <div>
                  <div className="clinical-match-proposal-grid">Where</div>
                  <div className="clinical-match-proposal-label-date">{match.proposedSchedule.location}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg btn-full clinical-match-proposal-date"
                onClick={handleConfirm}
              >
                <span className="clinical-match-proposal-label-time" aria-hidden="true"><CheckIcon size={14} /></span> Confirm this date
              </button>
              <button className="clinical-match-proposal-time"
                type="button"
                onClick={() => setShowCounterForm(true)}
              >
                Suggest a different date
              </button>
            </div>
          ) : isProposedBySelf && !showCounterForm ? (
            <div className="clinical-match-proposal-label-location">
              <div className="clinical-match-proposal-location">
                Waiting for {partnerName} to confirm
              </div>
              <div className="clinical-match-proposal-confirm">
                <div>
                  <div className="clinical-match-proposal-action-icon">Date</div>
                  <div className="clinical-match-proposal-change">{match.proposedSchedule.date}</div>
                </div>
                <div>
                  <div className="clinical-match-waiting-card">Time</div>
                  <div className="clinical-match-waiting-heading">{match.proposedSchedule.time}</div>
                </div>
                <div>
                  <div className="clinical-match-waiting-grid">Where</div>
                  <div className="clinical-match-waiting-label-date">{match.proposedSchedule.location}</div>
                </div>
              </div>
              <p className="clinical-match-waiting-date">
                A simulated notification was queued in this demo. Check back here for their response.
              </p>
              <button className="clinical-match-waiting-label-time"
                type="button"
                onClick={() => setShowCounterForm(true)}
              >
                Change the date
              </button>
            </div>
          ) : (
            /* Propose / Counter-Propose Form */
            <form className="clinical-match-waiting-time" onSubmit={handlePropose}>
              <h3 className="clinical-match-waiting-label-location">
                {showCounterForm ? 'Suggest a different date' : 'Pick a date'}
              </h3>
              <div className="clinical-match-waiting-location">
                <div>
                  <label className="clinical-match-waiting-copy" htmlFor="clinical-date">
                    Date
                  </label>
                  <input
                    id="clinical-date" type="date"
                    className="input clinical-match-schedule-date-input"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="clinical-match-waiting-change" htmlFor="clinical-time">
                    Time
                  </label>
                  <select
                    id="clinical-time" className="input clinical-match-schedule-time-input"
                    value={timeInput}
                    onChange={e => setTimeInput(e.target.value)}
                  >
                    <option value="08:00 AM">8:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="01:30 PM">1:30 PM</option>
                    <option value="03:30 PM">3:30 PM</option>
                  </select>
                </div>
                <div className="clinical-match-score-value">
                  <label className="clinical-match-schedule-form" htmlFor="clinical-location">
                    Where
                  </label>
                  <input
                    id="clinical-location" type="text"
                    className="input clinical-match-schedule-location-input"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full clinical-match-schedule-form-title">
                <span className="clinical-match-schedule-fields" aria-hidden="true"><CheckIcon size={14} /></span> Send this date to {partnerName}
              </button>
              {showCounterForm && (
                <button className="clinical-match-schedule-label-date"
                  type="button"
                  onClick={() => setShowCounterForm(false)}
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
