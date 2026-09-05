import React, { useState } from 'react';
import { useMatch } from '../context/MatchContext';
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
    <div className="card anim-in" style={{ padding: '32px', background: 'white', border: '2px solid var(--primary)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)' }}>
      {/* Official Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid var(--primary)', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1.5px' }}>
          Government of the Philippines
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginTop: '12px', color: 'var(--foreground)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
          Donation Agreement
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--foreground-subtle)', marginTop: '4px' }}>
          A simple, secure promise between you and your match.
        </div>
      </div>

      {/* Complete Confirmation Callout */}
      {isComplete ? (
        <div style={{ padding: '18px 24px', background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.4)', borderRadius: 'var(--r-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--emerald)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, flexShrink: 0 }}>
            ✓
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--emerald)' }}>
              All signed
            </div>
            <div style={{ fontSize: '13px', color: 'var(--foreground)', marginTop: '2px', lineHeight: '1.5' }}>
              You and your match have both signed. You can now chat with each other to plan the day.
            </div>
          </div>
        </div>
      ) : currentPartySigned ? (
        <div style={{ padding: '16px 20px', background: 'rgba(0, 56, 168, 0.05)', border: '1px solid rgba(0, 56, 168, 0.2)', borderRadius: 'var(--r-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
            ⏳
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)' }}>
              You signed
            </div>
            <div style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: '2px' }}>
              Waiting for your match to sign too.
            </div>
          </div>
        </div>
      ) : null}

      {/* Who's involved */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', borderLeft: '4px solid var(--primary)', paddingLeft: '10px', marginBottom: '14px' }}>
          Who's involved
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 18px', background: 'var(--background-alt)', padding: '16px 18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '13px', lineHeight: 1.55 }}>
          <div>
            <strong>{match.donor.first_name}</strong> is donating <strong style={{ color: 'var(--emerald)' }}>{match.organ}</strong>.
          </div>
          <div>
            <strong>{match.recipient.first_name}</strong> is receiving it.
          </div>
          <div>
            Hospital: <strong style={{ color: 'var(--primary)' }}>{match.hospital.name}</strong>
          </div>
          {match.scheduledDate && (
            <div>
              On <strong>{match.scheduledDate} at {match.scheduledTime || '10:00 AM'}</strong>.
            </div>
          )}
        </div>
      </div>

      {/* What you're agreeing to (collapsed by default) */}
      <details style={{ marginBottom: '24px', background: '#F8FAFC', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '13px', lineHeight: '1.7', color: 'var(--foreground)' }}>
        <summary style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>What you're agreeing to</span>
          <span style={{ fontSize: 12, color: 'var(--foreground-muted)', fontWeight: 600 }}>▾ Tap to read</span>
        </summary>
        <ol style={{ padding: '0 18px 14px 32px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>You're doing this freely.</strong> Nobody is paying you or pressuring you. This is your choice.
          </li>
          <li>
            <strong>The hospital will take care of you.</strong> Doctors at {match.hospital.name} will check everything is safe before, during, and after.
          </li>
          <li>
            <strong>Your signature is real.</strong> When you sign below, it's legally binding — same as signing on paper.
          </li>
        </ol>
      </details>

      {/* Signatures */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', borderLeft: '4px solid var(--primary)', paddingLeft: '10px', marginBottom: '16px' }}>
          Signatures
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Donor Signature Box */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', background: match.donorSigned ? 'rgba(5, 150, 105, 0.03)' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{match.donor.first_name} (Donor)</span>
              {match.donorSigned ? (
                <span className="badge badge-success" style={{ fontSize: '11px' }}>✓ Signed</span>
              ) : (
                <span className="badge badge-muted" style={{ fontSize: '11px' }}>Not yet</span>
              )}
            </div>
            {match.donorSigned ? (
              <div style={{ padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>✍️</span>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--emerald)' }}>Signed</div>
                  <div style={{ color: 'var(--foreground-subtle)', fontSize: '11px' }}>Verified</div>
                </div>
              </div>
            ) : role === 'donor' && !submitted ? (
              <SignatureUploader onUploadComplete={handleSignatureComplete} title="Add your signature" variant="medical" />
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--foreground-muted)', fontStyle: 'italic', fontSize: '12px', background: 'var(--background-alt)', borderRadius: 'var(--r-sm)' }}>
                Waiting for them to sign.
              </div>
            )}
          </div>

          {/* Recipient Signature Box */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', background: match.recipientSigned ? 'rgba(5, 150, 105, 0.03)' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{match.recipient.first_name} (Recipient)</span>
              {match.recipientSigned ? (
                <span className="badge badge-success" style={{ fontSize: '11px' }}>✓ Signed</span>
              ) : (
                <span className="badge badge-muted" style={{ fontSize: '11px' }}>Not yet</span>
              )}
            </div>
            {match.recipientSigned ? (
              <div style={{ padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>✍️</span>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--emerald)' }}>Signed</div>
                  <div style={{ color: 'var(--foreground-subtle)', fontSize: '11px' }}>Verified</div>
                </div>
              </div>
            ) : role === 'recipient' && !submitted ? (
              <SignatureUploader onUploadComplete={handleSignatureComplete} title="Add your signature" variant="medical" />
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--foreground-muted)', fontStyle: 'italic', fontSize: '12px', background: 'var(--background-alt)', borderRadius: 'var(--r-sm)' }}>
                Waiting for them to sign.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button: No web3 jargon whatsoever */}
      {!currentPartySigned && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg btn-full"
            style={{ fontWeight: 800, padding: '14px', fontSize: '16px' }}
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
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '8px', fontStyle: 'italic' }}>
              Add your signature above first.
            </p>
          )}
        </div>
      )}

      {currentPartySigned && (
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '20px', color: 'var(--foreground-muted)', fontSize: '13px', fontWeight: 600 }}>
          ✓ Your legal declaration is officially submitted under DOH-PGH clinical authority.
        </div>
      )}
    </div>
  );
}
