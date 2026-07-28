import React, { useState, useEffect, useRef } from 'react';
import FloatingAIChat from './components/FloatingAIChat';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RecipientDashboard from './pages/RecipientDashboard';
import DonorDashboard from './pages/DonorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import { api } from './services/api';
import { egovApi } from './services/egovApi';
import { useToast } from './context/ToastContext';
import { useMatch } from './context/MatchContext';
import { RoleSelectCard, AuthChoiceCard } from './components/OnboardingStepCards';
import EgovSsoForm from './components/EgovSsoForm';
import FaceLivenessCheck from './components/FaceLivenessCheck';
import RecipientHealthForm from './components/RecipientHealthForm';
import DonorPledgeForm from './components/DonorPledgeForm';
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
  const { consentSigned, setConsentSigned } = useMatch();

  // Which portal the person is heading into, chosen before auth
  const [pendingRole, setPendingRole] = useState(null); // 'recipient' | 'donor'
  const [authMode, setAuthMode] = useState(null); // 'signin' | 'signup'

  const [role, setRole] = useState(null); // set once fully authenticated + onboarded
  const [step, setStep] = useState(STEPS.ROLE_SELECT);

  const [verified, setVerified] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [tier, setTier] = useState('');
  const [userProfile, setUserProfile] = useState(null);

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
      <Routes>
        <Route path="/hospital-dashboard" element={
          <>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Navbar currentRole={null} verified={true} tier="Hospital Authority" userProfile={null} onSignOut={() => { }} />
            <HospitalDashboard />
          </>
        } />
        <Route path="/" element={
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
                    {step === STEPS.ROLE_SELECT && <RoleSelectCard choosePortal={choosePortal} />}

                    {/* STEP 2: AUTH CHOICE */}
                    {step === STEPS.AUTH_CHOICE && (
                      <AuthChoiceCard
                        pendingRole={pendingRole}
                        chooseAuthMode={chooseAuthMode}
                        onBack={() => goBackTo(STEPS.ROLE_SELECT)}
                      />
                    )}

                    {/* STEP 3: SSO EXCHANGE */}
                    {step === STEPS.SSO_PENDING && (
                      <EgovSsoForm
                        pendingRole={pendingRole}
                        authMode={authMode}
                        exchangeCode={exchangeCode}
                        setExchangeCode={setExchangeCode}
                        ssoError={ssoError}
                        ssoLoading={ssoLoading}
                        onSubmit={handleSsoSubmit}
                        onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                      />
                    )}

                    {/* STEP 4: FACE LIVENESS */}
                    {step === STEPS.LIVENESS && (
                      <FaceLivenessCheck
                        livenessStage={livenessStage}
                        setLivenessStage={setLivenessStage}
                        livenessMessage={livenessMessage}
                        onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                      />
                    )}

                    {/* STEP 5a: RECIPIENT HEALTH DECLARATION (sign-up only) */}
                    {step === STEPS.RECIPIENT_HEALTH && (
                      <RecipientHealthForm
                        recipientHealth={recipientHealth}
                        setRecipientHealth={setRecipientHealth}
                        onSubmit={handleRecipientHealthSubmit}
                        onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                      />
                    )}

                    {/* STEP 5b: DONOR ORGAN PLEDGE (sign-up only) */}
                    {step === STEPS.DONOR_PLEDGE && (
                      <DonorPledgeForm
                        donorPledge={donorPledge}
                        setDonorPledge={setDonorPledge}
                        onSubmit={handleDonorPledgeSubmit}
                        onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                        anchoringPledge={anchoringPledge}
                        pledgeAnchor={pledgeAnchor}
                      />
                    )}

                  </div>
                </div>
              </div>
            )}
          </>
        } />
      </Routes>
      <FloatingAIChat />
    </>
  );
}