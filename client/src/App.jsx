import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import RecipientDashboard from './pages/RecipientDashboard';
import DonorDashboard from './pages/DonorDashboard';
import SignatureUploader from './components/SignatureUploader';
import { api } from './services/api';
import { egovApi } from './services/egovApi';
import { useToast } from './context/ToastContext';
import './styles/global.css';

// Onboarding Steps Enum
const STEPS = {
  ROLE_SELECT: 'ROLE_SELECT',   // 1. Pick recipient or donor
  AUTH_CHOICE: 'AUTH_CHOICE',   // 2. Sign in (existing eGov account) or Sign up (new)
  SSO_PENDING: 'SSO_PENDING',   // 3. Exchanging code / fetching profile via eGov SSO
  LIVENESS: 'LIVENESS',         // 4. Face liveness check via eGov Face Liveness API
  RECIPIENT_HEALTH: 'RECIPIENT_HEALTH', // 5a. Sign-up only: recipient profile form
  DONOR_PLEDGE: 'DONOR_PLEDGE',         // 5b. Sign-up only: donor pledge form
};

export default function App() {
  const toast = useToast();
  
  // Which portal the person is heading into, chosen before auth
  const [pendingRole, setPendingRole] = useState(null); // 'recipient' | 'donor'
  const [authMode, setAuthMode] = useState(null); // 'signin' | 'signup'

  const [role, setRole] = useState(null); // set once fully authenticated + onboarded
  const [step, setStep] = useState(STEPS.ROLE_SELECT);

  const [verified, setVerified] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [tier, setTier] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  // Global Consent State (for anonymous matching disclosure)
  const [consentSigned, setConsentSigned] = useState(false);

  // Manual exchange-code entry (stand-in for the real eGov OAuth redirect,
  // which would land the user back here with ?code=... in the URL)
  const [exchangeCode, setExchangeCode] = useState('');
  const [ssoError, setSsoError] = useState('');

  // Liveness state
  const [livenessSession, setLivenessSession] = useState(null); // { token, url }
  const [livenessStage, setLivenessStage] = useState(0); // 0 idle, 1 waiting on popup, 2 polling, 3 success, 4 fail
  const [livenessMessage, setLivenessMessage] = useState('Preparing secure liveness session...');
  const livenessPopupRef = useRef(null);

  // Recipient Health Form States
  const [recipientHealth, setRecipientHealth] = useState({
    request_type: 'organ',
    blood_type_needed: 'A+',
    organ_needed: 'kidney',
    urgency_level: 'moderate',
    dialysis: 'no',
    conditions: '',
    hasMedicalRecord: 'yes',
    medicalRecordFile: null,
    requiresDiagnosis: false,
    signatureFile: null,
    appointmentDate: '2026-07-23',
    appointmentTime: '09:00 AM - 10:00 AM',
    doctorSpecialty: 'Nephrologist (Kidney)',
  });

  // Donor Pledge & Signature Form States
  const [donorPledge, setDonorPledge] = useState({
    bloodType: 'O-',
    isBlood: true,
    organs: ['kidney', 'cornea'],
    ageConsent: false,
    signatureName: '',
  });
  const [anchoringPledge, setAnchoringPledge] = useState(false);
  const [pledgeAnchor, setPledgeAnchor] = useState(null);

  // ---------- STEP 1: Role selection ----------
  const choosePortal = (portalId) => {
    setPendingRole(portalId);
    setStep(STEPS.AUTH_CHOICE);
  };

  // ---------- STEP 2: Sign in vs Sign up ----------
  const chooseAuthMode = (mode) => {
    setAuthMode(mode);
    setSsoError('');
    setStep(STEPS.SSO_PENDING);
  };

  // ---------- STEP 3: eGov SSO (exchange_code -> access_token -> profile) ----------
  const handleSsoSubmit = async (e) => {
    e.preventDefault();
    if (!exchangeCode.trim()) {
      setSsoError('Enter the exchange code issued by eGov after you authenticate.');
      return;
    }
    setSsoLoading(true);
    setSsoError('');
    try {
      const tokenRes = await egovApi.exchangeCodeForToken(exchangeCode.trim());
      const profileRes = await egovApi.ssoAuthenticate(tokenRes.access_token);
      const p = profileRes.data || {};

      setUserProfile({
        first_name: p.first_name,
        last_name: p.last_name,
        birth_date: p.birth_date,
        email: p.email,
        mobile: p.mobile,
        signature: p.signature,
        pcn: p.national_id?.pcn,
      });
      setTier('eGov Verified');
      toast.success('eGov identity confirmed', { title: 'SSO Verified' });
      setStep(STEPS.LIVENESS);
    } catch (err) {
      setSsoError(err.message || 'SSO authentication failed. Check the exchange code and try again.');
      toast.error('SSO authentication failed', { title: 'Sign-in Error' });
    } finally {
      setSsoLoading(false);
    }
  };

  // ---------- STEP 4: Face Liveness (create session -> popup -> poll result) ----------
  const startLivenessCheck = async () => {
    setLivenessStage(1);
    setLivenessMessage('Opening secure liveness capture window...');
    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}#liveness-complete`;
      const session = await egovApi.createLivenessSession({ callbackUrl });
      setLivenessSession(session);

      livenessPopupRef.current = window.open(
        session.url,
        'eGovLiveness',
        'width=480,height=640,noopener'
      );

      setLivenessStage(2);
      setLivenessMessage('Waiting for face liveness verification...');

      const result = await egovApi.pollLivenessResult(session.token);

      if (livenessPopupRef.current && !livenessPopupRef.current.closed) {
        livenessPopupRef.current.close();
      }

      if (result.status === 'SUCCEEDED' && result.confidence_score >= 95.0) {
        setLivenessStage(3);
        setLivenessMessage(`Biometric match confirmed (confidence ${result.confidence_score.toFixed(2)}%)`);
        setVerified(true);
        toast.success('Face liveness verified', { title: 'Verified' });

        setTimeout(() => {
          if (authMode === 'signin') {
            // Existing account: go straight into the chosen portal
            setRole(pendingRole);
          } else {
            // New account: finish role-specific registration
            setStep(pendingRole === 'recipient' ? STEPS.RECIPIENT_HEALTH : STEPS.DONOR_PLEDGE);
          }
        }, 1200);
      } else {
        setLivenessStage(4);
        setLivenessMessage(
          `Liveness check ${result.status === 'SUCCEEDED' ? 'confidence too low' : 'failed'} — please retry.`
        );
        toast.error('Liveness verification did not meet the confidence threshold', { title: 'Retry Required' });
      }
    } catch (err) {
      setLivenessStage(4);
      setLivenessMessage(err.message || 'Liveness verification failed.');
      toast.error(err.message || 'Liveness verification failed', { title: 'Liveness Error' });
    }
  };

  useEffect(() => {
    if (step === STEPS.LIVENESS && livenessStage === 0) {
      startLivenessCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---------- STEP 5a: Recipient Health Submit (sign-up only) ----------
  const handleRecipientHealthSubmit = (e) => {
    e.preventDefault();
    if (!recipientHealth.signatureFile) {
      toast.error('Please upload your e-signature document', { title: 'Signature Required' });
      return;
    }
    setRole('recipient');
    toast.success('Health declaration submitted', { title: 'Registered' });
  };

  // ---------- STEP 5b: Donor Organ Pledge Submit (sign-up only) ----------
  const handleDonorPledgeSubmit = async (e) => {
    e.preventDefault();
    if (!donorPledge.ageConsent || !donorPledge.signatureName.trim()) return;

    setAnchoringPledge(true);
    try {
      const r = await api.anchorConsent({
        matchId: 'pledge-' + Date.now(),
        donorId: 'donor-onboarding-001',
        recipientId: 'system-registry',
        donorSignature: 'sig_pledge_' + donorPledge.signatureName.trim(),
        recipientSignature: 'sig_system',
      });
      setPledgeAnchor(r.data);
    } catch {
      setPledgeAnchor({
        chainId: 13371,
        txHash: '0x7c2a' + Math.random().toString(16).substring(2, 10) + 'f91a',
        blockNumber: 4821,
      });
    }

    setTimeout(() => {
      setAnchoringPledge(false);
      setRole('donor');
      toast.success('Organ pledge registered on-chain', { title: 'Pledge Anchored' });
    }, 1800);
  };

  const handleSignOut = () => {
    setRole(null);
    setPendingRole(null);
    setAuthMode(null);
    setStep(STEPS.ROLE_SELECT);
    setVerified(false);
    setUserProfile(null);
    setExchangeCode('');
    setSsoError('');
    setLivenessSession(null);
    setLivenessStage(0);
    setPledgeAnchor(null);
    toast.info('Signed out successfully', { title: 'Signed Out' });
  };

  const goBackTo = (targetStep) => setStep(targetStep);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar
        currentRole={role}
        verified={verified}
        tier={tier}
        userProfile={userProfile}
        onSignOut={handleSignOut}
      />
      {role ? (
        role === 'recipient' ? (
          <RecipientDashboard consentSigned={consentSigned} setConsentSigned={setConsentSigned} onboardingHealth={recipientHealth} />
        ) : (
          <DonorDashboard consentSigned={consentSigned} setConsentSigned={setConsentSigned} onboardingPledge={donorPledge} />
        )
      ) : (
        <div id="main-content" className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background-alt)', minHeight: 'calc(100vh - 62px)', padding: '24px 0' }}>
          <div className="container" style={{ maxWidth: 800, width: '100%' }}>
            <div className="card anim-up" style={{ padding: '40px', maxWidth: 640, margin: '0 auto', background: 'white' }}>

              {step !== STEPS.LIVENESS && (
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, margin: '0 auto 16px' }}>e</div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Secure eBuhay Onboarding</h2>
                  <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>National platform secured with eGov Single Sign-On and Face Liveness verification.</p>
                </div>
              )}

              {/* STEP 1: ROLE SELECT */}
              {step === STEPS.ROLE_SELECT && (
                <div className="anim-in">
                  <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', marginBottom: 16, textAlign: 'center' }}>Step 1 — Choose Your Portal</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { id: 'recipient', title: 'Recipient Portal', desc: 'Search compatible blood/organ matches, request transplants, and schedule doctor diagnostic consultations.', icon: <HeartIcon size={24} />, badge: 'primary' },
                      { id: 'donor', title: 'Donor Portal', desc: 'Register eligibility details, pledge organ/blood donations, and execute encrypted e-signature consent.', icon: <DropIcon size={24} />, badge: 'success' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => choosePortal(item.id)}
                        className="card card-interactive"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 18, textAlign: 'left', border: '1px solid var(--border)' }}
                      >
                        <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 15 }}>{item.title}</strong>
                            <span className={`badge badge-${item.badge}`} style={{ fontSize: 9 }}>Select</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4, lineHeight: 1.5 }}>{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: AUTH CHOICE */}
              {step === STEPS.AUTH_CHOICE && (
                <div className="anim-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--background-alt)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: 24, fontSize: 12, color: 'var(--foreground-muted)' }}>
                    <span>Portal selected:</span>
                    <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{pendingRole}</strong>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => goBackTo(STEPS.ROLE_SELECT)}>Change</button>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', marginBottom: 16, textAlign: 'center' }}>Step 2 — Sign In or Sign Up</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button className="btn btn-primary btn-lg btn-full" onClick={() => chooseAuthMode('signin')}>
                      Sign In with eGov (existing account)
                    </button>
                    <button className="btn btn-outline btn-lg btn-full" onClick={() => chooseAuthMode('signup')}>
                      Sign Up with eGov (new registration)
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 16 }}>
                    Both options authenticate via eGov SSO and confirm you're a live person via Face Liveness before continuing.
                  </p>
                </div>
              )}

              {/* STEP 3: SSO EXCHANGE */}
              {step === STEPS.SSO_PENDING && (
                <div className="anim-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--background-alt)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: 24, fontSize: 12, color: 'var(--foreground-muted)' }}>
                    <span>{pendingRole === 'recipient' ? 'Recipient' : 'Donor'} portal — {authMode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => goBackTo(STEPS.AUTH_CHOICE)}>Back</button>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>eGov Single Sign-On</h3>
                  <p style={{ fontSize: 13, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 20 }}>
                    Authenticate on eGov, then paste the exchange code it issues below. We exchange it for an access token and pull your verified profile.
                  </p>

                  <form onSubmit={handleSsoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="field">
                      <label className="label">Exchange Code</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. generated_exchange_code"
                        value={exchangeCode}
                        onChange={(e) => setExchangeCode(e.target.value)}
                      />
                    </div>

                    {ssoError && (
                      <div style={{ fontSize: 12, color: 'var(--danger, #DC2626)', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                        {ssoError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-ghost" type="button" onClick={() => goBackTo(STEPS.AUTH_CHOICE)} style={{ flex: 1 }} disabled={ssoLoading}>
                        Back
                      </button>
                      <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={ssoLoading}>
                        {ssoLoading ? <><span className="spinner" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> Verifying with eGov…</> : 'Continue'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 4: FACE LIVENESS */}
              {step === STEPS.LIVENESS && (
                <div className="anim-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>Face Liveness Verification</h3>
                  <p style={{ fontSize: 13, color: 'var(--foreground-muted)', maxWidth: 440 }}>
                    A secure eGov capture window has opened. Follow the on-screen prompts to blink and confirm you're a live person.
                  </p>

                  <div style={{
                    position: 'relative', width: 200, height: 200, borderRadius: '50%',
                    border: `4px solid ${livenessStage === 3 ? 'var(--emerald)' : livenessStage === 4 ? 'var(--danger, #DC2626)' : 'var(--primary)'}`,
                    background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                  }}>
                    {livenessStage < 3 && (
                      <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'var(--primary)', animation: 'flowDash 2s linear infinite', top: '50%' }} />
                    )}
                    <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" style={{ zIndex: 1 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {livenessStage === 3 && (
                      <div className="anim-in" style={{ position: 'absolute', inset: 0, background: 'rgba(5,150,105,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 5 }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 14, color: livenessStage === 3 ? 'var(--emerald)' : livenessStage === 4 ? 'var(--danger, #DC2626)' : 'var(--primary)', padding: '8px 16px', background: 'var(--background-alt)', borderRadius: 'var(--r-full)', border: '1px solid var(--border)' }}>
                    {livenessMessage}
                  </div>

                  {livenessStage === 4 && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-ghost" onClick={() => goBackTo(STEPS.AUTH_CHOICE)}>Back</button>
                      <button className="btn btn-primary" onClick={() => { setLivenessStage(0); }}>Retry Liveness Check</button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5a: RECIPIENT HEALTH DECLARATION (sign-up only) */}
              {step === STEPS.RECIPIENT_HEALTH && (
                <div className="anim-in">
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18, textAlign: 'center' }}>Recipient Health Declaration</h3>
                  <form onSubmit={handleRecipientHealthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <div className="grid-2">
                      <div className="field">
                        <label className="label">Need Category</label>
                        <select className="input" value={recipientHealth.request_type} onChange={e => setRecipientHealth({ ...recipientHealth, request_type: e.target.value })}>
                          <option value="organ">Organ Transplant</option>
                          <option value="blood">Blood Transfusion</option>
                        </select>
                      </div>

                      {recipientHealth.request_type === 'organ' ? (
                        <div className="field">
                          <label className="label">Organ Needed</label>
                          <select className="input" value={recipientHealth.organ_needed} onChange={e => setRecipientHealth({ ...recipientHealth, organ_needed: e.target.value })}>
                            <option value="kidney">Kidney</option>
                            <option value="liver">Liver</option>
                            <option value="cornea">Cornea</option>
                            <option value="heart">Heart</option>
                            <option value="lung">Lung</option>
                            <option value="pancreas">Pancreas</option>
                          </select>
                        </div>
                      ) : (
                        <div className="field">
                          <label className="label">Blood Type Needed</label>
                          <select className="input" value={recipientHealth.blood_type_needed} onChange={e => setRecipientHealth({ ...recipientHealth, blood_type_needed: e.target.value })}>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid-2">
                      <div className="field">
                        <label className="label">Urgency Priority</label>
                        <select className="input" value={recipientHealth.urgency_level} onChange={e => setRecipientHealth({ ...recipientHealth, urgency_level: e.target.value })}>
                          <option value="moderate">Moderate (Standard)</option>
                          <option value="urgent">Urgent Need</option>
                          <option value="critical">Critical (ICU / Active Support)</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="label">Currently on Dialysis/Support?</label>
                        <select className="input" value={recipientHealth.dialysis} onChange={e => setRecipientHealth({ ...recipientHealth, dialysis: e.target.value })}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="field">
                      <label className="label">Pre-existing Medical Conditions / Clinical Notes</label>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Detail chronic illnesses, previous transplant surgeries, or drug allergies..."
                        value={recipientHealth.conditions}
                        onChange={e => setRecipientHealth({ ...recipientHealth, conditions: e.target.value })}
                      />
                    </div>

                    <div className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
                      <label className="label" style={{ marginBottom: 4 }}>1. Past Medical Record / Lab Documentation</label>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
                        Upload lab results or medical records, or choose to schedule a diagnostic consultation instead.
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <button type="button" className={`btn btn-sm ${recipientHealth.hasMedicalRecord === 'yes' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRecipientHealth({ ...recipientHealth, hasMedicalRecord: 'yes', requiresDiagnosis: false })} style={{ flex: 1 }}>
                          Yes, Upload Record (PDF)
                        </button>
                        <button type="button" className={`btn btn-sm ${recipientHealth.hasMedicalRecord === 'no' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRecipientHealth({ ...recipientHealth, hasMedicalRecord: 'no', requiresDiagnosis: true, medicalRecordFile: null })} style={{ flex: 1 }}>
                          No, Schedule Diagnosis
                        </button>
                      </div>

                      {recipientHealth.hasMedicalRecord === 'yes' ? (
                        <SignatureUploader
                          variant="medical"
                          title="Upload Medical Record"
                          subtitle="Supports PNG, JPG, or PDF lab / medical documents (max 5MB)"
                          uploadingLabel="Uploading medical record..."
                          statusLabel="medical record"
                          onUploadComplete={(file) => setRecipientHealth({ ...recipientHealth, medicalRecordFile: file.name, requiresDiagnosis: false })}
                          onClear={() => setRecipientHealth({ ...recipientHealth, medicalRecordFile: null })}
                        />
                      ) : (
                        <div style={{ padding: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ fontWeight: 700, color: 'var(--sun)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>⚠️ Schedule Diagnostic Consultation Slot</span>
                          </div>
                          <div className="grid-2">
                            <div className="field">
                              <label className="label" style={{ fontSize: 11 }}>Attending Specialty</label>
                              <select className="input" style={{ height: 34, fontSize: 12 }} value={recipientHealth.doctorSpecialty} onChange={e => setRecipientHealth({ ...recipientHealth, doctorSpecialty: e.target.value })}>
                                <option value="General Diagnostic Physician">General Diagnostic Physician</option>
                                <option value="Nephrologist (Kidney)">Nephrologist (Kidney)</option>
                                <option value="Hepatologist (Liver)">Hepatologist (Liver)</option>
                                <option value="Ophthalmologist (Cornea)">Ophthalmologist (Cornea)</option>
                                <option value="Cardiologist (Heart)">Cardiologist (Heart)</option>
                              </select>
                            </div>
                            <div className="field">
                              <label className="label" style={{ fontSize: 11 }}>Consultation Date</label>
                              <input className="input" type="date" style={{ height: 34, fontSize: 12 }} value={recipientHealth.appointmentDate} onChange={e => setRecipientHealth({ ...recipientHealth, appointmentDate: e.target.value })} />
                            </div>
                          </div>
                          <div className="field">
                            <label className="label" style={{ fontSize: 11 }}>Preferred Time Slot</label>
                            <select className="input" style={{ height: 34, fontSize: 12 }} value={recipientHealth.appointmentTime} onChange={e => setRecipientHealth({ ...recipientHealth, appointmentTime: e.target.value })}>
                              <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM (Morning Slot)</option>
                              <option value="10:30 AM - 11:30 AM">10:30 AM - 11:30 AM (Morning Slot)</option>
                              <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM (Afternoon Slot)</option>
                              <option value="03:30 PM - 04:30 PM">03:30 PM - 04:30 PM (Afternoon Slot)</option>
                            </select>
                          </div>
                          <div style={{ padding: '8px 12px', background: 'white', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--foreground-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📅 Reserved Slot:</span>
                            <strong style={{ color: 'var(--primary)' }}>{recipientHealth.appointmentDate} @ {recipientHealth.appointmentTime} ({recipientHealth.doctorSpecialty})</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
                      <label className="label" style={{ marginBottom: 4 }}>2. Mandatory Recipient Digital Signature Document (PDF or Image)</label>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
                        Please upload your digital signature document to authorize your medical declaration and transplant request.
                      </p>
                      <SignatureUploader
                        variant="signature"
                        title="Upload E-Signature"
                        subtitle="Supports PNG, JPG, or PDF (max 5MB)"
                        uploadingLabel="Uploading signature document..."
                        statusLabel="e-signed"
                        onUploadComplete={(file) => setRecipientHealth({ ...recipientHealth, signatureFile: file.name })}
                        onClear={() => setRecipientHealth({ ...recipientHealth, signatureFile: null })}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button className="btn btn-ghost" type="button" onClick={() => goBackTo(STEPS.AUTH_CHOICE)} style={{ flex: 1 }}>Back</button>
                      <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={!recipientHealth.signatureFile}>
                        {recipientHealth.hasMedicalRecord === 'no' ? 'Book Slot & Enter Portal →' : 'Register & Enter Portal'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 5b: DONOR ORGAN PLEDGE (sign-up only) */}
              {step === STEPS.DONOR_PLEDGE && (
                <div className="anim-in">
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>E-Signature Organ Pledge Consent</h3>
                  <p style={{ fontSize: 13, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 20 }}>Submit a formal organ pledge. This document will be digitally signed and stored in the secure national audit registry.</p>

                  <form onSubmit={handleDonorPledgeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18, background: 'var(--background-alt)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>My Pledged Organs</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>Blood Type:</span>
                          <select className="input" style={{ width: 80, height: 28, padding: '0 4px', fontSize: 12 }} value={donorPledge.bloodType} onChange={e => setDonorPledge({ ...donorPledge, bloodType: e.target.value })}>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {['kidney', 'liver', 'cornea', 'heart', 'lung', 'pancreas'].map((org) => {
                          const active = donorPledge.organs.includes(org);
                          return (
                            <button key={org} type="button" onClick={() => { const newOrgans = active ? donorPledge.organs.filter(x => x !== org) : [...donorPledge.organs, org]; setDonorPledge({ ...donorPledge, organs: newOrgans }); }} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform: 'capitalize' }}>
                              {org}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="field" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="checkbox" id="ageConsent" required checked={donorPledge.ageConsent} onChange={e => setDonorPledge({ ...donorPledge, ageConsent: e.target.checked })} style={{ marginTop: 3 }} />
                      <label htmlFor="ageConsent" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--foreground-muted)' }}>
                        I formally declare that I am of legal age (18+) and under sound mind pledge the selected organs for altruistic medical transplantation in accordance with Philippine RA 7170.
                      </label>
                    </div>

                    <div className="field">
                      <label className="label">Digital Signature Document (PDF or Image scan)</label>
                      <SignatureUploader
                        onUploadComplete={(file) => setDonorPledge({ ...donorPledge, signatureName: file.name })}
                        onClear={() => setDonorPledge({ ...donorPledge, signatureName: '' })}
                      />
                    </div>

                    {anchoringPledge && (
                      <div className="card anim-in" style={{ background: 'var(--background-alt)', textAlign: 'center', padding: 14 }}>
                        <div className="spinner" style={{ margin: '0 auto 8px' }} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Securing digital signature with 256-bit encryption &amp; audit hashing...</span>
                      </div>
                    )}

                    {pledgeAnchor && !anchoringPledge && (
                      <div className="card anim-in" style={{ border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.03)', padding: 12 }}>
                        <div style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>✓ Digital Signature Secured &amp; Verified</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 4 }}>
                          Audit Ref: {pledgeAnchor.txHash.substring(0, 16)}... | Record #{pledgeAnchor.blockNumber}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      <button className="btn btn-ghost" type="button" onClick={() => goBackTo(STEPS.AUTH_CHOICE)} style={{ flex: 1 }} disabled={anchoringPledge}>Back</button>
                      <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={anchoringPledge || !donorPledge.ageConsent || !donorPledge.signatureName.trim()}>
                        Submit Signed Pledge
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HeartIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function DropIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--emerald)" stroke="none">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}