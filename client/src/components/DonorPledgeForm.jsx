import React from 'react';
import SignatureUploader from './SignatureUploader';

export default function DonorPledgeForm({
  donorPledge,
  setDonorPledge,
  onSubmit,
  onBack,
  anchoringPledge,
  pledgeAnchor,
}) {
  return (
    <div className="anim-in">
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>E-Signature Organ Pledge Consent</h3>
      <p style={{ fontSize: 13, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 20 }}>Submit a formal organ pledge. This document will be digitally signed and stored in the secure national audit registry.</p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18, background: 'var(--background-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>My Pledged Organs</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Blood Type:</span>
              <select
                className="input"
                style={{ width: 80, height: 28, padding: '0 4px', fontSize: 12 }}
                value={donorPledge.bloodType}
                onChange={e => setDonorPledge({ ...donorPledge, bloodType: e.target.value })}
              >
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['kidney', 'liver', 'cornea', 'heart', 'lung', 'pancreas'].map((org) => {
              const active = donorPledge.organs.includes(org);
              return (
                <button
                  key={org}
                  type="button"
                  onClick={() => {
                    const newOrgans = active ? donorPledge.organs.filter(x => x !== org) : [...donorPledge.organs, org];
                    setDonorPledge({ ...donorPledge, organs: newOrgans });
                  }}
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {org}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            id="ageConsent"
            required
            checked={donorPledge.ageConsent}
            onChange={e => setDonorPledge({ ...donorPledge, ageConsent: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <label htmlFor="ageConsent" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--foreground-muted)' }}>
            I formally declare that I am of legal age (18+) and under sound mind pledge the selected organs for altruistic medical transplantation in accordance with Philippine RA 7170.
          </label>
        </div>

        <div className="field">
          <label className="label">Digital Signature Document (PDF or Image scan)</label>
          <SignatureUploader
            onUploadComplete={(file) => setDonorPledge({ ...donorPledge, signatureName: file.name })}
            onClear={() => setDonorPledge({ ...donorPledge, signatureName: '' })}
          />
        </div>

        {anchoringPledge && (
          <div className="card anim-in" style={{ background: 'var(--background-alt)', textAlign: 'center', padding: 14 }}>
            <div className="spinner" style={{ margin: '0 auto 8px' }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Securing digital signature with 256-bit encryption &amp; audit hashing...</span>
          </div>
        )}

        {pledgeAnchor && !anchoringPledge && (
          <div className="card anim-in" style={{ border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.03)', padding: 12 }}>
            <div style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓ Digital Signature Secured &amp; Verified</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 4 }}>
              Audit Ref: {pledgeAnchor.txHash.substring(0, 16)}... | Record #{pledgeAnchor.blockNumber}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-ghost" type="button" onClick={onBack} style={{ flex: 1 }} disabled={anchoringPledge}>Back</button>
          <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={anchoringPledge || !donorPledge.ageConsent || !donorPledge.signatureName.trim()}>
            Submit Signed Pledge
          </button>
        </div>
      </form>
    </div>
  );
}
