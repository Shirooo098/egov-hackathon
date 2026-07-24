import React, { useState } from 'react';
import ChatBox from '../components/ChatBox';
import BlockchainBadge from '../components/BlockchainBadge';
import MatchReviewModal from '../components/MatchReviewModal';

const ALL_ORGANS = ['kidney','liver','cornea','heart','lung','pancreas'];
const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function DonorDashboard({ consentSigned, setConsentSigned, onboardingPledge }) {
  const [tab,       setTab]       = useState('profile');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [bloodType, setBloodType] = useState(onboardingPledge?.bloodType || 'O-');
  const [isBlood,   setIsBlood]   = useState(onboardingPledge?.isBlood !== undefined ? onboardingPledge.isBlood : true);
  const [organs,    setOrgans]    = useState(onboardingPledge?.organs || ['kidney','cornea']);
  const [avail,     setAvail]     = useState(true);

  const toggleOrgan = o => setOrgans(p => p.includes(o) ? p.filter(x=>x!==o) : [...p,o]);

  const TABS = [
    { id:'profile',  label:'My Profile',  icon:<UserIcon />   },
    { id:'matches',  label:'My Matches',  icon:<MatchIcon />  },
    { id:'chat',     label:'Chat 🔒',       icon:<ChatIcon />   },
    { id:'consent',  label:'Consent',     icon:<ChainIcon />  },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--background)' }}>

      {/* -- Hero -- */}
      <section className="hero">
        <div className="hero-blob" style={{ width:360,height:360,background:'rgba(5,150,105,0.06)',top:-80,right:'8%' }} />
        <div className="container" style={{ position:'relative' }}>
          <div className="hero-eyebrow anim-up"><DropIcon size={13} /> Donor Portal</div>
          <h1 className="hero-h1 anim-up-d1">Your <span style={{ color:'var(--emerald)' }}>donation</span> saves lives</h1>
          <p className="hero-p anim-up-d2">Manage your blood and organ donation pledge. Every donation is verified by PhilSys and secured with encrypted digital signatures.</p>
          <div className="hero-stats anim-up-d3">
            <div className="hero-stat"><div className="hero-stat-val" style={{color:'var(--destructive)'}}>{bloodType}</div><div className="hero-stat-lbl">Blood Type</div></div>
            <div className="hero-stat"><div className="hero-stat-val" style={{color:'var(--primary)'}}>{organs.length}</div><div className="hero-stat-lbl">Organ Pledges</div></div>
            <div className="hero-stat"><div className="hero-stat-val" style={{color: avail ? 'var(--emerald)' : 'var(--foreground-subtle)'}}>{avail ? 'Active' : 'Off'}</div><div className="hero-stat-lbl">Status</div></div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'14px 0', background:'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track">
            {['Philippine Red Cross','DOH','PhilHealth','PRC','RITM','Blood Bank PGH','St Luke\'s','Makati Med','PGH','Philippine Red Cross','DOH','PhilHealth','PRC','RITM'].map((a,i) => (
              <span key={i} className="marquee-item">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar -- */}
      <div className="tab-bar">
        <div className="container tab-bar-inner">
          {TABS.map(t => <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>{t.icon} {t.label}</button>)}
        </div>
      </div>

      <div className="page-content">
        <div className="container">

          {/* PROFILE */}
          {tab === 'profile' && (
            <div style={{ maxWidth:680, margin:'0 auto', display:'flex', flexDirection:'column', gap:18 }}>
              {/* Identity card */}
              <div className="card anim-up">
                <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:24 }}>
                  <div style={{ width:60,height:60,borderRadius:'50%', background:'linear-gradient(135deg, var(--emerald), #0284C7)', display:'flex',alignItems:'center',justifyContent:'center', fontFamily:'var(--font-heading)',fontWeight:900,fontSize:24,color:'white', boxShadow:'0 8px 20px rgba(5,150,105,0.2)' }}>J</div>
                  <div>
                    <div style={{ fontWeight:800,fontSize:20,letterSpacing:'-0.03em' }}>Juan Dela Cruz</div>
                    <div style={{ display:'flex',gap:8,marginTop:6 }}>
                      <span className="badge badge-verified">PhilSys ✓ Tier I</span>
                      <span className={`badge ${avail?'badge-success':'badge-muted'}`}>{avail?'● Available':'○ Unavailable'}</span>
                    </div>
                  </div>
                  <div style={{ marginLeft:'auto' }}>
                    <div className="toggle-wrap">
                      <span style={{fontSize:12,color:'var(--foreground-muted)'}}>Availability</span>
                      <button className={`toggle ${avail?'on':'off'}`} onClick={() => setAvail(v=>!v)} aria-label="Toggle availability">
                        <div className="toggle-knob" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label className="label">Blood Type</label>
                    <select className="input" value={bloodType} onChange={e => setBloodType(e.target.value)}>
                      {BLOOD_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Blood Donor Status</label>
                    <div style={{ display:'flex', alignItems:'center', height:42 }}>
                      <div className="toggle-wrap">
                        <button className={`toggle ${isBlood?'on':'off'}`} onClick={() => setIsBlood(v=>!v)} aria-label="Toggle blood donor">
                          <div className="toggle-knob" />
                        </button>
                        <span style={{fontSize:13,color:'var(--foreground-muted)'}}>{isBlood?'Registered blood donor':'Not registered'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organ pledges — like API catalog cards */}
              <div className="card anim-up-d1">
                <div className="section-title">Organ Donation Pledges</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:18 }}>
                  {ALL_ORGANS.map(organ => {
                    const pledged = organs.includes(organ);
                    return (
                      <button key={organ} onClick={() => toggleOrgan(organ)} style={{
                        padding:'8px 16px', borderRadius:'var(--r-full)',
                        border: `1.5px solid ${pledged?'rgba(5,150,105,0.4)':'var(--border)'}`,
                        background: pledged?'rgba(5,150,105,0.06)':'var(--background-alt)',
                        color: pledged?'var(--emerald)':'var(--foreground-muted)',
                        fontWeight:600, fontSize:13, cursor:'pointer',
                        transition:'all var(--t-fast)',
                        display:'flex', alignItems:'center', gap:6,
                      }}>
                        {pledged && <CheckIcon />}
                        {organ[0].toUpperCase()+organ.slice(1)}
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding:'12px 16px', background:'var(--primary-10)', border:'1px solid rgba(0,56,168,0.12)', borderRadius:'var(--r-md)', borderLeft:'3px solid var(--primary)', fontSize:13, color:'var(--primary)', lineHeight:1.65 }}>
                  Organ pledges are secured with PhilSys eVerify. Legal consent is encrypted and recorded in the national audit registry.
                </div>
              </div>

              <button className="btn btn-primary btn-lg btn-full anim-up-d2"><CheckIcon /> Save Profile Changes</button>
            </div>
          )}

          {/* MATCHES */}
          {tab === 'matches' && (
            <div style={{ maxWidth:680, margin:'0 auto' }}>
              <div className="card anim-up">
                <div className="section-title">Active Matches</div>
                <div style={{ display:'flex', alignItems:'center', gap:16, padding:16, background:'var(--background-alt)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', cursor:'pointer' }} onClick={() => setSelectedMatch({ recipientName:'Ana Reyes', blood_type:'A+', score:100, urgency:'urgent' })}>
                  <div className="blood-pill blood-pill-blood">A+</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>
                      {consentSigned ? 'Ana Reyes' : 'Anonymous Recipient #9C41'}
                    </div>
                    <div style={{ fontSize:12, color:'var(--foreground-muted)', marginTop:2 }}>Makati City · Blood request</div>
                  </div>
                  <div className="compat-wrap" style={{ minWidth:130 }}>
                    <div className="compat-header"><span className="compat-label">Match</span><span className="compat-value" style={{color:'var(--emerald)'}}>100%</span></div>
                    <div className="compat-track"><div className="compat-fill compat-high" style={{width:'100%'}} /></div>
                  </div>
                  <span className="badge badge-urgent">Urgent</span>
                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setSelectedMatch({ recipientName:'Ana Reyes', blood_type:'A+', score:100, urgency:'urgent' }); }}>Review Request →</button>
                </div>
              </div>
            </div>
          )}

          {/* CHAT */}
          {tab === 'chat' && <div style={{ maxWidth:640, margin:'0 auto' }}><ChatBox currentRole="donor" consentSigned={consentSigned} /></div>}

          {/* CONSENT */}
          {tab === 'consent' && <div style={{ maxWidth:540, margin:'0 auto' }}><BlockchainBadge matchId="demo-match-001" donorId="donor-001" recipientId="recipient-001" signerRole="donor" consentSigned={consentSigned} onConsentSuccess={() => setConsentSigned(true)} /></div>}
        </div>
      </div>

      {/* MATCH REVIEW MODAL */}
      <MatchReviewModal 
        match={selectedMatch} 
        role="donor" 
        consentSigned={consentSigned} 
        doctorApproved={false}
        onClose={() => setSelectedMatch(null)} 
        onAcceptChat={() => setTab('chat')} 
        onSchedule={() => setTab('consent')} 
      />
    </div>
  );
}

function UserIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function MatchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ChatIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function ChainIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function DropIcon({ size=15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>; }
function AnalyticsIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
