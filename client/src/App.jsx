import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import FloatingAIChat from "./components/ui/FloatingAIChat";
import { Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import PublicLanding from "./pages/PublicLanding";
import { api } from "./services/api";
import { egovApi } from "./services/egovApi";
import { useToast } from "./context/ToastContext";
import { useMatch } from "./context/MatchContext";
import {
  RoleSelectCard,
  AuthChoiceCard,
} from "./features/onboarding/OnboardingStepCards";
import StaffSignIn from "./features/hospital/StaffSignIn";
import {
  clearHospitalDemoSession,
  hasHospitalDemoSession,
} from "./features/hospital/staffDemoSession";
import "./styles/global.css";
import "./styles/shared-ui.css";

const RecipientDashboard = lazy(() => import("./pages/RecipientDashboard"));
const DonorDashboard = lazy(() => import("./pages/DonorDashboard"));
const HospitalDashboard = lazy(() => import("./pages/HospitalDashboard"));
const EgovSsoForm = lazy(() => import("./features/onboarding/EgovSsoForm"));
const FaceLivenessCheck = lazy(
  () => import("./features/onboarding/FaceLivenessCheck"),
);
const RecipientHealthForm = lazy(
  () => import("./features/recipient/RecipientHealthForm"),
);
const DonorPledgeForm = lazy(() => import("./features/donor/DonorPledgeForm"));

// Onboarding Steps Enum
const STEPS = {
  ROLE_SELECT: "ROLE_SELECT", // 1. Pick recipient or donor
  AUTH_CHOICE: "AUTH_CHOICE", // 2. Sign in (existing eGov account) or Sign up (new)
  SSO_PENDING: "SSO_PENDING", // 3. Exchanging code / fetching profile via eGov SSO
  LIVENESS: "LIVENESS", // 4. Face liveness check via eGov Face Liveness API
  RECIPIENT_HEALTH: "RECIPIENT_HEALTH", // 5a. Sign-up only: recipient profile form
  DONOR_PLEDGE: "DONOR_PLEDGE", // 5b. Sign-up only: donor pledge form
};

function HospitalRoute() {
  const navigate = useNavigate();
  if (!hasHospitalDemoSession())
    return <Navigate to="/staff-sign-in" replace />;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar
        currentRole={null}
        verified={true}
        tier="Hospital demo staff"
        userProfile={null}
        onSignOut={() => {
          clearHospitalDemoSession();
          navigate("/staff-sign-in", { replace: true });
        }}
      />
      <Suspense
        fallback={
          <main id="main-content" tabIndex={-1} className="page-content">
            <div role="status" aria-live="polite">
              Loading hospital dashboard…
            </div>
          </main>
        }
      >
        <HospitalDashboard />
      </Suspense>
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { consentSigned, setConsentSigned } = useMatch();

  // Which portal the person is heading into, chosen before auth
  const [pendingRole, setPendingRole] = useState(null); // 'recipient' | 'donor'
  const [authMode, setAuthMode] = useState(null); // 'signin' | 'signup'

  const [role, setRole] = useState(null); // set once fully authenticated + onboarded
  const [step, setStep] = useState(STEPS.ROLE_SELECT);

  const onboardingRole = location.pathname.match(/^\/onboarding\/([^/]+)$/)?.[1];
  useEffect(() => {
    if (onboardingRole === "recipient" || onboardingRole === "donor") {
      setPendingRole(onboardingRole);
      setStep(STEPS.AUTH_CHOICE);
    }
  }, [onboardingRole]);
  useEffect(() => {
    if (onboardingRole && step !== STEPS.ROLE_SELECT) {
      document.getElementById("onboarding-heading")?.focus();
    }
  }, [onboardingRole, step]);

  const finishRole = (nextRole) => {
    setRole(nextRole);
    navigate(`/${nextRole}`);
  };

  const [verified, setVerified] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [tier, setTier] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // Manual exchange-code entry (stand-in for the real eGov OAuth redirect,
  // which would land the user back here with ?code=... in the URL)
  const [exchangeCode, setExchangeCode] = useState("");
  const [ssoError, setSsoError] = useState("");

  // Liveness state
  const [livenessSession, setLivenessSession] = useState(null); // { token, url }
  const [livenessStage, setLivenessStage] = useState(0); // 0 idle, 1 waiting on popup, 2 polling, 3 success, 4 fail
  const [livenessMessage, setLivenessMessage] = useState(
    "Preparing the demo face-check session...",
  );
  const livenessPopupRef = useRef(null);

  // Recipient Health Form States
  const [recipientHealth, setRecipientHealth] = useState({
    request_type: "organ",
    blood_type_needed: "A+",
    organ_needed: "kidney",
    urgency_level: "moderate",
    dialysis: "no",
    conditions: "",
    hasMedicalRecord: "yes",
    medicalRecordFile: null,
    requiresDiagnosis: false,
    signatureFile: null,
    appointmentDate: "2026-07-23",
    appointmentTime: "09:00 AM - 10:00 AM",
    doctorSpecialty: "Nephrologist (Kidney)",
  });

  // Donor Pledge & Signature Form States
  const [donorPledge, setDonorPledge] = useState({
    bloodType: "O-",
    isBlood: true,
    organs: ["kidney", "cornea"],
    ageConsent: false,
    signatureName: "",
  });
  const [anchoringPledge, setAnchoringPledge] = useState(false);
  const [pledgeAnchor, setPledgeAnchor] = useState(null);
  const [pledgeError, setPledgeError] = useState("");

  // ---------- STEP 1: Role selection ----------
  const choosePortal = (portalId) => {
    setPendingRole(portalId);
    setStep(STEPS.AUTH_CHOICE);
    navigate(`/onboarding/${portalId}`);
  };

  // ---------- STEP 2: Sign in vs Sign up ----------
  const chooseAuthMode = (mode) => {
    setAuthMode(mode);
    setSsoError("");
    setStep(STEPS.SSO_PENDING);
  };

  // Quick Demo Sign-In: bypasses the live eGov network and liveness steps,
  // and lands the user straight into a verified dashboard with a fake profile.
  // This is intended only for the live demo (when an evaluator doesn't have an
  // active eGov account or partner credentials) — per DEMO_GUIDE.md.
  const handleDemoSignIn = () => {
    setSsoLoading(true);
    setSsoError("");
    // Simulate a fast eGov round-trip
    setTimeout(() => {
      const demoProfile =
        pendingRole === "recipient"
          ? {
              first_name: "Carlos",
              last_name: "Santos",
              email: "[email protected]",
              mobile: "+639170000001",
              pcn: "9284-1029-4810",
              birth_date: "1985-04-12",
            }
          : {
              first_name: "Maria",
              last_name: "Reyes",
              email: "[email protected]",
              mobile: "+639170000002",
              pcn: "1092-7654-3320",
              birth_date: "1992-09-08",
            };
      setUserProfile(demoProfile);
      setTier("Sample identity · Demo only");
      setVerified(true);
      setSsoLoading(false);
      toast.success(
        "Sample identity loaded. No government identity was verified.",
        { title: "Quick Demo Sign-In" },
      );
      finishRole(pendingRole);
    }, 600);
  };

  // ---------- STEP 3: eGov SSO (exchange_code -> access_token -> profile) ----------
  const handleSsoSubmit = async (e) => {
    e.preventDefault();
    if (!exchangeCode.trim()) {
      setSsoError(
        "Paste the demo exchange code supplied by the presenter, then try again.",
      );
      return;
    }
    setSsoLoading(true);
    setSsoError("");
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
      setTier("Sample identity · Demo only");
      toast.success(
        "Sample profile loaded. No government identity was verified.",
        { title: "Demo exchange complete" },
      );
      setStep(STEPS.LIVENESS);
    } catch {
      setSsoError(
        "We could not complete the demo sign-in. Check the exchange code and try again.",
      );
      toast.error(
        "We could not complete the demo sign-in. Check the exchange code and try again.",
        { title: "Sign-in Error" },
      );
    } finally {
      setSsoLoading(false);
    }
  };

  // ---------- STEP 4: Face Liveness (create session -> popup -> poll result) ----------
  const startLivenessCheck = async () => {
    setLivenessStage(1);
    setLivenessMessage("Opening the demo face-check window...");
    try {
      const callbackUrl = `${window.location.origin}${window.location.pathname}#liveness-complete`;
      const session = await egovApi.createLivenessSession({ callbackUrl });
      setLivenessSession(session);

      livenessPopupRef.current = window.open(
        session.url,
        "eGovLiveness",
        "width=480,height=640,noopener",
      );

      setLivenessStage(2);
      setLivenessMessage("Waiting for the demo face check...");

      const result = await egovApi.pollLivenessResult(session.token);

      if (livenessPopupRef.current && !livenessPopupRef.current.closed) {
        livenessPopupRef.current.close();
      }

      if (result.status === "SUCCEEDED" && result.confidence_score >= 95.0) {
        setLivenessStage(3);
        setLivenessMessage(
          "Demo face check complete. No government identity was verified.",
        );
        setVerified(true);
        toast.success("Demo face check complete", {
          title: "Demo step complete",
        });

        setTimeout(() => {
          if (authMode === "signin") {
            // Existing account: go straight into the chosen portal
            finishRole(pendingRole);
          } else {
            // New account: finish role-specific registration
            setStep(
              pendingRole === "recipient"
                ? STEPS.RECIPIENT_HEALTH
                : STEPS.DONOR_PLEDGE,
            );
          }
        }, 1200);
      } else {
        setLivenessStage(4);
        setLivenessMessage(
          `Demo face check ${result.status === "SUCCEEDED" ? "did not meet the sample threshold" : "failed"} — select “Retry Liveness Check” to try again.`,
        );
        toast.error("Demo face check did not complete. Retry the demo step.", {
          title: "Retry Required",
        });
      }
    } catch {
      setLivenessStage(4);
      setLivenessMessage(
        "The demo face check could not start or finish. Close any open capture window and try again.",
      );
      toast.error(
        "The demo face check could not start or finish. Close any open capture window and try again.",
        { title: "Liveness Error" },
      );
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
      toast.error("Please upload your e-signature document", {
        title: "Signature Required",
      });
      return;
    }
    finishRole("recipient");
    toast.success("Health declaration submitted", { title: "Registered" });
  };

  // ---------- STEP 5b: Donor Organ Pledge Submit (sign-up only) ----------
  const handleDonorPledgeSubmit = async (e) => {
    e.preventDefault();
    if (!donorPledge.ageConsent || !donorPledge.signatureName.trim()) return;

    setAnchoringPledge(true);
    setPledgeError("");
    try {
      const r = await api.anchorConsent({
        matchId: "pledge-" + Date.now(),
        donorId: "donor-onboarding-001",
        recipientId: "system-registry",
        donorSignature: "sig_pledge_" + donorPledge.signatureName.trim(),
        recipientSignature: "sig_system",
      });
      setPledgeAnchor(r.data);
      setTimeout(() => {
        setAnchoringPledge(false);
        finishRole("donor");
        toast.success("Demo pledge recorded.", { title: "Demo Pledge Saved" });
      }, 1800);
    } catch {
      setPledgeError(
        "We could not save the demo pledge. Check the service connection and try again.",
      );
      setAnchoringPledge(false);
      toast.error(
        "We could not save the demo pledge. Check the service connection and try again.",
        { title: "Try Again" },
      );
    }
  };

  const handleSignOut = () => {
    setRole(null);
    setPendingRole(null);
    setAuthMode(null);
    setStep(STEPS.ROLE_SELECT);
    setVerified(false);
    setUserProfile(null);
    setExchangeCode("");
    setSsoError("");
    setLivenessSession(null);
    setLivenessStage(0);
    setPledgeAnchor(null);
    navigate("/", { replace: true });
    toast.info("Signed out successfully", { title: "Signed Out" });
  };

  const goBackTo = (targetStep) => setStep(targetStep);

  const citizenDashboard = (expectedRole, Dashboard, dashboardProps) => {
    if (!role) return <Navigate to="/" replace />;
    if (role !== expectedRole) return <Navigate to={`/${role}`} replace />;

    return (
      <>
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
        <Suspense
          fallback={
            <main id="main-content" tabIndex={-1} className="page-content">
              <div role="status" aria-live="polite">
                Loading your care journey...
              </div>
            </main>
          }
        >
          <Dashboard {...dashboardProps} />
        </Suspense>
      </>
    );
  };

  return (
    <>
      <Routes>
        <Route path="/staff-sign-in" element={<StaffSignIn />} />
        <Route path="/hospital-dashboard" element={<HospitalRoute />} />
        <Route
          path="/recipient"
          element={citizenDashboard("recipient", RecipientDashboard, {
            consentSigned,
            setConsentSigned,
            onboardingHealth: recipientHealth,
          })}
        />
        <Route
          path="/donor"
          element={citizenDashboard("donor", DonorDashboard, {
            consentSigned,
            setConsentSigned,
            onboardingPledge: donorPledge,
          })}
        />
        <Route path="/" element={<PublicLanding role={role} />} />
        <Route
          path="/onboarding/:role"
          element={
            onboardingRole !== "recipient" && onboardingRole !== "donor" ? (
              <Navigate to="/" replace />
            ) : (
              <>
                <a href="#main-content" className="skip-link">
                  Skip to main content
                </a>
                <Navbar
                  currentRole={null}
                  verified={verified}
                  tier={tier}
                  userProfile={userProfile}
                  onSignOut={handleSignOut}
                  showStaffEntry={!role && step === STEPS.ROLE_SELECT}
                />
                <main
                  id="main-content"
                  tabIndex={-1}
                  className="page-content onboarding-shell"
                >
                  <div className="container onboarding-container">
                    <div className="card anim-up onboarding-card">
                      {step !== STEPS.LIVENESS &&
                        step !== STEPS.ROLE_SELECT && (
                          <div className="onboarding-heading">
                            <div className="onboarding-mark">e</div>
                        <h1 id="onboarding-heading" tabIndex={-1}>eBuhay Citizen Onboarding</h1>
                            <p>
                              Prototype flow showing a sample eGov exchange and
                              face-check step.
                            </p>
                          </div>
                        )}

                      {/* STEP 1: ROLE SELECT */}
                      {step === STEPS.ROLE_SELECT && (
                        <RoleSelectCard choosePortal={choosePortal} />
                      )}

                      {/* STEP 2: AUTH CHOICE */}
                      {step === STEPS.AUTH_CHOICE && (
                        <AuthChoiceCard
                          pendingRole={pendingRole}
                          chooseAuthMode={chooseAuthMode}
                          onBack={() => navigate("/")}
                        />
                      )}

                      {/* STEP 3: SSO EXCHANGE */}
                      {step === STEPS.SSO_PENDING && (
                        <Suspense
                          fallback={
                            <div role="status" aria-live="polite">
                              Loading sign-in…
                            </div>
                          }
                        >
                          <EgovSsoForm
                            pendingRole={pendingRole}
                            authMode={authMode}
                            exchangeCode={exchangeCode}
                            setExchangeCode={setExchangeCode}
                            ssoError={ssoError}
                            ssoLoading={ssoLoading}
                            onSubmit={handleSsoSubmit}
                            onDemoSignIn={handleDemoSignIn}
                            onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                          />
                        </Suspense>
                      )}

                      {/* STEP 4: FACE LIVENESS */}
                      {step === STEPS.LIVENESS && (
                        <Suspense
                          fallback={
                            <div role="status" aria-live="polite">
                              Loading face-check…
                            </div>
                          }
                        >
                          <FaceLivenessCheck
                            livenessStage={livenessStage}
                            setLivenessStage={setLivenessStage}
                            livenessMessage={livenessMessage}
                            onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                          />
                        </Suspense>
                      )}

                      {/* STEP 5a: RECIPIENT HEALTH DECLARATION (sign-up only) */}
                      {step === STEPS.RECIPIENT_HEALTH && (
                        <Suspense
                          fallback={
                            <div role="status" aria-live="polite">
                              Loading health form…
                            </div>
                          }
                        >
                          <RecipientHealthForm
                            recipientHealth={recipientHealth}
                            setRecipientHealth={setRecipientHealth}
                            onSubmit={handleRecipientHealthSubmit}
                            onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                          />
                        </Suspense>
                      )}

                      {/* STEP 5b: DONOR ORGAN PLEDGE (sign-up only) */}
                      {step === STEPS.DONOR_PLEDGE && (
                        <Suspense
                          fallback={
                            <div role="status" aria-live="polite">
                              Loading pledge form…
                            </div>
                          }
                        >
                          <DonorPledgeForm
                            donorPledge={donorPledge}
                            setDonorPledge={setDonorPledge}
                            onSubmit={handleDonorPledgeSubmit}
                            onBack={() => goBackTo(STEPS.AUTH_CHOICE)}
                            anchoringPledge={anchoringPledge}
                            pledgeAnchor={pledgeAnchor}
                            pledgeError={pledgeError}
                          />
                        </Suspense>
                      )}
                    </div>
                  </div>
                </main>
              </>
            )
          }
        />
      </Routes>
      <FloatingAIChat />
    </>
  );
}
