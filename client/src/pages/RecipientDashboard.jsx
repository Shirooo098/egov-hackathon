import React, { useState } from 'react';
import ChatBox from '../components/ChatBox';
import GovernmentAgreement from '../components/GovernmentAgreement';
import ClinicalMatchCard from '../components/ClinicalMatchCard';
import CalendarScheduleView from '../components/CalendarScheduleView';
import LockedTabPanel from '../components/LockedTabPanel';
import LockGlyph from '../components/LockGlyph';
import LiveDot from '../components/LiveDot';
import LifecycleStrip from '../components/LifecycleStrip';
import { useToast } from '../context/ToastContext';
import { useMatch } from '../context/MatchContext';
import { ALL_ORGANS as ORGANS, BLOOD_TYPES } from '../services/domain';
import { formatStatus } from '../utils/matchStatus';
import { HeartIcon, MatchIcon, ChatIcon, ChainIcon, CalIcon } from '../components/Icons';

export default function RecipientDashboard({ onboardingHealth }) {
  const { match, isApproved, hospitalApproved, consentSigned, updateMatchFromProfile } = useMatch();
  const [tab, setTab] = useState('mymatch'); // Automate matchmaking display upon portal load (Issue #006)
  const [requestType, setRequestType] = useState(onboardingHealth?.request_type || 'organ');
  const [bloodTypeNeeded, setBloodTypeNeeded] = useState(() => match.recipient?.blood_type_needed || onboardingHealth?.blood_type_needed || 'B+');
  const [organNeeded, setOrganNeeded] = useState(() => match.recipient?.organ_needed || onboardingHealth?.organ_needed || 'Kidney');
  const [urgencyLevel, setUrgencyLevel] = useState(() => match.recipient?.urgency || match.urgencyLevel || 'urgent');
  const { toast } = useToast();

  const saveProfile = (e) => {
    e.preventDefault();
    const res = updateMatchFromProfile('recipient', { bloodTypeNeeded, organNeeded, urgencyLevel });
    if (res.success) {
      toast.success('Recipient medical preferences updated in this demo.', { title: 'Preferences Saved', duration: 4000 });
    } else {
      toast.warning(res.error || 'Failed to update preferences', { title: 'Sync Warning', duration: 4000 });
    }
  };

  const isScheduleUnlocked = isApproved || match.status !== 'pending_hospital_approval';
  const isAgreementUnlocked = ['scheduled', 'agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);
  const isChatUnlocked = consentSigned || ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);

  const TABS = [
    { id: 'mymatch', label: 'My Match', shortLabel: 'Match', icon: <MatchIcon />, activeIndicator: true },
    { id: 'profile', label: 'My Profile', shortLabel: 'Profile', icon: <HeartIcon /> },
    { id: 'schedule', label: isScheduleUnlocked ? 'Schedule' : 'Schedule', shortLabel: 'Schedule', icon: <CalIcon />, locked: !isScheduleUnlocked },
    { id: 'agreement', label: isAgreementUnlocked ? 'Agreement' : 'Agreement', shortLabel: 'Agreement', icon: <ChainIcon />, locked: !isAgreementUnlocked },
    { id: 'chat', label: isChatUnlocked ? 'Chat' : 'Chat', shortLabel: 'Chat', icon: <ChatIcon />, locked: !isChatUnlocked },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen" style={{ background: 'var(--background)' }}>
      <section className="hero care-journey-hero">
        <div className="container">
          <div className="hero-eyebrow anim-up" style={{ color: 'var(--primary)' }}>
            <HeartIcon size={14} /> Recipient Portal · Demo profile
          </div>
          <h1 className="care-journey-title anim-up-d1">Recipient Care Journey</h1>
          <ul className="care-journey-rail anim-up-d3" aria-label="Recipient current care facts">
            <li role="status"><span>Current Match</span><strong>{formatStatus(match.status)}</strong></li>
            <li><span>Blood requirement</span><strong>{bloodTypeNeeded}</strong></li>
            <li><span>Organ need</span><strong>{organNeeded}</strong></li>
            <li><span>Urgency</span><strong className="care-journey-urgency">{urgencyLevel}</strong></li>
          </ul>
        </div>
      </section>

      {/* Agencies marquee */}
      <div className="dashboard-network-band">
        <div className="marquee-outer">
          <div className="marquee-track dashboard-marquee-track">
            {['DOH NATIONAL TRANSPLANT PROGRAM · DEMO', 'PHILIPPINE GENERAL HOSPITAL (PGH) · DEMO', 'Simulated trust registry', 'Sample identity credential', 'NATIONAL KIDNEY INSTITUTE (NKI) · DEMO', 'Sample policy reference', 'Simulated notification system'].map((a, i) => (
              <span key={i} className="marquee-item">🏥 {a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar (pill nav) -- */}
      <div className="tab-bar tab-bar-pill">
        <div className="container tab-bar-inner">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}${t.locked ? ' locked' : ''}`}
              onClick={() => setTab(t.id)}
              disabled={t.locked}
              aria-label={t.label}
              aria-pressed={tab === t.id}
              title={t.locked ? `${t.label} (locked)` : t.label}
            >
              <span className="tab-btn-icon">{t.icon}</span>
              <span className="tab-btn-label">{t.label}</span>
              {t.activeIndicator && <span className="tab-btn-live"><LiveDot /></span>}
              {t.locked && <span className="tab-btn-lock"><LockGlyph size={11} /></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content" style={{ padding: '36px 0' }}>
        <div className="container">

          {/* MY MATCH TAB (Automated Matchmaking & Interactive Handshake, Issue #006 & #008) */}
          {tab === 'mymatch' && (
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              <div style={{ marginBottom: 20 }}>
                <LifecycleStrip status={match.status} />
              </div>
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
                      <span className="badge badge-verified">Demo identity profile</span>
                      <span className="badge badge-primary">Sample ID: 9284-1029-4810</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label htmlFor="recipient-dashboard-request-type" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Medical Need Type</label>
                      <select id="recipient-dashboard-request-type" className="input" value={requestType} onChange={e => setRequestType(e.target.value)} style={{ width: '100%' }}>
                        <option value="organ">Anatomical Organ Transplantation</option>
                        <option value="blood">Blood transfusion / compatibility</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="recipient-dashboard-blood-type" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Required Blood Group</label>
                      <select id="recipient-dashboard-blood-type" className="input" value={bloodTypeNeeded} onChange={e => setBloodTypeNeeded(e.target.value)} style={{ width: '100%' }}>
                        {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {requestType === 'organ' && (
                    <div>
                    <label htmlFor="recipient-dashboard-organ" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Target Anatomical Organ</label>
                    <select id="recipient-dashboard-organ" className="input" value={organNeeded} onChange={e => setOrganNeeded(e.target.value)} style={{ width: '100%' }}>
                        {ORGANS.map(o => <option key={o} value={o}>{o} Transplantation</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="recipient-dashboard-urgency" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Clinical Urgency &amp; Triage Level</label>
                    <select id="recipient-dashboard-urgency" className="input" value={urgencyLevel} onChange={e => setUrgencyLevel(e.target.value)} style={{ width: '100%' }}>
                      <option value="moderate">Moderate Priority - Outpatient Coordination</option>
                      <option value="urgent">Urgent Priority - Active Hospital Roster</option>
                      <option value="critical">Critical Priority - Immediate Surgical ICU Waitlist</option>
                    </select>
                  </div>

                  <div style={{ padding: '14px 18px', background: 'rgba(0, 56, 168, 0.04)', borderRadius: 'var(--r-md)', border: '1px solid rgba(0, 56, 168, 0.15)', fontSize: '12px', color: 'var(--foreground)' }}>
                    ℹ️ Changing your profile refreshes the compatibility estimate shown in this prototype. It does not query a live donor registry.
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ fontWeight: 800 }}>
                    Save demo medical preferences ✓
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB (Issue #008) */}
          {tab === 'schedule' && (
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              {isScheduleUnlocked ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <LifecycleStrip status={match.status} />
                  </div>
                  <CalendarScheduleView
                    matchType={requestType}
                    slots={[]}
                    onSelectSlot={(slot) => toast.info(`Selected: ${new Date(slot.start).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} at ${slot.location}`, { title: 'Slot Details' })}
                    onBookSlot={(slot) => {
                      toast.success('Clinical consultation procedure slot booked successfully.', { title: 'Appointment Confirmed' });
                    }}
                  />
                </>
              ) : (
                <LockedTabPanel
                  title="Picking a date unlocks after the hospital demo review"
                  message="After the hospital completes its demo review, you'll be able to pick a date here."
                  ctaLabel="Go to My Match"
                  onCta={() => setTab('mymatch')}
                />
              )}
            </div>
          )}

          {/* AGREEMENT TAB (Issue #009) */}
          {tab === 'agreement' && (
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              {isAgreementUnlocked ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <LifecycleStrip status={match.status} />
                  </div>
                  <GovernmentAgreement role="recipient" />
                </>
              ) : (
                <LockedTabPanel
                  title="Agreement unlocks once a date is set"
                  message="After you and your match agree on a date, the agreement will be ready for both of you to sign."
                  ctaLabel="Go to My Match"
                  onCta={() => setTab('mymatch')}
                />
              )}
            </div>
          )}

          {/* CLINICAL CHAT TAB (Issue #010) */}
          {tab === 'chat' && (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <ChatBox currentRole="recipient" consentSigned={isChatUnlocked} hospitalApproved={hospitalApproved} />
            </div>
          )}

        </div>
      </div>

      <footer className="footer-mini">
        eBuhay prototype · Demo Build
      </footer>
    </main>
  );
}
