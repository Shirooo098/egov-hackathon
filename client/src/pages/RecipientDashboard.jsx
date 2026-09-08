import React, { useState } from 'react';
import ChatBox from '../features/match/ChatBox';
import GovernmentAgreement from '../features/match/GovernmentAgreement';
import ClinicalMatchCard from '../features/match/ClinicalMatchCard';
import CalendarScheduleView from '../features/match/CalendarScheduleView';
import LockedTabPanel from '../components/ui/LockedTabPanel';
import LockGlyph from '../components/ui/LockGlyph';
import LiveDot from '../components/ui/LiveDot';
import LifecycleStrip from '../features/match/LifecycleStrip';
import { useToast } from '../context/ToastContext';
import { useMatch } from '../context/MatchContext';
import { ALL_ORGANS as ORGANS, BLOOD_TYPES } from '../services/domain';
import { formatStatus } from '../utils/matchStatus';
import { HeartIcon, MatchIcon, ChatIcon, ChainIcon, CalIcon } from '../components/ui/Icons';

export default function RecipientDashboard({ onboardingHealth }) {
  const { match, isApproved, hospitalApproved, consentSigned, updateMatchFromProfile } = useMatch();
  const [tab, setTab] = useState('mymatch'); // Automate matchmaking display upon portal load (Issue #006)
  const [requestType, setRequestType] = useState(onboardingHealth?.request_type || 'organ');
  const [bloodTypeNeeded, setBloodTypeNeeded] = useState(() => match.recipient?.blood_type_needed || onboardingHealth?.blood_type_needed || 'B+');
  const [organNeeded, setOrganNeeded] = useState(() => match.recipient?.organ_needed || onboardingHealth?.organ_needed || 'Kidney');
  const [urgencyLevel, setUrgencyLevel] = useState(() => match.recipient?.urgency || match.urgencyLevel || 'urgent');
  const { success, warning } = useToast();

  const saveProfile = (e) => {
    e.preventDefault();
    const res = updateMatchFromProfile('recipient', { bloodTypeNeeded, organNeeded, urgencyLevel });
    if (res.success) {
      success('Recipient medical preferences updated in this demo.', { title: 'Preferences Saved', duration: 4000 });
    } else {
      warning(res.error || 'Failed to update preferences', { title: 'Sync Warning', duration: 4000 });
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
    <main id="main-content" tabIndex={-1} className="min-h-screen dashboard-page">
      <section className="hero care-journey-hero">
        <div className="container">
          <div className="hero-eyebrow anim-up dashboard-hero-eyebrow-recipient">
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

      <div className="page-content dashboard-content">
        <div className="container">

          {/* MY MATCH TAB (Automated Matchmaking & Interactive Handshake, Issue #006 & #008) */}
          {tab === 'mymatch' && (
            <div className="dashboard-narrow-840">
              <div className="dashboard-section-gap">
                <LifecycleStrip status={match.status} />
              </div>
              <ClinicalMatchCard role="recipient" onNavigateTab={setTab} />
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div className="dashboard-narrow-680">
              <div className="card anim-up recipient-profile-card">
                <div className="recipient-profile-header">
                  <div className="recipient-profile-avatar">
                    C
                  </div>
                  <div>
                    <div className="recipient-profile-name">Carlos Santos</div>
                    <div className="recipient-profile-badges">
                      <span className="badge badge-verified">Demo identity profile</span>
                      <span className="badge badge-primary">Sample ID: 9284-1029-4810</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="recipient-profile-form">
                  <div className="recipient-profile-grid">
                    <div>
                      <label htmlFor="recipient-dashboard-request-type" className="recipient-field-label">Medical Need Type</label>
                      <select id="recipient-dashboard-request-type" className="input recipient-field-control" value={requestType} onChange={e => setRequestType(e.target.value)}>
                        <option value="organ">Anatomical Organ Transplantation</option>
                        <option value="blood">Blood transfusion / compatibility</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="recipient-dashboard-blood-type" className="recipient-field-label">Required Blood Group</label>
                      <select id="recipient-dashboard-blood-type" className="input recipient-field-control" value={bloodTypeNeeded} onChange={e => setBloodTypeNeeded(e.target.value)}>
                        {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {requestType === 'organ' && (
                    <div>
                    <label htmlFor="recipient-dashboard-organ" className="recipient-field-label">Target Anatomical Organ</label>
                    <select id="recipient-dashboard-organ" className="input recipient-field-control" value={organNeeded} onChange={e => setOrganNeeded(e.target.value)}>
                        {ORGANS.map(o => <option key={o} value={o}>{o} Transplantation</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="recipient-dashboard-urgency" className="recipient-field-label">Clinical Urgency &amp; Triage Level</label>
                    <select id="recipient-dashboard-urgency" className="input recipient-field-control" value={urgencyLevel} onChange={e => setUrgencyLevel(e.target.value)}>
                      <option value="moderate">Moderate Priority - Outpatient Coordination</option>
                      <option value="urgent">Urgent Priority - Active Hospital Roster</option>
                      <option value="critical">Critical Priority - Immediate Surgical ICU Waitlist</option>
                    </select>
                  </div>

                  <div className="recipient-notice">
                    ℹ️ Changing your profile refreshes the compatibility estimate shown in this prototype. It does not query a live donor registry.
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg btn-full recipient-submit">
                    Save demo medical preferences ✓
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB (Issue #008) */}
          {tab === 'schedule' && (
            <div className="dashboard-narrow-780">
              {isScheduleUnlocked ? (
                <>
                  <div className="dashboard-section-gap">
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
            <div className="dashboard-narrow-780">
              {isAgreementUnlocked ? (
                <>
                  <div className="dashboard-section-gap">
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
            <div className="dashboard-narrow-720">
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
