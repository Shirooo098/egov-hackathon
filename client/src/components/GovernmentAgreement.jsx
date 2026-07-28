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
    <div className="card anim-in" style={{ padding: '32px', background: 'white', border: '2px solid #0038A8', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)' }}>
      {/* Official Republic of the Philippines Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #0038A8', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#0038A8', letterSpacing: '1.5px' }}>
          Republic of the Philippines
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
          Department of Health &amp; DICT eGov Clinical Governance
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginTop: '12px', color: 'var(--foreground)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
          OFFICIAL CLINICAL DONATION &amp; TRANSPLANTATION AGREEMENT
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--foreground-subtle)', marginTop: '4px' }}>
          Form DOH-PGH-7170-REV2026 · Compliant with RA No. 7170 (Organ Donation Act) &amp; PhilSys eVerify
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
              Agreement Completed &amp; Legally Authorized
            </div>
            <div style={{ fontSize: '13px', color: 'var(--foreground)', marginTop: '2px', lineHeight: '1.5' }}>
              Both Donor and Recipient have completed their verified digital e-signatures. Your clinical consultation and pre-admission procedure are fully secured. Direct peer chat has been unlocked for coordination.
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
              Your E-Signature is Submitted
            </div>
            <div style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: '2px' }}>
              We have recorded your authorization. Awaiting completion of digital e-signature by the matching counter-party.
            </div>
          </div>
        </div>
      ) : null}

      {/* Dynamic Agreement Details Table */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0038A8', textTransform: 'uppercase', borderLeft: '4px solid #0038A8', paddingLeft: '10px', marginBottom: '14px' }}>
          Section I: Clinical &amp; Demographic Verification
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: 'var(--background-alt)', padding: '18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Donor Citizen (Verified Tier I)</div>
            <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>{match.donor.first_name} {match.donor.last_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>Blood Group: <strong style={{ color: 'var(--destructive)' }}>{match.donor.blood_type}</strong> · PhilSys PCN: {match.donor.philsys_pcn}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Recipient Citizen (Verified Tier I)</div>
            <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>{match.recipient.first_name} {match.recipient.last_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>Required Blood: <strong style={{ color: 'var(--destructive)' }}>{match.recipient.blood_type_needed}</strong> · PhilSys PCN: {match.recipient.philsys_pcn}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Authoritative Medical Institution</div>
            <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', color: 'var(--primary)' }}>{match.hospital.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>Organ Procedure: <strong style={{ color: 'var(--emerald)' }}>{match.organ}</strong> · Triage Status: Approved</div>
          </div>
          {match.scheduledDate && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground-subtle)', textTransform: 'uppercase' }}>Confirmed Procedure Window</div>
              <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>{match.scheduledDate} at {match.scheduledTime || '10:00 AM'}</div>
              <div style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>Location: {match.scheduledLocation || match.hospital.facility}</div>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Legal Provisions */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#F8FAFC', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '13px', lineHeight: '1.7', color: 'var(--foreground)' }}>
        <h4 style={{ fontWeight: 800, marginBottom: '8px', color: '#0F172A', textTransform: 'uppercase', fontSize: '12px' }}>
          Section II: Informed Clinical Declarations &amp; Legal Assent
        </h4>
        <ol style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>Voluntary &amp; Altruistic Assent:</strong> The parties declare that this anatomical tissue donation is made voluntarily and freely, in explicit compliance with Republic Act No. 7170 and DOH administrative orders prohibiting monetary remuneration or commercial trafficking.
          </li>
          <li>
            <strong>Institutional Triage Authority:</strong> Both parties authorize medical specialists at Philippine General Hospital (PGH) to evaluate histological compatibility, conduct preoperative screenings, and execute surgical scheduling as deemed clinically safe and appropriate.
          </li>
          <li>
            <strong>Digital Signature Execution:</strong> By affixing an electronic signature below via DICT eVerify credentials, each citizen legally executes this Agreement. The document is permanently archived in the national clinical governance vault.
          </li>
        </ol>
      </div>

      {/* Signature Execution Section */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0038A8', textTransform: 'uppercase', borderLeft: '4px solid #0038A8', paddingLeft: '10px', marginBottom: '16px' }}>
          Section III: Digital Signature Execution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Donor Signature Box */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', background: match.donorSigned ? 'rgba(5, 150, 105, 0.03)' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Donor: {match.donor.first_name} {match.donor.last_name}</span>
              {match.donorSigned ? (
                <span className="badge badge-success" style={{ fontSize: '11px' }}>✓ e-Signed</span>
              ) : (
                <span className="badge badge-muted" style={{ fontSize: '11px' }}>Pending Sign</span>
              )}
            </div>
            {match.donorSigned ? (
              <div style={{ padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>✍️</span>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--emerald)' }}>Verified DICT E-Signature</div>
                  <div style={{ color: 'var(--foreground-subtle)', fontSize: '11px' }}>PhilSys Auth Hash Secured</div>
                </div>
              </div>
            ) : role === 'donor' && !submitted ? (
              <SignatureUploader onUploadComplete={handleSignatureComplete} title="Upload / Attach E-Signature" variant="medical" />
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--foreground-muted)', fontStyle: 'italic', fontSize: '12px', background: 'var(--background-alt)', borderRadius: 'var(--r-sm)' }}>
                Awaiting Donor's electronic signature execution in Donor Portal.
              </div>
            )}
          </div>

          {/* Recipient Signature Box */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', background: match.recipientSigned ? 'rgba(5, 150, 105, 0.03)' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Recipient: {match.recipient.first_name} {match.recipient.last_name}</span>
              {match.recipientSigned ? (
                <span className="badge badge-success" style={{ fontSize: '11px' }}>✓ e-Signed</span>
              ) : (
                <span className="badge badge-muted" style={{ fontSize: '11px' }}>Pending Sign</span>
              )}
            </div>
            {match.recipientSigned ? (
              <div style={{ padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>✍️</span>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--emerald)' }}>Verified DICT E-Signature</div>
                  <div style={{ color: 'var(--foreground-subtle)', fontSize: '11px' }}>PhilSys Auth Hash Secured</div>
                </div>
              </div>
            ) : role === 'recipient' && !submitted ? (
              <SignatureUploader onUploadComplete={handleSignatureComplete} title="Upload / Attach E-Signature" variant="medical" />
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--foreground-muted)', fontStyle: 'italic', fontSize: '12px', background: 'var(--background-alt)', borderRadius: 'var(--r-sm)' }}>
                Awaiting Recipient's electronic signature execution in Recipient Portal.
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
            style={{ fontWeight: 800, padding: '14px', fontSize: '16px', background: '#0038A8' }}
            disabled={!localSigned || submitting}
            onClick={handleSubmitAgreement}
          >
            {submitting ? (
              <><span className="spinner" /> Recording Authorized E-Signature…</>
            ) : (
              <>Submit Agreement ✓</>
            )}
          </button>
          {!localSigned && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '8px', fontStyle: 'italic' }}>
              Please attach your digital signature above to enable submission.
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
