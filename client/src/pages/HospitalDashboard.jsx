import React, { useState } from 'react';
import { useMatch } from '../context/MatchContext';
import { api } from '../services/api';
import EGovAIWidget from '../components/EGovAIWidget';
import OrganAnalytics from '../components/OrganAnalytics';
import { useToast } from '../context/ToastContext';
import { ClinicalTriageTab } from '../components/HospitalTabComponents';
import { STATIC_MATCHES, URGENCY_BADGES, URGENCY_LABELS, getLiveMatchAsItem, filterMatches } from '../services/domain';
import { usePersistedStaticMatches } from '../context/usePersistedStaticMatches';
import { ClipIcon, ScaleIcon, AnalyticsIcon, HospitalIcon } from '../components/Icons';
import LifecycleStrip from '../components/LifecycleStrip';

export default function HospitalDashboard() {
  const { match, advanceStatus, anchorToBlockchain, resetMatch } = useMatch();
  const { toast } = useToast();
  
  const [tab, setTab] = useState('matches');
  const [staticState, setStaticState] = usePersistedStaticMatches(STATIC_MATCHES);

  const handleApproveMatch = (matchId) => {
    if (matchId === match.id) {
      advanceStatus('approved');
    } else {
      setStaticState(prev => prev.map(c => c.id === matchId ? { ...c, status: 'approved' } : c));
      toast.success(`Match ${matchId} formally approved by institutional medical governance team.`, { title: 'Clinical Approval Granted' });
    }
  };

  const handleRejectMatch = (matchId) => {
    if (matchId === match.id) {
      advanceStatus('rejected');
    } else {
      setStaticState(prev => prev.map(c => c.id === matchId ? { ...c, status: 'rejected' } : c));
      toast.warning(`Match ${matchId} declined. Citizen returned to matching queue.`, { title: 'Match Declined' });
    }
  };

  const handleAnchor = async () => {
    await anchorToBlockchain();
  };

  const TABS = [
    { id: 'matches', label: 'Clinical Triage & Review', icon: <ClipIcon /> },
    { id: 'laws', label: 'PH Health Laws AI', icon: <ScaleIcon /> },
    { id: 'analytics', label: 'National Vault Analytics', icon: <AnalyticsIcon /> },
  ];

  // Combine shared live match with static demo items for rich UI table
  const liveMatchAsItem = getLiveMatchAsItem(match);
  const allMatches = [liveMatchAsItem, ...staticState];
  const { pendingMatches, activeMatches, rejectedMatches } = filterMatches(allMatches);

  // Active procedures = matches already in scheduling or beyond
  const activeProcedureCount = allMatches.filter(
    (m) => m.isLiveContext &&
      ['scheduled', 'agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(m.status)
  ).length + activeMatches.filter((m) => !m.isLiveContext && ['scheduled', 'agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(m.status)).length;

  // Today's scheduled consultations (rough: count items with date today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const consultationsToday = allMatches.filter((m) => {
    if (!m.scheduledDate) return false;
    const d = new Date(m.scheduledDate);
    return d >= today && d < tomorrow;
  }).length;

  return (
    <div id="main-content" className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Institutional Header Hero */}
      <section className="hero" style={{ padding: '36px 0 24px' }}>
        <div className="hero-blob" style={{ width: 450, height: 450, background: 'rgba(5, 150, 105, 0.07)', top: -140, right: '10%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up" style={{ color: 'var(--emerald)' }}>
            <HospitalIcon size={14} /> Hospital Console
          </div>
          <h1 className="hero-h1 anim-up-d1" style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginBottom: 4 }}>
            Philippine General Hospital
          </h1>
          <p className="hero-p anim-up-d2" style={{ maxWidth: 640, marginBottom: 0, fontSize: 14 }}>
            <span style={{ color: 'var(--foreground-muted)' }}>Match triage &amp; review ·</span>{' '}
            <strong style={{ color: 'var(--foreground)', fontWeight: 700 }}>PGH-MNL-1000</strong>
            <span style={{ color: 'var(--border)', margin: '0 8px' }}>·</span>
            <span style={{ color: 'var(--foreground-muted)' }}>Taft Avenue, Manila</span>
          </p>
        </div>
      </section>

      {/* Triage dashboard bar — 4 equal-width tiles, always one row on desktop, 2×2 on mobile */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div className="container">
          <div className="hero-tiles">
            <div className="hero-tile">
              <div className="hero-tile-val" style={{ color: 'var(--destructive)' }}>{pendingMatches.length}</div>
              <div className="hero-tile-lbl">Pending Review</div>
            </div>
            <div className="hero-tile">
              <div className="hero-tile-val" style={{ color: 'var(--emerald)' }}>{activeMatches.length}</div>
              <div className="hero-tile-lbl">Approved Matches</div>
            </div>
            <div className="hero-tile">
              <div className="hero-tile-val" style={{ color: 'var(--primary)' }}>{activeProcedureCount}</div>
              <div className="hero-tile-lbl">Active Procedures</div>
            </div>
            <div className="hero-tile">
              <div className="hero-tile-val" style={{ color: 'var(--foreground)' }}>{consultationsToday}</div>
              <div className="hero-tile-lbl">Consultations Today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hospital Network Marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '10px 0', background: 'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track" style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-muted)' }}>
            {['NATIONAL KIDNEY INSTITUTE (NKI)', 'PHILIPPINE GENERAL HOSPITAL (PGH)', 'DOH ORGAN DONATION PROGRAM', 'DICT eVERIFY TRUST REGISTRY', 'HYPERLEDGER BESU TESTNET (CHAIN 13371)', 'PHILIPPINE HEART CENTER (PHC)', 'LUNG CENTER OF THE PHILIPPINES'].map((a, i) => (
              <span key={i} className="marquee-item" style={{ marginRight: 32 }}>🏥 {a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation (pill nav) */}
      <div className="tab-bar tab-bar-pill">
        <div className="container tab-bar-inner" style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '10px 0' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
            >
              <span className="tab-btn-icon">{t.icon}</span>
              <span className="tab-btn-label">{t.label}</span>
            </button>
          ))}
          <button
            onClick={resetMatch}
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--foreground-subtle)' }}
            title="Reset live demonstration state"
          >
            ↺ Reset Demo State
          </button>
        </div>
      </div>

      <div className="page-content" style={{ padding: '32px 0' }}>
        <div className="container">

          {/* TAB 1: CLINICAL TRIAGE & REVIEW */}
          {tab === 'matches' && (
            <>
              {/* Live lifecycle indicator — only show when a citizen-portal match is active */}
              {(match && match.id) && (
                <div style={{ marginBottom: 24 }}>
                  <LifecycleStrip status={match.status} compact />
                </div>
              )}
              <ClinicalTriageTab
                pendingMatches={pendingMatches}
                activeMatches={activeMatches}
                rejectedMatches={rejectedMatches}
                match={match}
                handleRejectMatch={handleRejectMatch}
                handleApproveMatch={handleApproveMatch}
                handleAnchor={handleAnchor}
                advanceStatus={advanceStatus}
                URGENCY_BADGES={URGENCY_BADGES}
                URGENCY_LABELS={URGENCY_LABELS}
              />
            </>
          )}

          {/* TAB 2: LAWS AI */}
          {tab === 'laws' && (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <EGovAIWidget />
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {tab === 'analytics' && <OrganAnalytics role="hospital" />}

        </div>
      </div>

      <footer className="footer-mini">
        DICT eGov Platform · Republic of the Philippines · Demo Build
      </footer>
    </div>
  );
}
