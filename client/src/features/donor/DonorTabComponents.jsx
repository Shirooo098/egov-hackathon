import './DonorTabComponents.css';
import React from 'react';
import CalendarScheduleView from '../match/CalendarScheduleView';
import { useToast } from '../../context/ToastContext';
import { CheckIcon, CalIcon } from '../../components/ui/Icons';

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
    <div className="migrated-21b3263f">
      <div className="card anim-up">
        <div className="migrated-d35325e3">
          <div className="migrated-f875b2f9">J</div>
          <div>
            <div className="migrated-f7b61a15">Juan Dela Cruz</div>
            <div className="migrated-7d8107a4">
              <span className="badge badge-verified">Demo identity profile</span>
              <span className={`badge ${avail ? 'badge-success' : 'badge-muted'}`}>{avail ? '● Available' : '○ Unavailable'}</span>
            </div>
          </div>
          <div className="migrated-6dac5f26">
            <div className="toggle-wrap">
              <span className="migrated-bd45f3c8">Availability</span>
              <button type="button" className={`toggle ${avail ? 'on' : 'off'}`} onClick={() => setAvail(v => !v)} aria-label="Toggle availability" aria-pressed={avail}>
                <div className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="donor-blood-type">Blood Type</label>
            <select id="donor-blood-type" className="input" value={bloodType} onChange={e => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="label">Blood Donor Status</span>
            <div className="migrated-86a9e904">
              <div className="toggle-wrap">
                <button type="button" className={`toggle ${isBlood ? 'on' : 'off'}`} onClick={() => setIsBlood(v => !v)} aria-label="Toggle blood donor" aria-pressed={isBlood}>
                  <div className="toggle-knob" />
                </button>
                <span className="migrated-48613e4d">{isBlood ? 'Registered blood donor' : 'Not registered'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card anim-up-d1">
        <div className="section-title">Organ Donation Pledges</div>
        <div className="migrated-b822dd5d">
          {ALL_ORGANS.map(organ => {
            const pledged = organs.includes(organ);
            return (
              <button type="button" key={organ} className="organ-pledge-button" aria-pressed={pledged} onClick={() => toggleOrgan(organ)} style={{
                border: `1.5px solid ${pledged ? 'rgba(5,150,105,0.4)' : 'var(--border)'}`,
                background: pledged ? 'rgba(5,150,105,0.06)' : 'var(--background-alt)',
                color: pledged ? 'var(--emerald)' : 'var(--foreground-muted)',
              }}>
                {pledged && <CheckIcon />}
                {organ[0].toUpperCase() + organ.slice(1)}
              </button>
            );
          })}
        </div>
        <div className="migrated-8a78b4b0">
          Organ pledges are sample data for this prototype. The demo does not verify identity or create a legal consent record.
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
    <div className="migrated-3bffa33f">
      <div className="card anim-up migrated-488bdc30" >
        <div className="migrated-a6c0ef47">
          {[
            { key: 'list', label: '1. Browse Recipients', active: matchStep === 'list' },
            { key: 'matched', label: '2. Match Requested', active: ['matched', 'approved', 'scheduled'].includes(matchStep) },
            { key: 'approved', label: '3. Hospital Review Complete', active: ['approved', 'scheduled'].includes(matchStep) },
            { key: 'scheduled', label: '4. Scheduled', active: matchStep === 'scheduled' },
          ].map(s => (
            <div key={s.key} className="hero-stat donor-hero-stat" style={{
              opacity: s.active ? 1 : 0.4,
              transform: s.active ? 'scale(1.02)' : 'none',
              background: s.active ? 'rgba(0,56,168,0.05)' : 'transparent',
              borderRadius: 'var(--r-md)',
              border: s.active ? '1px solid var(--primary)' : '1px solid var(--border)'
            }}>
              <div className="hero-stat-val" style={{ color: s.active ? 'var(--primary)' : 'var(--foreground-muted)', fontWeight: s.active ? 800 : 500 }}>
                {s.active ? '●' : '○'}
              </div>
              <div className="hero-stat-lbl migrated-000d1144" >{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {matchStep === 'list' && (
        <div className="card anim-up">
          <div className="section-title">Recipients Needing {isBlood ? 'Blood' : 'Organ'} Donation</div>
          <div className="migrated-fd3b73e7" onClick={() => handleMatchRequest({ recipientName: 'Ana Reyes', blood_type: 'A+', organ_needed: 'Kidney', urgency: 'urgent', location: 'Makati City', hospital: 'Makati Medical Center' })}>
            <div className={`blood-pill migrated-2ae3fe74 ${isBlood ? 'blood-pill-blood' : 'blood-pill-organ'}`} >
              {isBlood ? 'A+' : 'Kidney'}
            </div>
            <div className="migrated-7e90f870">
              <div className="migrated-39fc62a1">
                {consentSigned ? 'Ana Reyes' : 'Anonymous Recipient #9C41'}
              </div>
              <div className="migrated-51a835e5">
                Makati City · {isBlood ? 'Blood request' : 'Organ request: Kidney'} · Urgent
              </div>
            </div>
            <div className="compat-wrap migrated-1117ac49" >
              <div className="compat-header"><span className="compat-label">Match</span><span className="compat-value migrated-79c35e68" >95%</span></div>
              <div className="compat-track"><div className="compat-fill compat-high migrated-c7ce2d69"  /></div>
            </div>
            <span className="badge badge-urgent">Urgent</span>
            <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleMatchRequest({ recipientName: 'Ana Reyes', blood_type: 'A+', organ_needed: 'Kidney', urgency: 'urgent', location: 'Makati City', hospital: 'Makati Medical Center' }); }}>Request Match →</button>
          </div>
          <p className="migrated-47d18f40">
            Click a recipient to send a demo match request. A doctor must make any clinical decision before scheduling.
          </p>
        </div>
      )}

      {matchStep === 'matched' && matchedRecipient && (
        <div className="card anim-up migrated-5beafa4c" >
          <div className="migrated-1d83d2af">
            <div className="migrated-e489ec0a">
              ⏳
            </div>
            <div className="migrated-7e90f870">
              <div className="migrated-aaa56af6">Match Request Sent</div>
              <div className="migrated-663c703d">
                Awaiting institutional hospital review for <strong>{matchedRecipient.recipientName}</strong> ({matchedRecipient.blood_type || matchedRecipient.organ_needed})
              </div>
            </div>
            <span className="badge badge-sun" >Pending Hospital Demo Review</span>
          </div>
          <div className="migrated-67b81f21">
            <strong className="migrated-64098849">🏥 Institutional Evaluation Pending</strong>
            A hospital administrator can complete the review step in the <strong>Hospital Dashboard</strong> (<code>/hospital-dashboard</code>). This demo review is not doctor-issued clinical clearance. When the PGH sample review is complete, your status updates here without a page reload.
          </div>
          <div className="migrated-c909f22d">
            <button className="btn btn-ghost" onClick={resetMatchFlow}><CrossIcon /> Cancel Request</button>
          </div>
        </div>
      )}

      {matchStep === 'approved' && matchedRecipient && (
        <>
          <div className="card anim-up migrated-1bade796" >
            <div className="migrated-1d83d2af">
              <div className="migrated-4452b347">
                ✓
              </div>
              <div className="migrated-7e90f870">
                <div className="migrated-0489cd60">Demo Match Review Complete</div>
                <div className="migrated-663c703d">
                  Recipient: <strong>{matchedRecipient.recipientName}</strong> · Type: <strong>{matchedRecipient.blood_type ? 'Blood (' + matchedRecipient.blood_type + ')' : 'Organ (' + matchedRecipient.organ_needed + ')'}</strong>
                </div>
              </div>
              <span className="badge badge-success">Demo review complete ✓</span>
            </div>
            <div className="migrated-c3460274">
              <button className="btn btn-primary btn-lg" onClick={() => setTab('schedule')}>
                <CalIcon /> View Available Slots &amp; Schedule
              </button>
            </div>
          </div>

          <div className="migrated-bf5bb6ee">
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
        <div className="card anim-up migrated-f7b33e46" >
          <div className="migrated-c185b1c4">
            ✓
          </div>
          <h3 className="migrated-1d1678b7">Appointment Confirmed!</h3>
          <p className="migrated-a3850396">
            Your {matchedRecipient?.blood_type ? 'blood donation' : 'organ donation coordination'} has been scheduled.
            A simulated notification was queued for the recipient and hospital demo view.
          </p>
          <button className="btn btn-primary" onClick={resetMatchFlow}><CrossIcon /> Back to Matches</button>
        </div>
      )}
    </div>
  );
}
