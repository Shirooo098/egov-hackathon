import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ChatBox from '../components/ChatBox';
import BlockchainBadge from '../components/BlockchainBadge';
import MatchReviewModal from '../components/MatchReviewModal';
import CalendarScheduleView from '../components/CalendarScheduleView';
import { useToast } from '../context/ToastContext';

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const ORGANS = ['kidney','liver','cornea','heart','lung','pancreas'];

// Helper: Generate 3 months of dates from today
const generateThreeMonthDates = () => {
  const dates = [];
  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);

  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
};

// Helper: Generate realistic schedule slots for a given date range and type
const generateScheduleSlots = (type, urgency, startDate, endDate) => {
  const slots = [];
  const slotCount = type === 'organ' ? 3 : 5; // Organ needs fewer slots

  for (let i = 0; i < slotCount; i++) {
    const dayOffset = Math.floor(Math.random() * 30) + 1; // 1-30 days out
    const slotDate = new Date(startDate);
    slotDate.setDate(slotDate.getDate() + dayOffset);

    // Skip if beyond end date
    if (slotDate > endDate) continue;

    // Morning/afternoon slots
    const hour = [8, 9, 10, 13, 14, 15][Math.floor(Math.random() * 6)];
    const minute = [0, 30][Math.floor(Math.random() * 2)];
    slotDate.setHours(hour, minute, 0, 0);

    const hospitals = type === 'organ'
      ? ['PGH - Organ Transplant Unit', 'St. Luke\'s BGC - Transplant Center', 'NKTI - Kidney Transplant', 'Heart Center - Cardiothoracic']
      : ['Philippine Red Cross - Blood Center', 'PGH - Blood Bank', 'St. Luke\'s - Apheresis Unit', 'RITM - Blood Services'];

    const hospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    slots.push({
      id: `slot-${type}-${i}-${Date.now()}`,
      start: slotDate.toISOString(),
      end: new Date(slotDate.getTime() + (type === 'organ' ? 3 : 1.5) * 60 * 60 * 1000).toISOString(),
      type: type === 'organ' ? 'Tri-party Surgical Consultation' : 'Blood Donation & Compatibility Verification',
      location: hospital,
      notes: `${type === 'organ' ? 'Surgeon + Anesthesiologist + Transplant Coordinator' : 'Phlebotomist + Pathologist + Recipient Coordinator'} · ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} Priority`,
      status: i === 0 ? 'recommended' : 'available',
      matchType: type
    });
  }

  // Sort by date
  return slots.sort((a, b) => new Date(a.start) - new Date(b.start));
};

export default function RecipientDashboard({ consentSigned, setConsentSigned, onboardingHealth }) {
  const [step, setStep] = useState('declare'); // declare → find → matched → approved → scheduled
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [params, setParams] = useState({
    request_type: onboardingHealth?.request_type || 'blood',
    blood_type_needed: onboardingHealth?.blood_type_needed || 'A+',
    organ_needed: onboardingHealth?.organ_needed || ''
  });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [scheduling, setSched] = useState(false);
  const [errors, setErrors] = useState({});
  const [doctorApproved, setDoctorApproved] = useState(false);
  const [approvedMatch, setApprovedMatch] = useState(null);
  const { toast } = useToast();

  // Generate 3-month date range
  const [dateRange] = useState(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);
    return { start: today, end: endDate };
  });

  const validateParams = () => {
    const newErrors = {};
    if (!params.request_type) newErrors.request_type = 'Request type is required';
    if (!params.blood_type_needed) newErrors.blood_type_needed = 'Blood type is required';
    if (params.request_type === 'organ' && !params.organ_needed) newErrors.organ_needed = 'Organ type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const findMatches = async () => {
    if (!validateParams()) {
      toast.error('Please fill in all required fields', { title: 'Validation Error' });
      return;
    }
    setLoading(true);
    try {
      const r = await api.findMatches(params);
      const found = r.data.matches || [];
      setMatches(found);
      if (found.length > 0) {
        toast.success(`Found ${found.length} compatible donor${found.length > 1 ? 's' : ''}`, { title: 'Search Complete' });
        setStep('find');
      } else {
        toast.info('No compatible donors found for your criteria', { title: 'No Matches' });
      }
    } catch (err) {
      toast.error('Failed to find matches. Please try again.', { title: 'Search Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = (match) => {
    setSelectedMatch(match);
    setStep('matched');
    setDoctorApproved(false);
    setApprovedMatch(null);
    setSlots([]);
    toast.success('Match request sent. Awaiting doctor approval.', { title: 'Match Requested' });
  };

  const simulateDoctorApproval = () => {
    setDoctorApproved(true);
    setApprovedMatch(selectedMatch);
    // Generate schedule slots for the matched type
    const newSlots = generateScheduleSlots(
      params.request_type,
      params.urgency_level || 'moderate',
      dateRange.start,
      dateRange.end
    );
    setSlots(newSlots);
    setStep('approved');
    toast.success('Doctor approved the match! You can now schedule.', { title: 'Match Approved ✓' });
  };

  const confirmSchedule = (slot) => {
    setSched(true);
    // Simulate API call
    setTimeout(() => {
      setSched(false);
      toast.success(`Scheduled for ${new Date(slot.start).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })} at ${new Date(slot.start).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`, { title: 'Appointment Confirmed' });
      setStep('scheduled');
    }, 1000);
  };

  const handleParamChange = (field, value) => {
    setParams(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const resetFlow = () => {
    setStep('declare');
    setSelectedMatch(null);
    setMatches([]);
    setSlots([]);
    setDoctorApproved(false);
    setApprovedMatch(null);
  };

  const TABS = [
    { id: 'declare', label: 'Declare Need', icon: <HeartIcon /> },
    { id: 'find', label: 'Find Donors', icon: <SearchIcon /> },
    { id: 'matched', label: 'Match Status', icon: <MatchIcon /> },
    { id: 'schedule', label: 'Schedule', icon: <CalIcon /> },
    { id: 'chat', label: 'Chat 🔒', icon: <ChatIcon /> },
    { id: 'consent', label: 'Consent', icon: <ChainIcon /> },
  ];

  // Determine active tab based on step
  const activeTab = step === 'approved' ? 'schedule' : step;

  return (
    <div id="main-content" className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* -- Hero -- */}
      <section className="hero">
        <div className="hero-blob" style={{ width: 400, height: 400, background: 'rgba(0,56,168,0.06)', top: -100, right: '5%' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-eyebrow anim-up"><HeartIcon size={14} /> Recipient Portal</div>
          <h1 className="hero-h1 anim-up-d1">Find your <span>life-saving</span> match</h1>
          <p className="hero-p anim-up-d2">Declare your need, find verified donors, secure doctor approval, and schedule — all in one flow.</p>

          {/* Progress Indicator */}
          <div className="hero-stats anim-up-d3" style={{ marginTop: 'var(--s6)', display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap' }}>
            {[
              { key: 'declare', label: '1. Declare Need', active: ['declare'].includes(step) },
              { key: 'find', label: '2. Find Donors', active: ['find'].includes(step) },
              { key: 'matched', label: '3. Match Requested', active: ['matched'].includes(step) },
              { key: 'approved', label: '4. Doctor Approved', active: ['approved', 'scheduled'].includes(step) },
              { key: 'schedule', label: '5. Scheduled', active: step === 'scheduled' },
            ].map(s => (
              <div key={s.key} className="hero-stat" style={{
                opacity: s.active ? 1 : 0.4,
                transform: s.active ? 'scale(1.02)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <div className="hero-stat-val" style={{
                  color: s.active ? 'var(--primary)' : 'var(--foreground-muted)',
                  fontWeight: s.active ? 800 : 500
                }}>{s.active ? '●' : '○'}</div>
                <div className="hero-stat-lbl" style={{ fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agencies marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0', background: 'var(--background-alt)' }}>
        <div className="marquee-outer">
          <div className="marquee-track">
            {['DOH','PhilHealth','DICT','PhilSys','PSA','RITM','PRC','Red Cross','DOH','PhilHealth','DICT','PhilSys','PSA','RITM','PRC','Red Cross'].map((a,i) => (
              <span key={i} className="marquee-item">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar -- */}
      <div className="tab-bar">
        <div className="container tab-bar-inner">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => {
                if (t.id === 'matched' && step !== 'matched') return;
                if (t.id === 'schedule' && step !== 'approved' && step !== 'scheduled') return;
                if (t.id === 'chat' && !doctorApproved) return;
                setStep(t.id === 'schedule' && step !== 'scheduled' ? 'approved' : t.id);
              }}
              disabled={(t.id === 'matched' && step !== 'matched') || (t.id === 'schedule' && step !== 'approved' && step !== 'scheduled') || (t.id === 'chat' && !doctorApproved)}
              style={{ opacity: ((t.id === 'matched' && step !== 'matched') || (t.id === 'schedule' && step !== 'approved' && step !== 'scheduled') || (t.id === 'chat' && !doctorApproved)) ? 0.5 : 1 }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="container">

          {/* STEP 1: DECLARE NEED */}
          {step === 'declare' && (
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
              <div className="card anim-up">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--s3)' }}>What do you need?</h2>
                <p style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: 'var(--s7)' }}>
                  Select the type of donation you require. The system will match you with compatible donors automatically.
                  <br /><strong>Note:</strong> Urgency level is determined by your medical records via API integration (simulated here).
                </p>

                <div className="grid-auto" style={{ marginBottom: 'var(--s7)' }}>
                  <div className="field">
                    <label className="label">Request Type</label>
                    <select className={`input ${errors.request_type ? 'input-error' : ''}`} value={params.request_type} onChange={e => handleParamChange('request_type', e.target.value)}>
                      <option value="blood">Blood Donation</option>
                      <option value="organ">Organ Donation</option>
                    </select>
                    {errors.request_type && <div className="field-message field-error"><span>⚠</span>{errors.request_type}</div>}
                  </div>
                  <div className="field">
                    <label className="label">Blood Type Needed</label>
                    <select className={`input ${errors.blood_type_needed ? 'input-error' : ''}`} value={params.blood_type_needed} onChange={e => handleParamChange('blood_type_needed', e.target.value)}>
                      {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.blood_type_needed && <div className="field-message field-error"><span>⚠</span>{errors.blood_type_needed}</div>}
                  </div>
                  {params.request_type === 'organ' && (
                    <div className="field">
                      <label className="label">Organ Needed</label>
                      <select className={`input ${errors.organ_needed ? 'input-error' : ''}`} value={params.organ_needed} onChange={e => handleParamChange('organ_needed', e.target.value)}>
                        <option value="">Select organ…</option>
                        {ORGANS.map(o => <option key={o} value={o}>{o[0].toUpperCase()+o.slice(1)}</option>)}
                      </select>
                      {errors.organ_needed && <div className="field-message field-error"><span>⚠</span>{errors.organ_needed}</div>}
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px 16px', background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--primary)', fontSize: 13, color: 'var(--primary)', lineHeight: 1.65 }}>
                  <strong>Medical Record Integration (Future):</strong> Urgency level (Critical/Urgent/Moderate) will be auto-populated from your electronic medical records via PhilHealth/DOH API. For now, the system defaults to <strong>Moderate</strong>.
                </div>
              </div>

              <button className="btn btn-primary btn-lg btn-full anim-up-d1" onClick={() => { validateParams() && setStep('find'); }}>
                <SearchIcon /> Find Compatible Donors
              </button>

              <button className="btn btn-ghost btn-full anim-up-d2" onClick={resetFlow}>
                Start Over
              </button>
            </div>
          )}

          {/* STEP 2: FIND DONORS */}
          {step === 'find' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              {/* Search card */}
              <div className="card anim-up" style={{ marginBottom: 'var(--s7)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--s3)' }}>Search Compatible Donors</h2>
                <p style={{ fontSize: 13, color: 'var(--foreground-muted)', marginBottom: 'var(--s7)' }}>
                  Looking for <strong>{params.blood_type_needed}</strong> {params.request_type === 'organ' ? `(${params.organ_needed})` : ''} donors.
                </p>
                <button className="btn btn-primary btn-lg" onClick={findMatches} disabled={loading}>
                  {loading ? <><span className="spinner" /> Searching…</> : <><SearchIcon /> Find Compatible Donors</>}
                </button>
              </div>

              {/* Results */}
              {matches.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div className="section-title" style={{ margin: 0 }}>{matches.length} Donor{matches.length > 1 ? 's' : ''} Found</div>
                    <span className="badge badge-verified">ABO / Rh Verified</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {matches.map((m, i) => {
                      const score = m.compatibilityScore;
                      const tier = score >= 85 ? 'high' : score >= 65 ? 'med' : 'low';
                      const scoreColor = score >= 85 ? 'var(--emerald)' : score >= 65 ? 'var(--sun)' : 'var(--destructive)';
                      return (
                        <div key={m.donor.id} className="card card-interactive anim-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }} onClick={() => handleMatch(m)}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--foreground-subtle)', minWidth: 20 }}>#{i+1}</span>
                          <div className={`blood-pill ${params.request_type==='organ'?'blood-pill-organ':'blood-pill-blood'}`}>{m.donor.blood_type}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>
                              {consentSigned ? `${m.donor.first_name} ${m.donor.last_name}` : `Anonymous Donor #${m.donor.id.substring(0, 4).toUpperCase()}`}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
                              {m.donor.location_city}{m.donor.donor_profile?.is_blood_donor ? ' · Blood Donor' : ''}{m.donor.donor_profile?.organ_pledges?.length > 0 ? ` · ${m.donor.donor_profile.organ_pledges.join(', ')}` : ''}
                            </div>
                          </div>
                          <div className="compat-wrap" style={{ minWidth: 130 }}>
                            <div className="compat-header"><span className="compat-label">Match</span><span className="compat-value" style={{ color: scoreColor }}>{score}%</span></div>
                            <div className="compat-track"><div className={`compat-fill compat-${tier}`} style={{ width: `${score}%` }} /></div>
                          </div>
                          {m.donor.everify_status === 'verified' ? <span className="badge badge-verified">PhilSys ✓</span> : <span className="badge badge-muted">Unverified</span>}
                          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleMatch(m); }}>Match →</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {matches.length === 0 && !loading && (
                <div className="empty-state">
                  <div style={{ width: 60, height: 60, borderRadius: 14, background: 'var(--background-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SearchIcon />
                  </div>
                  <h3>No donors yet</h3>
                  <p>Run a search above to find compatible blood or organ donors</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: MATCHED - AWAITING DOCTOR APPROVAL */}
          {step === 'matched' && selectedMatch && (
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
              <div className="card anim-up" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--sun)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⏳</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>Match Requested — Awaiting Doctor Approval</div>
                    <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 2 }}>Your match request has been sent to the attending physician for clinical review.</div>
                  </div>
                </div>

                <div style={{ padding: 16, background: 'var(--background-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div className={`blood-pill ${params.request_type==='organ'?'blood-pill-organ':'blood-pill-blood'}`} style={{ width: 44, height: 44, fontSize: 14 }}>{selectedMatch.donor.blood_type}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {consentSigned ? `${selectedMatch.donor.first_name} ${selectedMatch.donor.last_name}` : `Anonymous Donor #${selectedMatch.donor.id.substring(0, 4).toUpperCase()}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>
                        {selectedMatch.donor.location_city} · {params.request_type === 'organ' ? params.organ_needed : 'Blood'} · {selectedMatch.compatibilityScore}% Match
                      </div>
                    </div>
                    <span className="badge badge-urgent">Pending Review</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--foreground-subtle)' }}>Expected review: Within 24 hours</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setStep('find'); setSelectedMatch(null); }}>
                        <SearchIcon /> Find Another
                      </button>
                      {/* SIMULATION BUTTON - Only for demo */}
                      <button className="btn btn-warning btn-sm" onClick={simulateDoctorApproval} style={{ background: 'var(--sun-10)', borderColor: 'var(--sun)', color: 'var(--sun)' }}>
                        <ShieldCheckIcon /> Simulate Doctor Approval (Demo)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: 'var(--primary-10)', border: '1px solid rgba(0,56,168,0.12)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--primary)', fontSize: 13, color: 'var(--primary)', lineHeight: 1.65 }}>
                <strong>Clinical Protocol:</strong> Under National Organ Transplantation Regulations, all recipient-donor matches require attending physician clinical compatibility review before consent anchoring. The doctor evaluates HLA matching, crossmatch results, and recipient surgical fitness.
              </div>
            </div>
          )}

          {/* STEP 4: APPROVED - AI SCHEDULE BUTTON APPEARS */}
          {step === 'approved' && approvedMatch && (
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              <CalendarScheduleView
                slots={slots}
                onConfirm={confirmSchedule}
                scheduling={scheduling}
                matchType={params.request_type}
                organType={params.organ_needed}
                bloodType={params.blood_type_needed}
                dateRange={dateRange}
                onBack={() => setStep('matched')}
              />
            </div>
          )}

          {/* STEP 5: SCHEDULED */}
          {step === 'scheduled' && (
            <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', padding: 'var(--s10)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto var(--s6)' }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 'var(--s3)' }}>Appointment Confirmed</h2>
              <p style={{ fontSize: 16, color: 'var(--foreground-muted)', marginBottom: 'var(--s7)' }}>
                Your {params.request_type === 'organ' ? 'surgical consultation' : 'blood donation procedure'} has been scheduled.
              </p>
              <div style={{ display: 'flex', gap: 'var(--s4)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setStep('chat')}>
                  <ChatIcon /> Open Secure Chat
                </button>
                <button className="btn btn-outline" onClick={() => setStep('consent')}>
                  <ChainIcon /> Review Consent
                </button>
                <button className="btn btn-ghost" onClick={resetFlow}>
                  Start New Request
                </button>
              </div>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && doctorApproved && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <ChatBox currentRole="recipient" consentSigned={consentSigned} doctorApproved={doctorApproved} />
            </div>
          )}

          {/* CONSENT TAB */}
          {activeTab === 'consent' && (
            <div style={{ maxWidth: 540, margin: '0 auto' }}>
              <BlockchainBadge matchId="demo-match-001" donorId="donor-001" recipientId="recipient-001" signerRole="recipient" consentSigned={consentSigned} onConsentSuccess={() => setConsentSigned(true)} />
            </div>
          )}

        </div>
      </div>

      {/* MATCH REVIEW MODAL */}
      <MatchReviewModal
        match={selectedMatch}
        role="recipient"
        consentSigned={consentSigned}
        doctorApproved={doctorApproved}
        onClose={() => { setSelectedMatch(null); if (step === 'matched') setStep('find'); }}
        onAcceptChat={() => { setStep('chat'); }}
        onSchedule={() => { setStep('approved'); }}
      />
    </div>
  );
}

// Icons
function HeartIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function SearchIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function MatchIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function CalIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function ChatIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function ChainIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function ShieldCheckIcon({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 11 13 15 9"/></svg>; }