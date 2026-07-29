import React, { useState, useEffect, useRef } from 'react';
import ChatBox from '../components/ChatBox';
import GovernmentAgreement from '../components/GovernmentAgreement';
import ClinicalMatchCard from '../components/ClinicalMatchCard';
import { useToast } from '../context/ToastContext';
import { useMatch } from '../context/MatchContext';
import { DonorProfileTab } from '../components/DonorTabComponents';
import { ALL_ORGANS, BLOOD_TYPES } from '../services/domain';
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
    { id: 'profile', label: 'My Profile', icon: <UserIcon />, badge: 'Tier I ✓' },
    { id: 'mymatch', label: 'My Match (Live)', icon: <MatchIcon />, activeIndicator: true },
    { id: 'agreement', label: isAgreementUnlocked ? 'Donation Agreement' : 'Agreement 🔒', icon: <ChainIcon /> },
    { id: 'chat', label: isChatUnlocked ? 'Clinical Chat' : 'Chat 🔒', icon: <ChatIcon /> },
  ];

  return (
    <div id="main-content" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* -- Hero -- */}
      <section className="hero">
        <div className="hero-blob" style={{ width: 360, height: 360, background: 'rgba(5,150,105,0.06)', top: -80, right: '8%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up" style={{ color: 'var(--emerald)' }}>
            <DropIcon size={14} /> Verified Citizen Portal · PhilSys eVerify Tier I
          </div>
          <h1 className="hero-h1 anim-up-d1">Your <span style={{ color: 'var(--emerald)' }}>donation</span> saves lives</h1>
          <p className="hero-p anim-up-d2">
            Manage your DOH organ and blood donation pledge. When compatibility is automatically detected, review real-time institutional triage at PGH and coordinate schedules directly with verified peers.
          </p>
          <div className="hero-stats anim-up-d3" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'var(--card)', padding: '16px 24px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginTop: 24 }}>
            <div className="hero-stat">
              <div className="hero-stat-val" style={{ color: 'var(--destructive)', fontSize: 24, fontWeight: 900 }}>{bloodType}</div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Registered Blood</div>
            </div>
            <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div className="hero-stat-val" style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 900 }}>{organs.length}</div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Organ Pledges</div>
            </div>
            <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div className="hero-stat-val" style={{ color: avail ? 'var(--emerald)' : 'var(--foreground-subtle)', fontSize: 24, fontWeight: 900 }}>{avail ? 'Active' : 'Off'}</div>
              <div className="hero-stat-lbl" style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Registry Status</div>
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
              <ClinicalMatchCard role="donor" onNavigateTab={setTab} />
            </div>
          )}

          {/* AGREEMENT TAB (Issue #009) */}
          {tab === 'agreement' && (
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              {isAgreementUnlocked ? (
                <GovernmentAgreement role="donor" />
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
              <ChatBox currentRole="donor" consentSigned={isChatUnlocked} doctorApproved={isApproved} hospitalApproved={isApproved} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}