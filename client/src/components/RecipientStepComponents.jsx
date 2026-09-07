import React from 'react';
import { SearchIcon } from './Icons';

export function DeclareNeedStep({
  params,
  errors,
  handleParamChange,
  validateParams,
  setStep,
  resetFlow,
  BLOOD_TYPES,
  ORGANS,
}) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
      <div className="card anim-up">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--s3)' }}>What do you need?</h2>
        <p style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: 'var(--s7)' }}>
          Select the type of donation you require. The prototype will show sample compatibility results.
          <br /><strong>Note:</strong> Urgency level is sample input in this demo; no medical-record API is connected.
        </p>

        <div className="grid-auto" style={{ marginBottom: 'var(--s7)' }}>
          <div className="field">
            <label className="label" htmlFor="declare-request-type">Request Type</label>
            <select
              id="declare-request-type" className={`input ${errors.request_type ? 'input-error' : ''}`}
              value={params.request_type}
              onChange={e => handleParamChange('request_type', e.target.value)}
            >
              <option value="blood">Blood Donation</option>
              <option value="organ">Organ Donation</option>
            </select>
            {errors.request_type && <div className="field-message field-error"><span>⚠</span>{errors.request_type}</div>}
          </div>
          <div className="field">
            <label className="label" htmlFor="declare-blood-type">Blood Type Needed</label>
            <select
              id="declare-blood-type" className={`input ${errors.blood_type_needed ? 'input-error' : ''}`}
              value={params.blood_type_needed}
              onChange={e => handleParamChange('blood_type_needed', e.target.value)}
            >
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.blood_type_needed && <div className="field-message field-error"><span>⚠</span>{errors.blood_type_needed}</div>}
          </div>
          {params.request_type === 'organ' && (
            <div className="field">
              <label className="label" htmlFor="declare-organ-needed">Organ Needed</label>
              <select
                id="declare-organ-needed" className={`input ${errors.organ_needed ? 'input-error' : ''}`}
                value={params.organ_needed}
                onChange={e => handleParamChange('organ_needed', e.target.value)}
              >
                <option value="">Select organ…</option>
                {ORGANS.map(o => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}
              </select>
              {errors.organ_needed && <div className="field-message field-error"><span>⚠</span>{errors.organ_needed}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--primary)', fontSize: 13, color: 'var(--primary)', lineHeight: 1.65 }}>
          <strong>Medical-record integration (future):</strong> This prototype does not connect to PhilHealth or DOH records. It defaults to <strong>Moderate</strong> until a clinician supplies a value.
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg btn-full anim-up-d1"
        onClick={() => {
          if (validateParams()) {
            setStep('find');
          }
        }}
      >
        <SearchIcon /> Find Compatible Donors
      </button>

      <button className="btn btn-ghost btn-full anim-up-d2" onClick={resetFlow}>
        Start Over
      </button>
    </div>
  );
}

export function FindDonorsStep({
  params,
  loading,
  findMatches,
  matches,
  consentSigned,
  handleMatch,
}) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="card anim-up" style={{ marginBottom: 'var(--s7)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--s3)' }}>Search Compatible Donors</h2>
        <p style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: 'var(--s7)' }}>
          Looking for <strong>{params.blood_type_needed}</strong> {params.request_type === 'organ' ? `(${params.organ_needed})` : ''} donors.
        </p>
        <button className="btn btn-primary btn-lg" onClick={findMatches} disabled={loading}>
          {loading ? <><span className="spinner" /> Searching…</> : <><SearchIcon /> Find Compatible Donors</>}
        </button>
      </div>

      {matches.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>{matches.length} Donor{matches.length > 1 ? 's' : ''} Found</div>
            <span className="badge badge-verified">ABO / Rh sample match</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matches.map((m, i) => {
              const score = m.compatibilityScore;
              const tier = score >= 85 ? 'high' : score >= 65 ? 'med' : 'low';
              const scoreColor = score >= 85 ? 'var(--emerald)' : score >= 65 ? 'var(--sun)' : 'var(--destructive)';
              return (
                <div key={m.donor.id} className="card card-interactive anim-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }} onClick={() => handleMatch(m)}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground-subtle)', minWidth: 20 }}>#{i + 1}</span>
                  <div className={`blood-pill ${params.request_type === 'organ' ? 'blood-pill-organ' : 'blood-pill-blood'}`}>{m.donor.blood_type}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {consentSigned ? `${m.donor.first_name} ${m.donor.last_name}` : `Anonymous Donor #${m.donor.id.substring(0, 4).toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
                      {m.donor.location_city}{m.donor.donor_profile?.is_blood_donor ? ' · Blood Donor' : ''}{m.donor.donor_profile?.organ_pledges?.length > 0 ? ` · ${m.donor.donor_profile.organ_pledges.join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="compat-wrap" style={{ minWidth: 130 }}>
                    <div className="compat-header"><span className="compat-label">Match</span><span className="compat-value" style={{ color: scoreColor }}>{score}%</span></div>
                    <div className="compat-track"><div className={`compat-fill compat-${tier}`} style={{ width: `${score}%` }} /></div>
                  </div>
                  {m.donor.everify_status === 'verified' ? <span className="badge badge-verified">Demo identity profile</span> : <span className="badge badge-muted">Identity not verified</span>}
                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleMatch(m); }}>Match →</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="empty-state">
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'var(--background-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon />
          </div>
          <h3>No donors yet</h3>
          <p>Run a search above to find compatible blood or organ donors</p>
        </div>
      )}
    </div>
  );
}

export function MatchPendingStep({
  selectedMatch,
  params,
  consentSigned,
  setStep,
  setSelectedMatch,
}) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
      <div className="card anim-up" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--sun)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⏳</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Match Requested — Awaiting Hospital Demo Review</div>
            <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 2 }}>Your request is shown in the hospital administrator demo review queue.</div>
          </div>
        </div>

        <div style={{ padding: 16, background: 'var(--background-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className={`blood-pill ${params.request_type === 'organ' ? 'blood-pill-organ' : 'blood-pill-blood'}`} style={{ width: 44, height: 44, fontSize: 14 }}>{selectedMatch.donor.blood_type}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {consentSigned ? `${selectedMatch.donor.first_name} ${selectedMatch.donor.last_name}` : `Anonymous Donor #${selectedMatch.donor.id.substring(0, 4).toUpperCase()}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                {selectedMatch.donor.location_city} · {params.request_type === 'organ' ? params.organ_needed : 'Blood'} · {selectedMatch.compatibilityScore}% Match
              </div>
            </div>
            <span className="badge badge-urgent">Pending Review</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '12px 14px', background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.25)', borderRadius: 'var(--r-md)', fontSize: 13 }}>
              <strong style={{ color: 'var(--emerald)', display: 'block', marginBottom: 4 }}>🏥 Awaiting PGH demo review</strong>
              A hospital administrator can complete this prototype review via <code>/hospital-dashboard</code>. It is not doctor-issued clinical clearance and does not authorize treatment.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>Expected review: Within 24 hours</span>
              <button className="btn btn-outline btn-sm" onClick={() => { setStep('find'); setSelectedMatch(null); }}>
                <SearchIcon /> Find Another
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--primary)', fontSize: 13, color: 'var(--primary)', lineHeight: 1.65 }}>
        <strong>Sample clinical context:</strong> Real matching would require qualified clinicians to review compatibility and fitness. This prototype does not evaluate HLA, crossmatch results, or surgical fitness.
      </div>
    </div>
  );
}
