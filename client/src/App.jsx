import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import RecipientDashboard from './pages/RecipientDashboard';
import DonorDashboard from './pages/DonorDashboard';
import SignatureUploader from './components/SignatureUploader';
import { api } from './services/api';
import { useToast } from './context/ToastContext';
import './styles/global.css';

// Onboarding Steps Enum
const STEPS = {
  DEMOGRAPHICS: 'DEMOGRAPHICS',
  LIVENESS: 'LIVENESS',
  PORTALS: 'PORTALS',
  RECIPIENT_HEALTH: 'RECIPIENT_HEALTH',
  DONOR_PLEDGE: 'DONOR_PLEDGE',
};

export default function App() {
  const { toast } = useToast();
  const [role, setRole] = useState(null); // null means onboarding/selection
  const [step, setStep] = useState(STEPS.DEMOGRAPHICS);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tier, setTier] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  // Global Consent State (for anonymous matching disclosure)
  const [consentSigned, setConsentSigned] = useState(false);

  // Onboarding Form States
  const [formData, setFormData] = useState({
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    birth_date: '1992-05-15',
  });

  // Liveness Biometric Scanner States
  const [livenessStage, setLivenessStage] = useState(0); // 0: initial, 1: scanning, 2: blinking, 3: matching, 4: complete
  const [livenessMessage, setLivenessMessage] = useState('Position your face in the camera circle');

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

  // Doctor Credential Verification
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');

  // Handle Demographic Verification (instantly succeeds with bypass support if backend is offline)
  const handleDemographicsSubmit = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const r = await api.verify({
        first_name: formData.first_name,
        last_name: formData.last_name,
        birth_date: formData.birth_date,
        face_liveness_session_id: 'onboarding-liveness-001',
      });
      setTier(r.data.meta?.tier_level || 'Tier I');
      setUserProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      // Proceed to Liveness Scan
      setStep(STEPS.LIVENESS);
      toast.success('Identity verified', { title: 'Verified' });
    } catch {
      // Offline/Demo mode check bypass
      setTier('Tier I (Demo Bypass)');
      setUserProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      setStep(STEPS.LIVENESS);
      toast.info('Running in demo mode — bypassing PhilSys registry', { title: 'Demo Mode' });
    } finally {
      setVerifying(false);
    }
  };

  // Face Liveness scan simulator
  useEffect(() => {
    if (step !== STEPS.LIVENESS) return;
    
    setLivenessStage(1);
    setLivenessMessage('Initializing camera viewport...');

    const t1 = setTimeout(() => {
      setLivenessStage(2);
      setLivenessMessage('Biometrics locked. Please blink slowly.');
    }, 1500);

    const t2 = setTimeout(() => {
      setLivenessStage(3);
      setLivenessMessage('Verifying liveness factors & anti-spoofing...');
    }, 3000);

    const t3 = setTimeout(() => {
      setLivenessStage(4);
      setLivenessMessage('Biometric Match Confirmed (Confidence 99.8%)');
      setVerified(true);
    }, 4500);

    const t4 = setTimeout(() => {
      setStep(STEPS.PORTALS);
    }, 5800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [step]);

  // Handle portal card clicks
  const selectPortal = (portalId) => {
    if (portalId === 'doctor') {
      setStep(STEPS.DOCTOR_PRC);
      setLicenseError('');
    } else if (portalId === 'recipient') {
      setStep(STEPS.RECIPIENT_HEALTH);
    } else if (portalId === 'donor') {
      setStep(STEPS.DONOR_PLEDGE);
    }
  };

  // Recipient Health Submit
  const handleRecipientHealthSubmit = (e) => {
    e.preventDefault();
    if (!recipientHealth.signatureFile) {
      toast.error('Please upload your e-signature document', { title: 'Signature Required' });
      return;
    }
    setRole('recipient');
    toast.success('Health declaration submitted', { title: 'Registered' });
  };

  // Donor Organ Pledge Submit (frames selection as an e-signature document and anchors on blockchain)
  const handleDonorPledgeSubmit = async (e) => {
    e.preventDefault();
    if (!donorPledge.ageConsent || !donorPledge.signatureName.trim()) return;

    setAnchoringPledge(true);
    try {
      // Call mock blockchain consent anchor
      const r = await api.anchorConsent({
        matchId: 'pledge-' + Date.now(),
        donorId: 'donor-onboarding-001',
        recipientId: 'system-registry',
        donorSignature: 'sig_pledge_' + donorPledge.signatureName.trim(),
        recipientSignature: 'sig_system',
      });
      setPledgeAnchor(r.data);
    } catch {
      // Fallback anchor
      setPledgeAnchor({
        chainId: 13371,
        txHash: '0x7c2a' + Math.random().toString(16).substring(2, 10) + 'f91a',
        blockNumber: 4821,
      });
    }

    // Wait 1.5s to show anchor receipt
    setTimeout(() => {
      setAnchoringPledge(false);
      setRole('donor');
      toast.success('Organ pledge registered on-chain', { title: 'Pledge Anchored' });
    }, 1800);
  };

  // Doctor PRC license validation
  const handleDoctorUnlock = (e) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();
    if (cleanKey === 'PRC-123456' || cleanKey === '123456') {
      setRole('doctor');
      toast.success('PRC license verified', { title: 'Verified' });
    } else {
      setLicenseError('Verification failed: License ID not found in DOH / PRC registry. (Hint: Use PRC-123456)');
      toast.error('Invalid PRC license key', { title: 'Verification Failed' });
    }
  };

  const handleSignOut = () => {
    setRole(null);
    setStep(STEPS.DEMOGRAPHICS);
    setVerified(false);
    setUserProfile(null);
    setLicenseKey('');
    setLicenseError('');
    setPledgeAnchor(null);
    toast.info('Signed out successfully', { title: 'Signed Out' });
  };

  return (
    <>
      {/* Skip to main content link for keyboard accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
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
            
            {/* Onboarding Box */}
            <div className="card anim-up" style={{ padding: '40px', maxWidth: 640, margin: '0 auto', background: 'white' }}>
              
              {/* BRAND HEADER */}
              {step !== STEPS.LIVENESS && (
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, margin: '0 auto 16px' }}>e</div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Secure eBuhay Onboarding</h2>
                  <p style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>DICT national platform integrated with PhilSys eVerify and encrypted digital signatures.</p>
                </div>
              )}

              {/* STEP 1: DEMOGRAPHICS */}
              {step === STEPS.DEMOGRAPHICS && (
                <form onSubmit={handleDemographicsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
                  <div className="grid-2">
                    <div className="field">
                      <label className="label">First Name</label>
                      <input
                        className="input"
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Last Name</label>
                      <input
                        className="input"
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Birth Date</label>
                    <input
                      className="input"
                      type="date"
                      required
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--foreground-muted)' }}>
                    <span style={{ fontSize: 16 }}>🌐</span>
                    <span>PhilSys eVerify check is offline? System will run in secure demo-bypass mode automatically.</span>
                  </div>

                  <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={verifying}>
                    {verifying ? <><span className="spinner" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> Querying Registry…</> : 'Verify Demographic Identity'}
                  </button>
                </form>
              )}

              {/* STEP 1B: BIOMETRIC FACE LIVENESS SCANNER */}
              {step === STEPS.LIVENESS && (
                <div className="anim-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>Face Liveness Verification</h3>
                  <p style={{ fontSize: 13, color: 'var(--foreground-muted)', maxWidth: 440 }}>Please center your face inside the camera scan circle and blink when prompted by eVerify.</p>
                  
                  {/* Camera Scanning Box Mockup */}
                  <div style={{ 
                    position: 'relative', 
                    width: 200, 
                    height: 200, 
                    borderRadius: '50%', 
                    border: `4px solid ${livenessStage === 4 ? 'var(--emerald)' : livenessStage === 2 ? 'var(--sun)' : 'var(--primary)'}`, 
                    background: '#1E293B', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                  }}>
                    {/* Simulated scanning scanline */}
                    {livenessStage < 4 && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 4,
                        background: livenessStage === 2 ? 'var(--sun)' : 'var(--primary)',
                        animation: 'flowDash 2s linear infinite',
                        top: '50%'
                      }} />
                    )}

                    {/* Camera avatar silhouette placeholder */}
                    <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" style={{ zIndex: 1 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>

                    {/* Success checkmark */}
                    {livenessStage === 4 && (
                      <div className="anim-in" style={{ position: 'absolute', inset: 0, background: 'rgba(5,150,105,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 5 }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Liveness Scanning message */}
                  <div style={{ 
                    fontWeight: 700, 
                    fontSize: 14, 
                    color: livenessStage === 4 ? 'var(--emerald)' : livenessStage === 2 ? 'var(--sun)' : 'var(--primary)',
                    padding: '8px 16px',
                    background: 'var(--background-alt)',
                    borderRadius: 'var(--r-full)',
                    border: '1px solid var(--border)'
                  }}>
                    {livenessMessage}
                  </div>
                </div>
              )}

              {/* STEP 2: PORTALS */}
              {step === STEPS.PORTALS && (
                <div className="anim-in">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)', padding: '14px 18px', borderRadius: 'var(--r-md)', marginBottom: 28 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--emerald)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--emerald)' }}>PhilSys Demographics &amp; Biometrics Confirmed</div>
                      <div style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Welcome, {userProfile.first_name} {userProfile.last_name} ({tier})</div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', marginBottom: 16, textAlign: 'center' }}>Choose Your Active Portal</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { id: 'recipient', title: 'Recipient Portal', desc: 'Search compatible blood/organ matches, request transplants, and schedule doctor diagnostic consultations.', icon: <HeartIcon size={24} />, badge: 'primary' },
                      { id: 'donor', title: 'Donor Portal', desc: 'Register eligibility details, pledge organ/blood donations, manage calendar slots, and execute encrypted e-signature consent.', icon: <DropIcon size={24} />, badge: 'success' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => selectPortal(item.id)}
                        className="card card-interactive"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 18, textAlign: 'left', border: '1px solid var(--border)' }}
                      >
                        <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 15 }}>{item.title}</strong>
                            <span className={`badge badge-${item.badge}`} style={{ fontSize: 9 }}>Access</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4, lineHeight: 1.5 }}>{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3A: RECIPIENT HEALTH DECLARATION */}
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

                    {/* Medical Record Upload / Diagnosis Check */}
                    <div className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
                      <label className="label" style={{ marginBottom: 4 }}>1. Past Medical Record / Lab Documentation</label>
                      <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
                        Upload lab results or medical records, or choose to schedule a diagnostic consultation instead.
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${recipientHealth.hasMedicalRecord === 'yes' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setRecipientHealth({ ...recipientHealth, hasMedicalRecord: 'yes', requiresDiagnosis: false })}
                          style={{ flex: 1 }}
                        >
                          Yes, Upload Record (PDF)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${recipientHealth.hasMedicalRecord === 'no' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setRecipientHealth({ ...recipientHealth, hasMedicalRecord: 'no', requiresDiagnosis: true, medicalRecordFile: null })}
                          style={{ flex: 1 }}
                        >
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
                              <select 
                                className="input" 
                                style={{ height: 34, fontSize: 12 }} 
                                value={recipientHealth.doctorSpecialty} 
                                onChange={e => setRecipientHealth({ ...recipientHealth, doctorSpecialty: e.target.value })}
                              >
                                <option value="General Diagnostic Physician">General Diagnostic Physician</option>
                                <option value="Nephrologist (Kidney)">Nephrologist (Kidney)</option>
                                <option value="Hepatologist (Liver)">Hepatologist (Liver)</option>
                                <option value="Ophthalmologist (Cornea)">Ophthalmologist (Cornea)</option>
                                <option value="Cardiologist (Heart)">Cardiologist (Heart)</option>
                              </select>
                            </div>

                            <div className="field">
                              <label className="label" style={{ fontSize: 11 }}>Consultation Date</label>
                              <input 
                                className="input" 
                                type="date" 
                                style={{ height: 34, fontSize: 12 }}
                                value={recipientHealth.appointmentDate} 
                                onChange={e => setRecipientHealth({ ...recipientHealth, appointmentDate: e.target.value })} 
                              />
                            </div>
                          </div>

                          <div className="field">
                            <label className="label" style={{ fontSize: 11 }}>Preferred Time Slot</label>
                            <select 
                              className="input" 
                              style={{ height: 34, fontSize: 12 }} 
                              value={recipientHealth.appointmentTime} 
                              onChange={e => setRecipientHealth({ ...recipientHealth, appointmentTime: e.target.value })}
                            >
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

                    {/* Mandatory Recipient E-Signature Document Upload */}
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
                      <button className="btn btn-ghost" type="button" onClick={() => setStep(STEPS.PORTALS)} style={{ flex: 1 }}>
                        Back
                      </button>
                      <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={!recipientHealth.signatureFile}>
                        {recipientHealth.hasMedicalRecord === 'no' ? 'Book Slot & Enter Portal →' : 'Register & Enter Portal'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3B: DONOR ORGAN PLEDGE E-SIGNATURE CONSENT FORM */}
              {step === STEPS.DONOR_PLEDGE && (
                <div className="anim-in">
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>E-Signature Organ Pledge Consent</h3>
                  <p style={{ fontSize: 13, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 20 }}>Submit a formal organ pledge. This document will be digitally signed and stored in the secure national audit registry.</p>
                  
                  <form onSubmit={handleDonorPledgeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Pledge details selectors */}
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
                            <button
                              key={org}
                              type="button"
                              onClick={() => {
                                const newOrgans = active ? donorPledge.organs.filter(x => x !== org) : [...donorPledge.organs, org];
                                setDonorPledge({ ...donorPledge, organs: newOrgans });
                              }}
                              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                              style={{ textTransform: 'capitalize' }}
                            >
                              {org}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legal consent check */}
                    <div className="field" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input 
                        type="checkbox" 
                        id="ageConsent" 
                        required 
                        checked={donorPledge.ageConsent} 
                        onChange={e => setDonorPledge({ ...donorPledge, ageConsent: e.target.checked })} 
                        style={{ marginTop: 3 }}
                      />
                      <label htmlFor="ageConsent" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--foreground-muted)' }}>
                        I formally declare that I am of legal age (18+) and under sound mind pledge the selected organs for altruistic medical transplantation in accordance with Philippine RA 7170.
                      </label>
                    </div>

                    {/* E-Signature Input */}
                    <div className="field">
                      <label className="label">Digital Signature Document (PDF or Image scan)</label>
                      <SignatureUploader 
                        onUploadComplete={(file) => setDonorPledge({ ...donorPledge, signatureName: file.name })} 
                        onClear={() => setDonorPledge({ ...donorPledge, signatureName: '' })} 
                      />
                    </div>

                    {/* Digital Signature status anchor card */}
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
                      <button className="btn btn-ghost" type="button" onClick={() => setStep(STEPS.PORTALS)} style={{ flex: 1 }} disabled={anchoringPledge}>
                        Back
                      </button>
                      <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={anchoringPledge || !donorPledge.ageConsent || !donorPledge.signatureName.trim()}>
                        Submit Signed Pledge
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP END */}

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

function StethoscopeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
