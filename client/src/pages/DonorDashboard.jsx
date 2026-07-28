import React, { useState } from 'react';
import ChatBox from '../components/ChatBox';
import BlockchainBadge from '../components/BlockchainBadge';
import MatchReviewModal from '../components/MatchReviewModal';
import CalendarScheduleView from '../components/CalendarScheduleView';
import { useToast } from '../context/ToastContext';

const ALL_ORGANS = ['kidney','liver','cornea','heart','lung','pancreas'];
const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

// Generate schedule slots for donor (mirroring recipient)
const generateDonorSlots = (type, startDate, endDate) => {
  const slots = [];
  const slotCount = type === 'organ' ? 2 : 4;

  for (let i = 0; i < slotCount; i++) {
    const dayOffset = Math.floor(Math.random() * 30) + 1;
    const slotDate = new Date(startDate);
    slotDate.setDate(slotDate.getDate() + dayOffset);

    if (slotDate > endDate) continue;

    const hour = [8, 9, 10, 13, 14, 15][Math.floor(Math.random() * 6)];
    const minute = [0, 30][Math.floor(Math.random() * 2)];
    slotDate.setHours(hour, minute, 0, 0);

    const hospitals = type === 'organ'
      ? ['PGH - Organ Transplant Unit', 'St. Luke\'s BGC - Transplant Center', 'NKTI - Kidney Transplant', 'Heart Center - Cardiothoracic']
      : ['Philippine Red Cross - Blood Center', 'PGH - Blood Bank', 'St. Luke\'s - Apheresis Unit', 'RITM - Blood Services'];

    slots.push({
      id: `donor-slot-${type}-${i}-${Date.now()}`,
      start: slotDate.toISOString(),
      end: new Date(slotDate.getTime() + (type === 'organ' ? 2 : 1) * 60 * 60 * 1000).toISOString(),
      type: type === 'organ' ? 'Surgical Clearance & Coordination' : 'Blood Donation Appointment',
      location: hospitals[Math.floor(Math.random() * hospitals.length)],
      notes: `${type === 'organ' ? 'Surgeon + Anesthesiologist + Transplant Coordinator' : 'Phlebotomist + Pathologist + Donor Coordinator'} · Scheduled`,
      status: i === 0 ? 'recommended' : 'available',
      matchType: type
    });
  }

  return slots.sort((a, b) => new Date(a.start) - new Date(b.start));
};

export default function DonorDashboard({ consentSigned, setConsentSigned, onboardingPledge }) {
  const [tab, setTab] = useState('profile');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [bloodType, setBloodType] = useState(onboardingPledge?.bloodType || 'O-');
  const [isBlood, setIsBlood] = useState(onboardingPledge?.isBlood !== undefined ? onboardingPledge.isBlood : true);
  const [organs, setOrgans] = useState(onboardingPledge?.organs || ['kidney','cornea']);
  const [avail, setAvail] = useState(true);
  const [matchStep, setMatchStep] = useState('list'); // list → matched → approved → scheduled
  const [matchedRecipient, setMatchedRecipient] = useState(null);
  const [doctorApproved, setDoctorApproved] = useState(false);
  const [donorSlots, setDonorSlots] = useState([]);
  const [dateRange] = useState(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);
    return { start: today, end: endDate };
  });
  const { toast } = useToast();

  const toggleOrgan = o => setOrgans(p => p.includes(o) ? p.filter(x=>x!==o) : [...p,o]);

  const saveProfile = () => {
    toast.success('Profile saved', { title: 'Saved', duration: 4000 });
  };

  const handleMatchRequest = (recipient) => {
    setSelectedMatch(recipient);
    setMatchedRecipient(recipient);
    setMatchStep('matched');
    setDoctorApproved(false);
    setDonorSlots([]);
    toast.success('Match request sent. Awaiting doctor approval.', { title: 'Match Requested' });
  };

  const simulateDoctorApproval = () => {
    setDoctorApproved(true);
    // Determine match type from recipient
    const matchType = matchedRecipient?.blood_type ? 'blood' : 'organ';
    const newSlots = generateDonorSlots(matchType, dateRange.start, dateRange.end);
    setDonorSlots(newSlots);
    setMatchStep('approved');
    toast.success('Doctor approved the match! You can now schedule.', { title: 'Match Approved ✓' });
  };

  const confirmSchedule = (slot) => {
    toast.success(`Scheduled for ${new Date(slot.start).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}`, { title: 'Appointment Confirmed' });
    setMatchStep('scheduled');
  };

  const resetMatchFlow = () => {
    setMatchStep('list');
    setMatchedRecipient(null);
    setSelectedMatch(null);
    setDoctorApproved(false);
    setDonorSlots([]);
  };

  const TABS = [
    { id: 'profile', label: 'My Profile', icon: <UserIcon /> },
    { id: 'matches', label: 'My Matches', icon: <MatchIcon /> },
    { id: 'chat', label: 'Chat 🔒', icon: <ChatIcon /> },
    { id: 'consent', label: 'Consent', icon: <ChainIcon /> },
  ];

  return (
    <div id="main-content" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* -- Hero -- */}
      <section className="hero">
        <div className="hero-blob" style={{ width: 360, height: 360, background: 'rgba(5,150,105,0.06)', top: -80, right: '8%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up"><DropIcon size={13} /> Donor Portal</div>
          <h1 className="hero-h1 anim-up-d1">Your <span style={{ color: 'var(--emerald)' }}>donation</span> saves lives</h1>
          <p className="hero-p anim-up-d2">Manage your blood and organ donation pledge. Every donation is verified by PhilSys and secured with encrypted digital signatures.</p>
          <div className="hero-stats anim-up-d3">
            <div className="hero-stat"><div className="hero-stat-val" style={{ color: 'var(--destructive)' }}>{bloodType}</div><div className="hero-stat-lbl">Blood Type</div></div>
            <div className="hero-stat"><div className="hero-stat-val" style={{ color: 'var(--primary)' }}>{organs.length}</div><div className="hero-stat-lbl">Organ Pledges</div></div>
            <div className="hero-stat"><div className="hero-stat-val" style={{ color: avail ? 'var(--emerald)' : 'var(--foreground-subtle)' }}>{avail ? 'Active' : 'Off'}</div><div className="hero-stat-lbl">Status</div></div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0', background: 'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track">
            {['Philippine Red Cross','DOH','PhilHealth','PRC','RITM','Blood Bank PGH','St Luke\'s','Makati Med','PGH','Philippine Red Cross','DOH','PhilHealth','PRC','RITM'].map((a,i) => (
              <span key={i} className="marquee-item">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar -- */}
      <div className="tab-bar">
        <div className="container tab-bar-inner">
          {TABS.map(t => <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => { setTab(t.id); resetMatchFlow(); }}>{t.icon} {t.label}</button>)}
        </div>
      </div>

      <div className="page-content">
        <div className="container">

          {/* PROFILE */}
          {tab === 'profile' && (
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Identity card */}
              <div className="card anim-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--emerald), #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'white', boxShadow: '0 8px 20px rgba(5,150,105,0.2)' }}>J</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>Juan Dela Cruz</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span className="badge badge-verified">PhilSys ✓ Tier I</span>
                      <span className={`badge ${avail?'badge-success':'badge-muted'}`}>{avail?'● Available':'○ Unavailable'}</span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <div className="toggle-wrap">
                      <span style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Availability</span>
                      <button className={`toggle ${avail?'on':'off'}`} onClick={() => setAvail(v=>!v)} aria-label="Toggle availability">
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
                        <button className={`toggle ${isBlood?'on':'off'}`} onClick={() => setIsBlood(v=>!v)} aria-label="Toggle blood donor">
                          <div className="toggle-knob" />
                        </button>
                        <span style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>{isBlood?'Registered blood donor':'Not registered'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organ pledges */}
              <div className="card anim-up-d1">
                <div className="section-title">Organ Donation Pledges</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                  {ALL_ORGANS.map(organ => {
                    const pledged = organs.includes(organ);
                    return (
                      <button key={organ} onClick={() => toggleOrgan(organ)} style={{
                        padding: '8px 16px', borderRadius: 'var(--r-full)',
                        border: `1.5px solid ${pledged?'rgba(5,150,105,0.4)':'var(--border)'}`,
                        background: pledged?'rgba(5,150,105,0.06)':'var(--background-alt)',
                        color: pledged?'var(--emerald)':'var(--foreground-muted)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        transition: 'all var(--t-fast)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {pledged && <CheckIcon />}
                        {organ[0].toUpperCase()+organ.slice(1)}
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
          )}

          {/* MATCHES - New Flow */}
          {tab === 'matches' && (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {/* Progress Indicator */}
              <div className="card anim-up" style={{ marginBottom: 'var(--s7)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { key: 'list', label: '1. Browse Recipients', active: matchStep === 'list' },
                    { key: 'matched', label: '2. Match Requested', active: ['matched', 'approved', 'scheduled'].includes(matchStep) },
                    { key: 'approved', label: '3. Doctor Approved', active: ['approved', 'scheduled'].includes(matchStep) },
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

              {/* STEP 1: Browse & Match */}
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
                    Click a recipient to send a match request. Doctor approval required before scheduling.
                  </p>
                </div>
              )}

              {/* STEP 2: Match Requested - Awaiting Doctor Approval */}
              {matchStep === 'matched' && matchedRecipient && (
                <div className="card anim-up" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      ⏳
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--sun)' }}>Match Request Sent</div>
                      <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 2 }}>
                        Awaiting attending physician review for <strong>{matchedRecipient.recipientName}</strong> ({matchedRecipient.blood_type || matchedRecipient.organ_needed})
                      </div>
                    </div>
                    <span className="badge badge-sun" style={{ fontSize: 11 }}>Pending Doctor Approval</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--sun-10)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--sun)', fontSize: 13, color: 'var(--sun)', lineHeight: 1.65 }}>
                    <strong>Simulation:</strong> Click below to simulate the attending physician approving this match. In production, this is triggered by the Doctor Console.
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={simulateDoctorApproval}><CheckIcon /> Simulate Doctor Approval ✓</button>
                    <button className="btn btn-ghost" onClick={resetMatchFlow}><CrossIcon /> Cancel Request</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Doctor Approved - Show AI Schedule */}
              {matchStep === 'approved' && matchedRecipient && (
                <>
                  <div className="card anim-up" style={{ marginBottom: 'var(--s7)', border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        ✓
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--emerald)' }}>Match Approved by Doctor</div>
                        <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 2 }}>
                          Recipient: <strong>{matchedRecipient.recipientName}</strong> · Type: <strong>{matchedRecipient.blood_type ? 'Blood (' + matchedRecipient.blood_type + ')' : 'Organ (' + matchedRecipient.organ_needed + ')'}</strong>
                        </div>
                      </div>
                      <span className="badge badge-success">Approved ✓</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-lg" onClick={() => setTab('schedule')}>
                        <CalIcon /> View Available Slots & Schedule
                      </button>
                    </div>
                  </div>

                  {/* Embedded Calendar for quick preview */}
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

              {/* STEP 4: Scheduled */}
              {matchStep === 'scheduled' && (
                <div className="card anim-up" style={{ border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.02)', textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
                    ✓
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Appointment Confirmed!</h3>
                  <p style={{ fontSize: 14, color: 'var(--foreground-muted)', marginBottom: 20 }}>
                    Your {matchedRecipient?.blood_type ? 'blood donation' : 'organ donation coordination'} has been scheduled.
                    The recipient and medical team have been notified.
                  </p>
                  <button className="btn btn-primary" onClick={resetMatchFlow}><CrossIcon /> Back to Matches</button>
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {tab === 'chat' && <div style={{ maxWidth: 640, margin: '0 auto' }}><ChatBox currentRole="donor" consentSigned={consentSigned} /></div>}

          {/* CONSENT */}
          {tab === 'consent' && <div style={{ maxWidth: 540, margin: '0 auto' }}><BlockchainBadge matchId="demo-match-001" donorId="donor-001" recipientId="recipient-001" signerRole="donor" consentSigned={consentSigned} onConsentSuccess={() => setConsentSigned(true)} /></div>}

        </div>
      </div>

      {/* MATCH REVIEW MODAL */}
      <MatchReviewModal
        match={selectedMatch}
        role="donor"
        consentSigned={consentSigned}
        doctorApproved={doctorApproved}
        onClose={() => { setSelectedMatch(null); }}
        onAcceptChat={() => setTab('chat')}
        onSchedule={() => setTab('matches')}
      />
    </div>
  );
}

// Icons
function UserIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function MatchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ChatIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function ChainIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function DropIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>; }
function CalIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function CrossIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function AnalyticsIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }