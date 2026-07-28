import React from 'react';
import CalendarScheduleView from './CalendarScheduleView';
import { useToast } from '../context/ToastContext';
import { CheckIcon, CalIcon } from './Icons';

function CrossIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}

export function DonorProfileTab({
  avail,
  setAvail,
  bloodType,
  setBloodType,
  isBlood,
  setIsBlood,
  organs,
  toggleOrgan,
  saveProfile,
  BLOOD_TYPES,
  ALL_ORGANS,
}) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card anim-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--emerald), #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'white', boxShadow: '0 8px 20px rgba(5,150,105,0.2)' }}>J</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>Juan Dela Cruz</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span className="badge badge-verified">PhilSys ✓ Tier I</span>
              <span className={`badge ${avail ? 'badge-success' : 'badge-muted'}`}>{avail ? '● Available' : '○ Unavailable'}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div className="toggle-wrap">
              <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Availability</span>
              <button className={`toggle ${avail ? 'on' : 'off'}`} onClick={() => setAvail(v => !v)} aria-label="Toggle availability">
                <div className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label">Blood Type</label>
            <select className="input" value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Blood Donor Status</label>
            <div style={{ display: 'flex', alignItems: 'center', height: 42 }}>
              <div className="toggle-wrap">
                <button className={`toggle ${isBlood ? 'on' : 'off'}`} onClick={() => setIsBlood(v => !v)} aria-label="Toggle blood donor">
                  <div className="toggle-knob" />
                </button>
                <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{isBlood ? 'Registered blood donor' : 'Not registered'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card anim-up-d1">
        <div className="section-title">Organ Donation Pledges</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {ALL_ORGANS.map(organ => {
            const pledged = organs.includes(organ);
            return (
              <button key={organ} onClick={() => toggleOrgan(organ)} style={{
                padding: '8px 16px', borderRadius: 'var(--r-full)',
                border: `1.5px solid ${pledged ? 'rgba(5,150,105,0.4)' : 'var(--border)'}`,
                background: pledged ? 'rgba(5,150,105,0.06)' : 'var(--background-alt)',
                color: pledged ? 'var(--emerald)' : 'var(--foreground-muted)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'all var(--t-fast)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {pledged && <CheckIcon />}
                {organ[0].toUpperCase() + organ.slice(1)}
              </button>
            );
          })}
        </div>
        <div style={{ padding: '12px 16px', background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--primary)', fontSize: 13, color: 'var(--primary)', lineHeight: 1.65 }}>
          Organ pledges are secured with PhilSys eVerify. Legal consent is encrypted and recorded in the national audit registry.
        </div>
      </div>

      <button className="btn btn-primary btn-lg btn-full anim-up-d2" onClick={saveProfile}><CheckIcon /> Save Profile Changes</button>
    </div>
  );
}

export function DonorMatchesTab({
  matchStep,
  isBlood,
  consentSigned,
  handleMatchRequest,
  matchedRecipient,
  resetMatchFlow,
  setTab,
  donorSlots,
  confirmSchedule,
}) {
  const toast = useToast();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card anim-up" style={{ marginBottom: 'var(--s7)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: 'list', label: '1. Browse Recipients', active: matchStep === 'list' },
            { key: 'matched', label: '2. Match Requested', active: ['matched', 'approved', 'scheduled'].includes(matchStep) },
            { key: 'approved', label: '3. Hospital Approved', active: ['approved', 'scheduled'].includes(matchStep) },
            { key: 'scheduled', label: '4. Scheduled', active: matchStep === 'scheduled' },
          ].map(s => (
            <div key={s.key} className="hero-stat" style={{
              opacity: s.active ? 1 : 0.4,
              transform: s.active ? 'scale(1.02)' : 'none',
              transition: 'all 0.3s ease',
              padding: 'var(--s3) var(--s4)',
              background: s.active ? 'rgba(0,56,168,0.05)' : 'transparent',
              borderRadius: 'var(--r-md)',
              border: s.active ? '1px solid var(--primary)' : '1px solid var(--border)'
            }}>
              <div className="hero-stat-val" style={{ color: s.active ? 'var(--primary)' : 'var(--foreground-muted)', fontWeight: s.active ? 800 : 500 }}>
                {s.active ? '●' : '○'}
              </div>
              <div className="hero-stat-lbl" style={{ fontSize: 11 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {matchStep === 'list' && (
        <div className="card anim-up">
          <div className="section-title">Recipients Needing {isBlood ? 'Blood' : 'Organ'} Donation</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--background-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => handleMatchRequest({ recipientName: 'Ana Reyes', blood_type: 'A+', organ_needed: 'Kidney', urgency: 'urgent', location: 'Makati City', hospital: 'Makati Medical Center' })}>
            <div className={`blood-pill ${isBlood ? 'blood-pill-blood' : 'blood-pill-organ'}`} style={{ fontSize: 14, padding: '6px 12px' }}>
              {isBlood ? 'A+' : 'Kidney'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {consentSigned ? 'Ana Reyes' : 'Anonymous Recipient #9C41'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
                Makati City · {isBlood ? 'Blood request' : 'Organ request: Kidney'} · Urgent
              </div>
            </div>
            <div className="compat-wrap" style={{ minWidth: 130 }}>
              <div className="compat-header"><span className="compat-label">Match</span><span className="compat-value" style={{ color: 'var(--emerald)' }}>95%</span></div>
              <div className="compat-track"><div className="compat-fill compat-high" style={{ width: '95%' }} /></div>
            </div>
            <span className="badge badge-urgent">Urgent</span>
            <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleMatchRequest({ recipientName: 'Ana Reyes', blood_type: 'A+', organ_needed: 'Kidney', urgency: 'urgent', location: 'Makati City', hospital: 'Makati Medical Center' }); }}>Request Match →</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 12, textAlign: 'center' }}>
            Click a recipient to send a match request. Hospital medical clearance required before scheduling.
          </p>
        </div>
      )}

      {matchStep === 'matched' && matchedRecipient && (
        <div className="card anim-up" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              ⏳
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--sun)' }}>Match Request Sent</div>
              <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 2 }}>
                Awaiting institutional hospital review for <strong>{matchedRecipient.recipientName}</strong> ({matchedRecipient.blood_type || matchedRecipient.organ_needed})
              </div>
            </div>
            <span className="badge badge-sun" style={{ fontSize: 11 }}>Pending Hospital Approval</span>
          </div>
          <div style={{ padding: '14px 18px', background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.25)', borderRadius: 'var(--r-md)', borderLeft: '4px solid var(--emerald)', fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--emerald)', display: 'block', marginBottom: 4 }}>🏥 Institutional Evaluation Pending</strong>
            In accordance with national clinical governance, approval must be granted by medical authorities via the authoritative <strong>Hospital Dashboard</strong> (<code>/hospital-dashboard</code>). When approved by Philippine General Hospital (PGH), your status will update here automatically without page reload.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={resetMatchFlow}><CrossIcon /> Cancel Request</button>
          </div>
        </div>
      )}

      {matchStep === 'approved' && matchedRecipient && (
        <>
          <div className="card anim-up" style={{ marginBottom: 'var(--s7)', border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--emerald)' }}>Match Approved by Hospital</div>
                <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 2 }}>
                  Recipient: <strong>{matchedRecipient.recipientName}</strong> · Type: <strong>{matchedRecipient.blood_type ? 'Blood (' + matchedRecipient.blood_type + ')' : 'Organ (' + matchedRecipient.organ_needed + ')'}</strong>
                </div>
              </div>
              <span className="badge badge-success">Approved ✓</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => setTab('schedule')}>
                <CalIcon /> View Available Slots &amp; Schedule
              </button>
            </div>
          </div>

          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <CalendarScheduleView
              matchType={matchedRecipient.blood_type ? 'blood' : 'organ'}
              slots={donorSlots}
              onSelectSlot={(slot) => toast.info(`Selected: ${new Date(slot.start).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} at ${slot.location}`, { title: 'Slot Details' })}
              onBookSlot={confirmSchedule}
            />
          </div>
        </>
      )}

      {matchStep === 'scheduled' && (
        <div className="card anim-up" style={{ border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.02)', textAlign: 'center', padding: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
            ✓
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Appointment Confirmed!</h3>
          <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginBottom: 20 }}>
            Your {matchedRecipient?.blood_type ? 'blood donation' : 'organ donation coordination'} has been scheduled.
            The recipient and hospital clinical team have been notified.
          </p>
          <button className="btn btn-primary" onClick={resetMatchFlow}><CrossIcon /> Back to Matches</button>
        </div>
      )}
    </div>
  );
}
