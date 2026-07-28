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

  return (
    <div id="main-content" className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Institutional Header Hero */}
      <section className="hero" style={{ padding: '36px 0 28px' }}>
        <div className="hero-blob" style={{ width: 450, height: 450, background: 'rgba(5, 150, 105, 0.07)', top: -140, right: '10%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="hero-eyebrow anim-up" style={{ color: 'var(--emerald)' }}>
                <HospitalIcon size={14} /> Institutional Clinical Evaluation Center
              </div>
              <h1 className="hero-h1 anim-up-d1" style={{ fontSize: '32px', marginBottom: '8px' }}>
                Philippine General Hospital <span>(PGH)</span>
              </h1>
              <p className="hero-p anim-up-d2" style={{ maxWidth: 640, marginBottom: 0 }}>
                Authoritative institutional triage console. Review automated ABO/Rh compatibility scores, grant medical procedure approvals, coordinate clinical consultations, and audit Hyperledger Besu zero-knowledge consent anchors.
              </p>
            </div>
            
            <div className="hero-stats anim-up-d3" style={{ background: 'var(--card)', padding: '16px 24px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="hero-stat">
                <div className="hero-stat-val" style={{ color: 'var(--destructive)' }}>{pendingMatches.length}</div>
                <div className="hero-stat-lbl">Pending Review</div>
              </div>
              <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                <div className="hero-stat-val" style={{ color: 'var(--emerald)' }}>{activeMatches.length}</div>
                <div className="hero-stat-lbl">Approved Matches</div>
              </div>
              <div className="hero-stat" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                <div className="hero-stat-val" style={{ color: 'var(--primary)' }}>{match.blockchainAnchor ? 'Yes' : 'No'}</div>
                <div className="hero-stat-lbl">Besu Anchored</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* Tab Navigation */}
      <div className="tab-bar">
        <div className="container tab-bar-inner">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ fontWeight: tab === t.id ? 700 : 500 }}
            >
              {t.icon} {t.label}
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
          )}

          {/* TAB 2: LAWS AI */}
          {tab === 'laws' && (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Philippine Organ & Blood Donation Legal Governance</h2>
                <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>
                  Interactive eGovAI regulatory assistant powered by DOH guidelines, Republic Act No. 7170 (Organ Donation Act of 1991), and National Blood Services Act (RA 7719).
                </p>
              </div>
              <EGovAIWidget />
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {tab === 'analytics' && <OrganAnalytics role="hospital" />}

        </div>
      </div>
    </div>
  );
}
