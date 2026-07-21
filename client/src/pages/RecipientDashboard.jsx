import React, { useState } from 'react';
import { api } from '../services/api';
import ChatBox from '../components/ChatBox';
import BlockchainBadge from '../components/BlockchainBadge';

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const ORGANS = ['kidney','liver','cornea','heart','lung','pancreas'];

export default function RecipientDashboard() {
  const [tab,    setTab]    = useState('find');
  const [params, setParams] = useState({ request_type:'blood', blood_type_needed:'A+', urgency_level:'moderate', organ_needed:'' });
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [slots,    setSlots]    = useState([]);
  const [scheduling, setSched]  = useState(false);

  const findMatches = async () => { setLoading(true); try { const r = await api.findMatches(params); setMatches(r.data.matches); } catch {} finally { setLoading(false); } };
  const genSchedule = async () => { setSched(true); try { const r = await api.optimizeSchedule({ urgencyLevel: params.urgency_level }); setSlots(r.data.slots || []); } catch {} finally { setSched(false); } };

  const TABS = [
    { id:'find',     label:'Find Donors',  icon:<SearchIcon />   },
    { id:'chat',     label:'Chat',         icon:<ChatIcon />      },
    { id:'schedule', label:'Schedule',     icon:<CalIcon />       },
    { id:'consent',  label:'Consent',      icon:<ChainIcon />     },
  ];

  const urgencyBadge = { critical:'badge-critical', urgent:'badge-urgent', moderate:'badge-moderate' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--background)' }}>

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="hero">
        <div className="hero-blob" style={{ width:400,height:400,background:'rgba(0,56,168,0.06)',top:-100,right:'5%' }} />
        <div className="container" style={{ position:'relative' }}>
          <div className="hero-eyebrow anim-up"><HeartIcon size={14} /> Recipient Portal</div>
          <h1 className="hero-h1 anim-up-d1">Find your <span>life-saving</span> match</h1>
          <p className="hero-p anim-up-d2">Search verified blood and organ donors across the Philippines â€” matched by ABO/Rh compatibility and confirmed by PhilSys eVerify.</p>
          <div className="hero-stats anim-up-d3">
            {[['4','Active Donors'],['A+','Blood Needed'],['Urgent','Priority']].map(([v,l]) => (
              <div key={l} className="hero-stat"><div className="hero-stat-val">{v}</div><div className="hero-stat-lbl">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Agencies marquee */}
      <div style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'14px 0', background:'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track">
            {['DOH','PhilHealth','DICT','PhilSys','PSA','RITM','PRC','Red Cross','DOH','PhilHealth','DICT','PhilSys','PSA','RITM','PRC','Red Cross'].map((a,i) => (
              <span key={i} className="marquee-item">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€ Tab Bar â”€â”€ */}
      <div className="tab-bar">
        <div className="container tab-bar-inner">
          {TABS.map(t => <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>{t.icon} {t.label}</button>)}
        </div>
      </div>

      {/* â”€â”€ Content â”€â”€ */}
      <div className="page-content">
        <div className="container">

          {/* FIND */}
          {tab === 'find' && (
            <div>
              {/* Search card (like a feature card on the site) */}
              <div className="card anim-up" style={{ marginBottom:24 }}>
                <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Search Compatible Donors</h2>
                <p style={{ fontSize:13, color:'var(--foreground-muted)', marginBottom:20 }}>Filter by request type, blood type, and urgency to find matching donors.</p>
                <div className="grid-auto" style={{ marginBottom:20 }}>
                  <div className="field">
                    <label className="label">Request Type</label>
                    <select className="input" value={params.request_type} onChange={e => setParams(p => ({...p, request_type:e.target.value}))}>
                      <option value="blood">Blood Donation</option>
                      <option value="organ">Organ Donation</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Blood Type Needed</label>
                    <select className="input" value={params.blood_type_needed} onChange={e => setParams(p => ({...p, blood_type_needed:e.target.value}))}>
                      {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {params.request_type === 'organ' && (
                    <div className="field">
                      <label className="label">Organ Needed</label>
                      <select className="input" value={params.organ_needed} onChange={e => setParams(p => ({...p, organ_needed:e.target.value}))}>
                        <option value="">Select organâ€¦</option>
                        {ORGANS.map(o => <option key={o} value={o}>{o[0].toUpperCase()+o.slice(1)}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="field">
                    <label className="label">Urgency Level</label>
                    <select className="input" value={params.urgency_level} onChange={e => setParams(p => ({...p, urgency_level:e.target.value}))}>
                      <option value="moderate">Moderate</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={findMatches} disabled={loading}>
                  {loading ? <><span className="spinner" /> Searchingâ€¦</> : <><SearchIcon /> Find Compatible Donors</>}
                </button>
              </div>

              {/* Results */}
              {matches.length > 0 && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <div className="section-title" style={{ margin:0, flex:'none' }}>{matches.length} Donors Found</div>
                    <span className="badge badge-verified">ABO / Rh Verified</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {matches.map((m,i) => {
                      const score = m.compatibilityScore;
                      const tier  = score >= 85 ? 'high' : score >= 65 ? 'med' : 'low';
                      const scoreColor = score >= 85 ? 'var(--emerald)' : score >= 65 ? 'var(--sun)' : 'var(--destructive)';
                      return (
                        <div key={m.donor.id} className="card card-interactive anim-up" style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px' }} onClick={() => setTab('chat')}>
                          <span style={{ fontSize:11,fontWeight:800,color:'var(--foreground-subtle)',minWidth:20 }}>#{i+1}</span>
                          <div className={`blood-pill ${params.request_type==='organ'?'blood-pill-organ':'blood-pill-blood'}`}>{m.donor.blood_type}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:15 }}>{m.donor.first_name} {m.donor.last_name}</div>
                            <div style={{ fontSize:12, color:'var(--foreground-muted)', marginTop:2 }}>
                              {m.donor.location_city}{m.donor.donor_profile?.is_blood_donor?' Â· Blood Donor':''}{m.donor.donor_profile?.organ_pledges?.length>0?` Â· ${m.donor.donor_profile.organ_pledges.join(', ')}` : ''}
                            </div>
                          </div>
                          <div className="compat-wrap" style={{ minWidth:130 }}>
                            <div className="compat-header"><span className="compat-label">Match</span><span className="compat-value" style={{color:scoreColor}}>{score}%</span></div>
                            <div className="compat-track"><div className={`compat-fill compat-${tier}`} style={{width:`${score}%`}} /></div>
                          </div>
                          {m.donor.everify_status==='verified' ? <span className="badge badge-verified">PhilSys âœ“</span> : <span className="badge badge-muted">Unverified</span>}
                          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setTab('chat'); }}>Contact â†’</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {matches.length === 0 && !loading && (
                <div className="empty-state">
                  <div style={{ width:60,height:60,borderRadius:14,background:'var(--background-alt)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <SearchIcon />
                  </div>
                  <h3>No donors yet</h3>
                  <p>Run a search above to find compatible blood or organ donors</p>
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {tab === 'chat' && <div style={{ maxWidth:640, margin:'0 auto' }}><ChatBox currentRole="recipient" /></div>}

          {/* SCHEDULE */}
          {tab === 'schedule' && (
            <div style={{ maxWidth:680, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card anim-up">
                <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:16 }}>
                  <div className="icon-badge icon-badge-lg icon-badge-navy"><CalIcon size={20} /></div>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>AI Tri-Party Scheduler</div>
                    <div style={{fontSize:12,color:'var(--foreground-muted)',marginTop:2}}>Finds conflict-free slots for Doctor, Donor &amp; Recipient simultaneously</div>
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" onClick={genSchedule} disabled={scheduling}>
                  {scheduling ? <><span className="spinner" /> Generatingâ€¦</> : <><CalIcon size={16} /> Generate AI Schedule</>}
                </button>
              </div>
              {slots.map((slot,i) => (
                <div key={i} className="card card-interactive anim-up" style={{ display:'flex',alignItems:'center',gap:16, borderColor: i===0 ? 'rgba(5,150,105,0.3)' : undefined, background: i===0 ? 'rgba(5,150,105,0.02)' : undefined }}>
                  <div style={{ width:44,height:44,borderRadius:10,background: i===0 ? 'var(--emerald)' : 'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:16,flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{fontWeight:700,fontSize:15}}>{new Date(slot.start).toLocaleString('en-PH',{dateStyle:'long',timeStyle:'short'})}</div>
                    <div style={{fontSize:12,color:'var(--foreground-muted)',marginTop:3}}>{slot.notes}</div>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {i===0 && <span className="badge badge-verified">Recommended</span>}
                    <button className="btn btn-outline btn-sm">Book</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONSENT */}
          {tab === 'consent' && <div style={{ maxWidth:540, margin:'0 auto' }}><BlockchainBadge matchId="demo-match-001" donorId="donor-001" recipientId="recipient-001" /></div>}
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ size=15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function ChatIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function CalIcon({ size=15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function ChainIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function HeartIcon({ size=15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
