import './GovernmentAgreement.css';
import React, { useState } from 'react';
import { useMatch } from '../../context/MatchContext';
import SignatureUploader from './SignatureUploader';

export default function GovernmentAgreement({ role = 'recipient' }) {
  const { match, signAgreement } = useMatch();
  const [localSigned, setLocalSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(
    role === 'donor' ? match.donorSigned : match.recipientSigned
  );

  const handleSignatureComplete = () => {
    setLocalSigned(true);
  };

  const handleSubmitAgreement = () => {
    setSubmitting(true);
    setTimeout(() => {
      signAgreement(role);
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const isComplete = match.donorSigned && match.recipientSigned && ['contract_signed', 'ready_for_transplant'].includes(match.status);
  const currentPartySigned = role === 'donor' ? match.donorSigned || submitted : match.recipientSigned || submitted;

  return (
    <div className="card anim-in government-agreement">
      {/* Official Header */}
      <div className="government-agreement__header">
        <div className="government-agreement__eyebrow">
          eBuhay demonstration agreement
        </div>
        <h2 className="government-agreement__title">
          Donation Agreement
        </h2>
        <div className="government-agreement__disclaimer">
          Sample workflow copy for this prototype; it is not a government form or legal advice.
        </div>
      </div>

      {/* Complete Confirmation Callout */}
      {isComplete ? (
        <div className="government-agreement__callout government-agreement__callout--complete">
          <div className="government-agreement__callout-icon government-agreement__callout-icon--complete">
            ✓
          </div>
          <div>
            <div className="government-agreement__callout-title government-agreement__callout-title--complete">
              All signed
            </div>
            <div className="government-agreement__callout-copy government-agreement__callout-copy--complete">
              You and your match have both signed. You can now chat with each other to plan the day.
            </div>
          </div>
        </div>
      ) : currentPartySigned ? (
        <div className="government-agreement__callout government-agreement__callout--pending">
          <div className="government-agreement__callout-icon government-agreement__callout-icon--pending">
            ⏳
          </div>
          <div>
            <div className="government-agreement__callout-title government-agreement__callout-title--pending">
              You signed
            </div>
            <div className="government-agreement__callout-copy government-agreement__callout-copy--pending">
              Waiting for your match to sign too.
            </div>
          </div>
        </div>
      ) : null}

      {/* Who's involved */}
      <div className="government-agreement__section">
        <h3 className="government-agreement__section-title">
          Who's involved
        </h3>
        <div className="government-agreement__participant-grid">
          <div>
            <strong>{match.donor.first_name}</strong> is donating <strong className="government-agreement__organ">{match.organ}</strong>.
          </div>
          <div>
            <strong>{match.recipient.first_name}</strong> is receiving it.
          </div>
          <div>
          Hospital: <strong className="government-agreement__hospital">{match.hospital.name}</strong>
          </div>
          {match.scheduledDate && (
            <div>
              On <strong>{match.scheduledDate} at {match.scheduledTime || '10:00 AM'}</strong>.
            </div>
          )}
        </div>
      </div>

      {/* What you're agreeing to (collapsed by default) */}
      <details className="government-agreement__terms">
        <summary className="government-agreement__terms-summary">
          <span>What you're agreeing to</span>
          <span className="government-agreement__terms-hint">▾ Tap to read</span>
        </summary>
        <ol className="government-agreement__terms-list">
          <li>
            <strong>You're doing this freely.</strong> Nobody is paying you or pressuring you. This is your choice.
          </li>
          <li>
            <strong>Clinical care is separate.</strong> A doctor must make any clinical decision; this hospital administrator demo does not provide medical clearance.
          </li>
          <li>
            <strong>This signature is simulated.</strong> It records your action in this prototype and is not a verified identity, legal signature, or authorization.
          </li>
        </ol>
      </details>

      {/* Signatures */}
      <div className="government-agreement__section government-agreement__signatures">
        <h3 className="government-agreement__section-title">
          Signatures
        </h3>
        <div className="government-agreement__signature-grid">
          {/* Donor Signature Box */}
          <div className="government-agreement__signature-card" style={{background: match.donorSigned ? 'rgba(5, 150, 105, 0.03)' : 'white'}}>
            <div className="government-agreement__signature-card-header">
              <span className="government-agreement__signature-name">{match.donor.first_name} (Donor)</span>
              {match.donorSigned ? (
                <span className="badge badge-success government-agreement__status-badge">✓ Signed</span>
              ) : (
                <span className="badge badge-muted government-agreement__status-badge">Not yet</span>
              )}
            </div>
            {match.donorSigned ? (
              <div className="government-agreement__signed-record">
                <span className="government-agreement__signed-icon">✍️</span>
                <div className="government-agreement__signed-copy">
                  <div className="government-agreement__signed-title">Signed</div>
                  <div className="government-agreement__signed-detail">Recorded in demo</div>
                </div>
              </div>
            ) : role === 'donor' && !submitted ? (
              <SignatureUploader onUploadComplete={handleSignatureComplete} title="Add your signature" variant="medical" />
            ) : (
              <div className="government-agreement__waiting">
                Waiting for them to sign.
              </div>
            )}
          </div>

          {/* Recipient Signature Box */}
          <div className="government-agreement__signature-card" style={{background: match.recipientSigned ? 'rgba(5, 150, 105, 0.03)' : 'white'}}>
            <div className="government-agreement__signature-card-header">
              <span className="government-agreement__signature-name">{match.recipient.first_name} (Recipient)</span>
              {match.recipientSigned ? (
                <span className="badge badge-success government-agreement__status-badge">✓ Signed</span>
              ) : (
                <span className="badge badge-muted government-agreement__status-badge">Not yet</span>
              )}
            </div>
            {match.recipientSigned ? (
              <div className="government-agreement__signed-record">
                <span className="government-agreement__signed-icon">✍️</span>
                <div className="government-agreement__signed-copy">
                  <div className="government-agreement__signed-title">Signed</div>
                  <div className="government-agreement__signed-detail">Recorded in demo</div>
                </div>
              </div>
            ) : role === 'recipient' && !submitted ? (
              <SignatureUploader onUploadComplete={handleSignatureComplete} title="Add your signature" variant="medical" />
            ) : (
              <div className="government-agreement__waiting">
                Waiting for them to sign.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button: No web3 jargon whatsoever */}
      {!currentPartySigned && (
        <div className="government-agreement__actions">
          <button
            type="button"
            className="btn btn-primary btn-lg btn-full government-agreement__submit"
            disabled={!localSigned || submitting}
            onClick={handleSubmitAgreement}
          >
            {submitting ? (
              <><span className="spinner" /> Saving…</>
            ) : (
              <>Sign and continue ✓</>
            )}
          </button>
          {!localSigned && (
            <p className="government-agreement__submit-hint">
              Add your signature above first.
            </p>
          )}
        </div>
      )}

      {currentPartySigned && (
        <div className="government-agreement__recorded-notice">
          ✓ Your demo agreement action was recorded. It is not a legal declaration or clinical authorization.
        </div>
      )}
    </div>
  );
}
