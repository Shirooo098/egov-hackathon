import React, { useState } from 'react';
import { api } from '../services/api';
import BlockchainBadge from '../components/BlockchainBadge';
import EGovAIWidget from '../components/EGovAIWidget';
import OrganAnalytics from '../components/OrganAnalytics';

const CASES = [
  { id: 'case-001', donor: 'Juan Dela Cruz', recipient: 'Ana Reyes', type: 'blood', match: 'O- → A+', urgency: 'urgent', score: 102 },
  { id: 'case-002', donor: 'Rosa Magtanggol', recipient: 'Carlos Santos', type: 'organ', match: 'AB- → AB-', urgency: 'critical', score: 98 },
  { id: 'case-003', donor: 'Pedro Reyes', recipient: 'Luz Garcia', type: 'blood', match: 'A+ → A+', urgency: 'moderate', score: 90 },
];
const U_BADGE = { critical: 'badge-critical', urgent: 'badge-warning', moderate: 'badge-moderate' };
const U_LABEL = { critical: 'Critical', urgent: 'Urgent', moderate: 'Moderate' };

export default function DoctorConsole() {
  const [tab, setTab] = useState('cases');
  const [selCase, setSelCase] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(new Set());

  const genSlots = async (urgency) => { setLoading(true); try { const r = await api.optimizeSchedule({ urgencyLevel: urgency }); setSlots(r.data.slots || []); } catch { } finally { setLoading(false); } };
  const approve = id => setApproved(p => new Set([...p, id]));

  const pending = CASES.filter(c => !approved.has(c.id));
  const resolved = CASES.filter(c => approved.has(c.id));

  const TABS = [
    { id: 'cases', label: 'Cases', icon: <ClipIcon /> },
    { id: 'schedule', label: 'AI Scheduler', icon: <CalIcon /> },
    { id: 'laws', label: 'Laws AI', icon: <ScaleIcon /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>

      {/* -- Hero -- (navy card style from the site for stats row) */}
      <section className="hero">
        <div className="hero-blob" style={{ width: 400, height: 400, background: 'rgba(0,56,168,0.06)', top: -120, left: '5%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up"><MdIcon size={13} /> Doctor Console</div>
          <h1 className="hero-h1 anim-up-d1">Medical <span>Command</span> Center</h1>
          <p className="hero-p anim-up-d2">Review compatibility scores, schedule tri-party consultations, approve procedures, and anchor e-signatures on-chain.</p>
          {/* Stat pills with navy accent for pending */}
          <div className="hero-stats anim-up-d3">
            <div className="hero-stat"><div className="hero-stat-val" style={{ color: 'var(--destructive)' }}>{pending.length}</div><div className="hero-stat-lbl">Pending Review</div></div>
            <div className="hero-stat"><div className="hero-stat-val" style={{ color: 'var(--emerald)' }}>{approved.size}</div><div className="hero-stat-lbl">Approved</div></div>
            <div className="hero-stat"><div className="hero-stat-val" style={{ color: 'var(--primary)' }}>{approved.size}</div><div className="hero-stat-lbl">Anchored On-Chain</div></div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0', background: 'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track">
            {['DOH', 'PhilHealth', 'PRC', 'RITM', 'PGH', 'St Luke\'s', 'Makati Med', 'Cardinal Santos', 'Mary Johnston', 'DOH', 'PhilHealth', 'PRC', 'RITM', 'PGH'].map((a, i) => (
              <span key={i} className="marquee-item">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar -- */}
      <div className="tab-bar">
        <div className="container tab-bar-inner">
          {TABS.map(t => <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.icon} {t.label}</button>)}
        </div>
      </div>

      <div className="page-content">
        <div className="container">

          {/* CASES */}
          {tab === 'cases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.length > 0 && (
                <>
                  <div className="section-title">Pending Review ({pending.length})</div>
                  {pending.map(c => (
                    <div key={c.id} className="card anim-up" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '18px 22px' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <span className={`badge badge-${c.type}`}>{c.type === 'blood' ? 'Blood' : 'Organ'}</span>
                          <span className={`badge ${U_BADGE[c.urgency]}`}>{U_LABEL[c.urgency]}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.donor} <span style={{ color: 'var(--foreground-muted)', fontWeight: 400 }}>→</span> {c.recipient}</div>
                        <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 3 }}>Match: {c.match} · Case {c.id}</div>
                      </div>
                      <div className="compat-wrap" style={{ minWidth: 150 }}>
                        <div className="compat-header"><span className="compat-label">Compatibility</span><span className="compat-value" style={{ color: 'var(--emerald)' }}>{c.score}%</span></div>
                        <div className="compat-track"><div className="compat-fill compat-high" style={{ width: `${Math.min(c.score, 100)}%` }} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelCase(c); setTab('schedule'); genSlots(c.urgency); }}>
                          <CalIcon /> Schedule
                        </button>
                        <button className="btn btn-success btn-sm" onClick={() => approve(c.id)}>
                          <CheckIcon /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {resolved.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 8 }}>Approved ({resolved.length})</div>
                  {resolved.map(c => (
                    <div key={c.id} className="card anim-up" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 22px', border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.02)', opacity: 0.9 }}>
                      <span className="badge badge-verified">✓ Approved</span>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.donor} → {c.recipient}</div>
                      <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>{c.match}</div>
                      <button className="btn btn-outline btn-sm" onClick={() => { setSelCase(c); setTab('consent'); }}>
                        <ChainIcon /> Anchor
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* SCHEDULE */}
          {tab === 'schedule' && (
            <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card anim-up">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="icon-badge icon-badge-lg icon-badge-navy"><CalIcon size={20} /></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>AI Tri-Party Schedule Generator</div>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
                      {selCase ? `Case: ${selCase.donor} → ${selCase.recipient}` : 'Select a case from the Cases tab to auto-fill'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {['moderate', 'urgent', 'critical'].map(u => (
                    <button key={u} className="btn btn-ghost btn-sm" onClick={() => genSlots(u)}>
                      Generate ({u})
                    </button>
                  ))}
                </div>
              </div>

              {loading && (
                <div className="empty-state">
                  <div className="spinner spinner-lg" />
                  <p>AI is computing optimal slots…</p>
                </div>
              )}

              {slots.length > 0 && !loading && slots.map((slot, i) => (
                <div key={i} className="card card-interactive anim-up" style={{ display: 'flex', alignItems: 'center', gap: 16, borderColor: i === 0 ? 'rgba(5,150,105,0.3)' : undefined, background: i === 0 ? 'rgba(5,150,105,0.02)' : undefined }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: i === 0 ? 'var(--emerald)' : i === 1 ? 'var(--primary)' : '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0, boxShadow: `0 8px 18px rgba(${i === 0 ? '5,150,105' : i === 1 ? '0,56,168' : '124,58,237'},0.2)` }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{new Date(slot.start).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}</div>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 3 }}>{slot.notes}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {i === 0 && <span className="badge badge-verified">Recommended</span>}
                    <button className="btn btn-primary btn-sm">Confirm</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LAWS */}
          {tab === 'laws' && <div style={{ maxWidth: 700, margin: '0 auto' }}><EGovAIWidget /></div>}

          {/* ANALYTICS */}
          {tab === 'analytics' && <OrganAnalytics role="doctor" />}
        </div>
      </div>
    </div>
  );
}

function ClipIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>; }
function CalIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>; }
function ChainIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>; }
function ScaleIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21" /><path d="M6 21L12 3L18 21" /><path d="M3 14h6" /><path d="M15 14h6" /></svg>; }
function MdIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>; }
function ShieldCheckIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 11 11 13 15 9" /></svg>; }
function AnalyticsIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
