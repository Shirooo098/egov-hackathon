import React, { useState, useEffect, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import GovernmentAgreement from '../components/GovernmentAgreement';
import ClinicalMatchCard from '../components/ClinicalMatchCard';
import CalendarScheduleView from '../components/CalendarScheduleView';
import { useToast } from '../context/ToastContext';
import { useMatch } from '../context/MatchContext';
import { ALL_ORGANS as ORGANS, BLOOD_TYPES } from '../services/domain';
import { HeartIcon, MatchIcon, ChatIcon, ChainIcon, CalIcon } from '../components/Icons';
import { api } from '../services/api';

// Demo-only: static recipient phone number for the "match found" SMS notification.
// Swap this out once real recipient phone numbers are collected during onboarding.
const DEMO_NOTIFY_NUMBER = '+639763098967';

export default function RecipientDashboard({ onboardingHealth }) {
  const { match, isApproved, consentSigned, updateMatchFromProfile } = useMatch();
  const [tab, setTab] = useState('mymatch'); // Automate matchmaking display upon portal load (Issue #006)
  const [requestType, setRequestType] = useState(onboardingHealth?.request_type || 'organ');
  const [bloodTypeNeeded, setBloodTypeNeeded] = useState(() => match.recipient?.blood_type_needed || onboardingHealth?.blood_type_needed || 'B+');
  const [organNeeded, setOrganNeeded] = useState(() => match.recipient?.organ_needed || onboardingHealth?.organ_needed || 'Kidney');
  const [urgencyLevel, setUrgencyLevel] = useState(() => match.recipient?.urgency || match.urgencyLevel || 'urgent');
  const { toast } = useToast();

  // Guards against double-fire (e.g. React StrictMode double-invoking effects in dev)
  const smsFiredRef = useRef(false);

  useEffect(() => {
    if (smsFiredRef.current) return;
    smsFiredRef.current = true;

    const message =
      "eBuhay: Good news! A potential donor match has been found for your request. " +
      "Please log in to the app to review the match details.";

    api.sendSms(DEMO_NOTIFY_NUMBER, message)
      .then(() => {
        console.log('✅ Match-found SMS sent to', DEMO_NOTIFY_NUMBER);
      })
      .catch((err) => {
        // Don't block the dashboard UI on SMS failure — just log it.
        console.error('eMessage SMS failed:', err.message);
      });
  }, []);

  const saveProfile = (e) => {
    e.preventDefault();
    const res = updateMatchFromProfile('recipient', { bloodTypeNeeded, organNeeded, urgencyLevel });
    if (res.success) {
      toast.success('Recipient medical evaluation preferences and PhilSys verification updated.', { title: 'Preferences Saved', duration: 4000 });
    } else {
      toast.warning(res.error || 'Failed to update preferences', { title: 'Sync Warning', duration: 4000 });
    }
  };

  const isScheduleUnlocked = isApproved || match.status !== 'pending_hospital_approval';
  const isAgreementUnlocked = ['scheduled', 'agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);
  const isChatUnlocked = consentSigned || ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);

  const TABS = [
    { id: 'mymatch', label: 'My Match (Live)', icon: <MatchIcon />, activeIndicator: true },
    { id: 'profile', label: 'My Medical Profile', icon: <HeartIcon />, badge: 'Tier I ✓' },
    { id: 'schedule', label: isScheduleUnlocked ? 'Consultation Schedule' : 'Schedule 🔒', icon: <CalIcon /> },
    { id: 'agreement', label: isAgreementUnlocked ? 'Donation Agreement' : 'Agreement 🔒', icon: <ChainIcon /> },
    { id: 'chat', label: isChatUnlocked ? 'Clinical Chat' : 'Chat 🔒', icon: <ChatIcon /> },
  ];

  return (
    <div id="main-content" className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* -- Hero -- */}
      <section className="hero">
        <div className="hero-blob" style={{ width: 400, height: 400, background: 'rgba(0,56,168,0.06)', top: -100, right: '5%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up" style={{ color: 'var(--primary)' }}>
            <HeartIcon size={14} /> Recipient Command Portal · PhilSys eVerify Tier I
          </div>
          <h1 className="hero-h1 anim-up-d1">Find your <span style={{ color: 'var(--primary)' }}>life-saving</span> match</h1>
          <p className="hero-p anim-up-d2">
            The DOH National Registry automatically scans verified citizen profiles for biological compatibility upon portal access. Track institutional PGH clearance and secure interactive scheduling in real-time.
          </p>

          <div className="hero-stats anim-up-d3" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'var(--card)', padding: '16px 24px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginTop: 24 }}>
            <div className="hero-stat">
              <div className="hero-stat-val" style={{ color: 'var(--destructive)', fontSize: 24, fontWeight: 900 }}>{bloodTypeNeeded}</div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Required Blood</div>
            </div>
            <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div className="hero-stat-val" style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 900 }}>{organNeeded}</div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Anatomical Need</div>
            </div>
            <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div className="hero-stat-val" style={{ color: 'var(--destructive)', fontSize: 22, fontWeight: 800, textTransform: 'uppercase' }}>{urgencyLevel}</div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Triage Urgency</div>
            </div>
            <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div className="hero-stat-val" style={{ color: 'var(--emerald)', fontSize: 20, fontWeight: 800, textTransform: 'capitalize' }}>
                {match.status.replace(/_/g, ' ')}
              </div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Match Lifecycle Stage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Agencies marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0', background: 'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track" style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-muted)' }}>
            {['DOH NATIONAL TRANSPLANT PROGRAM', 'PHILIPPINE GENERAL HOSPITAL (PGH)', 'DICT eVERIFY TRUST REGISTRY', 'PHILSYS BIOMETRIC CREDENTIAL', 'NATIONAL KIDNEY INSTITUTE (NKI)', 'RA NO. 7170 COMPLIANCE', 'REACTIVE eMESSAGE ALERT SYSTEM'].map((a, i) => (
              <span key={i} className="marquee-item" style={{ marginRight: 32 }}>🏥 {a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar -- */}
      <div className="tab-bar">
        <div className="container tab-bar-inner" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ fontWeight: tab === t.id ? 800 : 500, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px' }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge && <span className="badge badge-verified" style={{ fontSize: 9, padding: '2px 6px' }}>{t.badge}</span>}
              {t.activeIndicator && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content" style={{ padding: '36px 0' }}>
        <div className="container">

          {/* MY MATCH TAB (Automated Matchmaking & Interactive Handshake, Issue #006 & #008) */}
          {tab === 'mymatch' && (
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              <ClinicalMatchCard role="recipient" onNavigateTab={setTab} />
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div className="card anim-up" style={{ padding: '32px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'white', boxShadow: '0 8px 20px rgba(0,56,168,0.2)' }}>
                    C
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Carlos Santos</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span className="badge badge-verified">PhilSys ✓ Tier I</span>
                      <span className="badge badge-primary">PCN: 9284-1029-4810</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Medical Need Type</label>
                      <select className="input" value={requestType} onChange={e => setRequestType(e.target.value)} style={{ width: '100%' }}>
                        <option value="organ">Anatomical Organ Transplantation</option>
                        <option value="blood">Blood transfusion / compatibility</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Required Blood Group</label>
                      <select className="input" value={bloodTypeNeeded} onChange={e => setBloodTypeNeeded(e.target.value)} style={{ width: '100%' }}>
                        {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {requestType === 'organ' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Target Anatomical Organ</label>
                      <select className="input" value={organNeeded} onChange={e => setOrganNeeded(e.target.value)} style={{ width: '100%' }}>
                        {ORGANS.map(o => <option key={o} value={o}>{o} Transplantation</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Clinical Urgency &amp; Triage Level</label>
                    <select className="input" value={urgencyLevel} onChange={e => setUrgencyLevel(e.target.value)} style={{ width: '100%' }}>
                      <option value="moderate">Moderate Priority - Outpatient Coordination</option>
                      <option value="urgent">Urgent Priority - Active Hospital Roster</option>
                      <option value="critical">Critical Priority - Immediate Surgical ICU Waitlist</option>
                    </select>
                  </div>

                  <div style={{ padding: '14px 18px', background: 'rgba(0, 56, 168, 0.04)', borderRadius: 'var(--r-md)', border: '1px solid rgba(0, 56, 168, 0.15)', fontSize: '12px', color: 'var(--foreground)' }}>
                    ℹ️ Changing your clinical profile triggers automated re-computation of compatibility scores across all available DOH volunteer donor profiles.
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ fontWeight: 800 }}>
                    Synchronize Medical Preferences ✓
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB (Issue #008) */}
          {tab === 'schedule' && (
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              {isScheduleUnlocked ? (
                <CalendarScheduleView
                  matchType={requestType}
                  slots={[]}
                  onSelectSlot={(slot) => toast.info(`Selected: ${new Date(slot.start).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} at ${slot.location}`, { title: 'Slot Details' })}
                  onBookSlot={(slot) => {
                    toast.success('Clinical consultation procedure slot booked successfully.', { title: 'Appointment Confirmed' });
                  }}
                />
              ) : (
                <div className="card anim-in" style={{ padding: '48px 32px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: '42px', marginBottom: '16px' }}>🔒</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--foreground)' }}>
                    Consultation Schedule Currently Restricted
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--foreground-muted)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                    In compliance with hospital governance protocol, procedure scheduling unlocks immediately once Philippine General Hospital (PGH) grants clinical evaluation approval for your match.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => setTab('mymatch')}
                    style={{ fontWeight: 800, padding: '12px 24px' }}
                  >
                    Return to My Match Console ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AGREEMENT TAB (Issue #009) */}
          {tab === 'agreement' && (
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              {isAgreementUnlocked ? (
                <GovernmentAgreement role="recipient" />
              ) : (
                <div className="card anim-in" style={{ padding: '48px 32px', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: '42px', marginBottom: '16px' }}>🔒</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--foreground)' }}>
                    Donation Agreement Currently Restricted
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--foreground-muted)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                    In compliance with DOH clinical governance regulations, the official electronic consent agreement unlocks only after an attending transplant medical specialist approves your biological match and a procedure schedule is mutually confirmed.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => setTab('mymatch')}
                    style={{ fontWeight: 800, padding: '12px 24px' }}
                  >
                    Return to My Match Console ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CLINICAL CHAT TAB (Issue #010) */}
          {tab === 'chat' && (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <ChatBox currentRole="recipient" consentSigned={isChatUnlocked} doctorApproved={isApproved} hospitalApproved={isApproved} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}