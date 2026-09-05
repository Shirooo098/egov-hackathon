import React, { useState, useEffect, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import GovernmentAgreement from '../components/GovernmentAgreement';
import ClinicalMatchCard from '../components/ClinicalMatchCard';
import LockedTabPanel from '../components/LockedTabPanel';
import LockGlyph from '../components/LockGlyph';
import LiveDot from '../components/LiveDot';
import LifecycleStrip from '../components/LifecycleStrip';
import { useToast } from '../context/ToastContext';
import { useMatch } from '../context/MatchContext';
import { DonorProfileTab } from '../components/DonorTabComponents';
import { ALL_ORGANS, BLOOD_TYPES } from '../services/domain';
import { formatStatus, statusPillClass } from '../utils/matchStatus';
import { UserIcon, MatchIcon, ChatIcon, ChainIcon, DropIcon } from '../components/Icons';
import { api } from '../services/api';

// Demo-only: static donor phone number for the "match found" SMS notification.
// Swap this out once real donor phone numbers are collected during onboarding.
const DEMO_NOTIFY_NUMBER = '+639763098967';

export default function DonorDashboard({ onboardingPledge }) {
  const { match, isApproved, consentSigned, updateMatchFromProfile } = useMatch();
  const [tab, setTab] = useState('mymatch'); // Default to automatic match console upon portal load (Issue #006)
  const [bloodType, setBloodType] = useState(() => match.donor?.blood_type || onboardingPledge?.bloodType || 'O-');
  const [isBlood, setIsBlood] = useState(onboardingPledge?.isBlood !== undefined ? onboardingPledge.isBlood : true);
  const [organs, setOrgans] = useState(() => Array.isArray(match.donor?.organ_pledged) ? match.donor.organ_pledged : (onboardingPledge?.organs || ['kidney', 'cornea']));
  const [avail, setAvail] = useState(true);
  const { toast } = useToast();

  const handleAvailChange = (valOrFn) => {
    const nextAvail = typeof valOrFn === 'function' ? valOrFn(avail) : valOrFn;
    if (!nextAvail && !['rejected', 'ready_for_transplant'].includes(match.status)) {
      toast.warning(
        'Cannot set availability to offline while clinical evaluation or procedure coordination is in-flight.',
        { title: 'Availability Protected', duration: 5000 }
      );
      return;
    }
    setAvail(nextAvail);
  };
  // Guards against double-fire (e.g. React StrictMode double-invoking effects in dev)
  const smsFiredRef = useRef(false);

  useEffect(() => {
    if (smsFiredRef.current) return;
    smsFiredRef.current = true;

    const message =
      "eBuhay: A potential recipient match has been found based on your donation pledge. " +
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

  const toggleOrgan = o => setOrgans(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o]);

  const saveProfile = () => {
    const res = updateMatchFromProfile('donor', { bloodType, organs, avail });
    if (!res.success) {
      toast.warning(res.error, { title: 'Profile Sync Warning', duration: 5000 });
      return;
    }
    toast.success('PhilSys Tier I Donor Profile preferences synchronized.', { title: 'Profile Saved', duration: 4000 });
  };

  const isAgreementUnlocked = ['scheduled', 'agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);
  const isChatUnlocked = consentSigned || ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);

  const TABS = [
    { id: 'profile', label: 'My Profile', shortLabel: 'Profile', icon: <UserIcon /> },
    { id: 'mymatch', label: 'My Match', shortLabel: 'Match', icon: <MatchIcon />, activeIndicator: true },
    { id: 'agreement', label: 'Agreement', shortLabel: 'Agreement', icon: <ChainIcon />, locked: !isAgreementUnlocked },
    { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: <ChatIcon />, locked: !isChatUnlocked },
  ];

  return (
    <div id="main-content" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* -- Hero -- */}
      <section className="hero">
        <div className="hero-blob" style={{ width: 360, height: 360, background: 'rgba(5,150,105,0.06)', top: -80, right: '8%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up" style={{ color: 'var(--emerald)' }}>
            <DropIcon size={14} /> Donor Portal · PhilSys Tier I
          </div>
          <h1 className="hero-h1 anim-up-d1">Thank you for <span style={{ color: 'var(--emerald)' }}>wanting to help</span></h1>
          <p className="hero-p anim-up-d2">
            We'll let you know as soon as someone needs what you can give. Until then, you can update your details any time.
          </p>
          {/* Big status pill */}
          <div className="anim-up-d3" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <span className={statusPillClass(match.status)}>
              {formatStatus(match.status)}
            </span>
            <div className="hero-stat-strip" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', fontSize: 13, color: 'var(--foreground-muted)', fontWeight: 600 }}>
              <span>Blood: <strong style={{ color: 'var(--foreground)' }}>{bloodType}</strong></span>
              <span className="hero-stat-sep" style={{ color: 'var(--border)' }}>·</span>
              <span>Organs pledged: <strong style={{ color: 'var(--foreground)' }}>{organs.length}</strong></span>
              <span className="hero-stat-sep" style={{ color: 'var(--border)' }}>·</span>
              <span>Registry: <strong style={{ color: avail ? 'var(--emerald)' : 'var(--foreground-subtle)' }}>{avail ? 'Active' : 'Off'}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Network Marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0', background: 'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track" style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-muted)' }}>
            {['PHILIPPINE RED CROSS', 'DOH ORGAN DONATION PROGRAM', 'PHILIPPINE GENERAL HOSPITAL (PGH)', 'DICT eVERIFY TRUST REGISTRY', 'NATIONAL KIDNEY INSTITUTE (NKI)', 'RA NO. 7170 COMPLIANT', 'REACTIVE eMESSAGE PUSH SYSTEM'].map((a, i) => (
              <span key={i} className="marquee-item" style={{ marginRight: 32 }}>🏥 {a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar (pill nav) -- */}
      <div className="tab-bar tab-bar-pill">
        <div className="container tab-bar-inner" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 0' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}${t.locked ? ' locked' : ''}`}
              onClick={() => setTab(t.id)}
              disabled={t.locked}
              aria-label={t.label}
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
          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <DonorProfileTab
              avail={avail}
              setAvail={handleAvailChange}
              bloodType={bloodType}
              setBloodType={setBloodType}
              isBlood={isBlood}
              setIsBlood={setIsBlood}
              organs={organs}
              toggleOrgan={toggleOrgan}
              saveProfile={saveProfile}
              BLOOD_TYPES={BLOOD_TYPES}
              ALL_ORGANS={ALL_ORGANS}
            />
          )}

          {/* MY MATCH TAB (Automated & Interactive Handshake, Issue #006 & #008) */}
          {tab === 'mymatch' && (
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              <div style={{ marginBottom: 20 }}>
                <LifecycleStrip status={match.status} />
              </div>
              <ClinicalMatchCard role="donor" onNavigateTab={setTab} />
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
                  <GovernmentAgreement role="donor" />
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
              <ChatBox currentRole="donor" consentSigned={isChatUnlocked} doctorApproved={isApproved} hospitalApproved={isApproved} />
            </div>
          )}

        </div>
      </div>

      <footer className="footer-mini">
        DICT eGov Platform · Republic of the Philippines · Demo Build
      </footer>
    </div>
  );
}