import React, { useState } from 'react';
import { useMatch } from '../context/MatchContext';
import EGovAIWidget from '../features/hospital/EGovAIWidget';
import OrganAnalytics from '../features/hospital/OrganAnalytics';
import { useToast } from '../context/ToastContext';
import { ClinicalTriageTab } from '../features/hospital/HospitalTabComponents';
import { STATIC_MATCHES, URGENCY_BADGES, URGENCY_LABELS, getLiveMatchAsItem, filterMatches } from '../services/domain';
import { usePersistedStaticMatches } from '../context/usePersistedStaticMatches';
import { ClipIcon, ScaleIcon, AnalyticsIcon, HospitalIcon } from '../shared/ui/Icons';
import LifecycleStrip from '../features/match/LifecycleStrip';

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
      toast.success(`Demo match ${matchId} approved for the hospital review workflow.`, { title: 'Demo Review Approved' });
    }
  };

  const handleRejectMatch = (matchId) => {
    if (matchId === match.id) {
      advanceStatus('rejected');
    } else {
      setStaticState(prev => prev.map(c => c.id === matchId ? { ...c, status: 'rejected' } : c));
      toast.warning(`This demo match was marked declined. No new match search has started.`, { title: 'Demo Match Declined' });
    }
  };

  const handleAnchor = async () => {
    await anchorToBlockchain();
  };

  const TABS = [
    { id: 'matches', label: 'Hospital Demo Review', icon: <ClipIcon /> },
    { id: 'laws', label: 'PH Health Laws AI', icon: <ScaleIcon /> },
    { id: 'analytics', label: 'Demo Workflow Analytics', icon: <AnalyticsIcon /> },
  ];

  // Combine shared live match with static demo items for rich UI table
  const liveMatchAsItem = getLiveMatchAsItem(match);
  const allMatches = [liveMatchAsItem, ...staticState];
  const { pendingMatches, activeMatches, rejectedMatches } = filterMatches(allMatches);

  // Active workflow items = matches already in scheduling or beyond
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
    <main id="main-content" tabIndex={-1} className="min-h-screen" style={{ background: 'var(--background)' }}>
      <section className="hero care-journey-hero hospital-care-journey">
        <div className="container">
          <div className="hero-eyebrow anim-up" style={{ color: 'var(--emerald)' }}>
            <HospitalIcon size={14} /> Hospital Console
          </div>
          <h1 className="care-journey-title anim-up-d1">Hospital Care Journey</h1>
          <ul className="care-journey-rail hospital-care-rail anim-up-d3" aria-label="Hospital current care facts">
            <li className="care-journey-primary" role="status"><span>Pending review</span><strong>{pendingMatches.length}</strong></li>
            <li><span>Approved Matches</span><strong>{activeMatches.length}</strong></li>
            <li><span>Active demo workflows</span><strong>{activeProcedureCount}</strong></li>
            <li><span>Consultations</span><strong>{consultationsToday}</strong></li>
          </ul>
          </div>
      </section>

      {/* Hospital Network Marquee */}
      <div className="dashboard-network-band">
        <div className="marquee-outer">
          <div className="marquee-track dashboard-marquee-track">
            {['NATIONAL KIDNEY INSTITUTE (NKI) · DEMO', 'PHILIPPINE GENERAL HOSPITAL (PGH) · DEMO', 'DOH ORGAN DONATION PROGRAM · SAMPLE DATA', 'Simulated trust registry', 'Simulated chain 13371', 'PHILIPPINE HEART CENTER (PHC) · DEMO', 'LUNG CENTER OF THE PHILIPPINES · DEMO'].map((a, i) => (
              <span key={i} className="marquee-item">🏥 {a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation (pill nav) */}
      <div className="tab-bar tab-bar-pill">
        <div className="container tab-bar-inner hospital-tab-bar-inner">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              aria-pressed={tab === t.id}
            >
              <span className="tab-btn-icon">{t.icon}</span>
              <span className="tab-btn-label">{t.label}</span>
            </button>
          ))}
          <button
            onClick={resetMatch}
            className="btn btn-ghost btn-sm hospital-reset-btn"
            title="Reset live demonstration state"
          >
            ↺ Reset Demo State
          </button>
        </div>
      </div>

      <div className="page-content" style={{ padding: '32px 0' }}>
        <div className="container">

          {/* TAB 1: HOSPITAL DEMO REVIEW */}
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
        eBuhay prototype · Demo Build
      </footer>
    </main>
  );
}
