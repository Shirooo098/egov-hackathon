import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import FloatingAIChat from "./components/ui/FloatingAIChat";
import {
  Navigate,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import PublicLanding from "./pages/PublicLanding";
import { egovApi } from "./services/egovApi";
import { useToast } from "./context/ToastContext";
import { useMatch } from "./context/MatchContext";
import { AuthProvider, sessionRole, useAuth } from "./context/AuthContext";
import { MatchProvider } from "./context/MatchContext";
import {
  RoleSelectCard,
  AuthChoiceCard,
} from "./features/onboarding/OnboardingStepCards";
import StaffSignIn from "./features/hospital/StaffSignIn";
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

const errorField = (error: unknown, field: "status" | "message"): unknown =>
  typeof error === "object" && error !== null
    ? (error as Record<string, unknown>)[field]
    : undefined;
type PortalRole = "recipient" | "donor";
type LivenessSession = { token: string; url: string };
type RecipientHealth = {
  request_type: string;
  blood_type_needed: string;
  organ_needed: string;
  urgency_level: string;
};
type DonorPledge = {
  bloodType: string;
  isBlood: boolean;
  organs: string[];
  ageConsent: boolean;
};

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
  const { session, restored, signOut } = useAuth()!;
  const account = session?.account;
  const staffRoles = [
    "coordinator",
    "doctor",
    "clinical_lead",
    "hospital_admin",
    "scheduler",
    "supervisor",
  ];
  if (!restored) {
    return (
      <main id="main-content" tabIndex={-1} className="page-content">
        <div role="status" aria-live="polite">
          Restoring your secure staff session…
        </div>
      </main>
    );
  }
  if (!account || !staffRoles.includes(account.role))
    return <Navigate to="/staff-sign-in" replace />;

  return (
    <>
      <p className="sr-only" aria-label="Signed-in hospital staff">
        Signed in as{" "}
        {typeof account.displayName === "string"
          ? account.displayName
          : "Invited hospital staff"}
      </p>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar
        currentRole={null}
        verified={true}
        tier={`${typeof account.displayName === "string" ? account.displayName : "Invited hospital staff"} · synthetic records`}
        userProfile={null}
        onSignOut={async () => {
          await signOut();
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

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { consentSigned, setConsentSigned, saveIntake } = useMatch();
  const { session, restored, redeemInvitation, signOut } = useAuth()!;

  // Which portal the person is heading into, chosen before auth
  const [pendingRole, setPendingRole] = useState<PortalRole | null>(null);
  const [role, setRole] = useState<PortalRole | null>(null);
  const [step, setStep] = useState(STEPS.ROLE_SELECT);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const onboardingRole = location.pathname.match(
    /^\/onboarding\/([^/]+)$/,
  )?.[1];
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    if (onboardingRole === "recipient" || onboardingRole === "donor") {
      setPendingRole(onboardingRole);
      const searchParams = new URLSearchParams(location.search);
      const modeParam = searchParams.get("mode");
      if (modeParam === "signup") {
        setAuthMode("signup");
      } else if (modeParam === "signin") {
        setAuthMode("signin");
      }
      setStep(STEPS.SSO_PENDING);
    }
  }, [onboardingRole, location.search]);
  useLayoutEffect(() => {
    if (onboardingRole && step !== STEPS.ROLE_SELECT) {
      document.getElementById("onboarding-heading")?.focus();
    }
  }, [onboardingRole, step]);
  useLayoutEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;
    if (location.pathname === "/" && previousPath !== "/") {
      document.getElementById("landing-heading")?.focus();
    }
  }, [location.pathname]);

  const finishRole = (nextRole: PortalRole) => {
    setRole(nextRole);
    navigate(`/${nextRole}`);
  };

  const [verified, setVerified] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [tier, setTier] = useState("");
  const [userProfile, setUserProfile] = useState<Record<
    string,
    unknown
  > | null>(null);

  // The eGov account is authorized as a citizen; the portal role is the
  // selected case context and may be either donor or recipient.
  const accountRole = sessionRole(session);

  const [invitationToken, setInvitationToken] = useState("");
  const [ssoError, setSsoError] = useState("");

  // Liveness state
  const [livenessSession, setLivenessSession] =
    useState<LivenessSession | null>(null);
  const [livenessStage, setLivenessStage] = useState(0); // 0 idle, 1 waiting on popup, 2 polling, 3 success, 4 fail
  const [livenessMessage, setLivenessMessage] = useState(
    "Preparing the demo face-check session...",
  );
  const livenessPopupRef = useRef<Window | null>(null);

  // Recipient Health Form States
  const [recipientHealth, setRecipientHealth] = useState<RecipientHealth>({
    request_type: "organ",
    blood_type_needed: "A+",
    organ_needed: "kidney",
    urgency_level: "moderate",
  });

  // Minimum donor intake state. Consent artifacts and signatures are excluded.
  const [donorPledge, setDonorPledge] = useState<DonorPledge>({
    bloodType: "O-",
    isBlood: true,
    organs: ["kidney"],
    ageConsent: false,
  });
  const [anchoringPledge, setAnchoringPledge] = useState(false);
  const [pledgeError, setPledgeError] = useState("");

  const saveRoleIntake = async (intakeRole: PortalRole) => {
    try {
      if (intakeRole === "recipient") {
        await saveIntake("recipient", {
          requestType: recipientHealth.request_type,
          declaredBloodGroup: recipientHealth.blood_type_needed,
          requestedOrgan:
            recipientHealth.request_type === "organ"
              ? recipientHealth.organ_needed
              : null,
          urgency:
            recipientHealth.urgency_level === "moderate"
              ? "routine"
              : recipientHealth.urgency_level,
          state: "active",
        });
        finishRole("recipient");
        toast.success("Health declaration submitted", { title: "Registered" });
      } else {
        await saveIntake("donor", {
          declaredBloodGroup: donorPledge.bloodType,
          pledgedOrgans: donorPledge.organs,
          bloodDonor: donorPledge.isBlood,
          availability: "available",
          state: "active",
        });
        finishRole("donor");
        toast.success("Demo pledge recorded.", { title: "Demo Pledge Saved" });
      }
    } catch (error) {
      if (intakeRole === "recipient")
        toast.error(
          errorField(error, "status") === 409
            ? "This intake changed in another session. Reload and try again."
            : "We could not save the health declaration.",
          { title: "Save failed" },
        );
      else
        setPledgeError(
          errorField(error, "status") === 409
            ? "This pledge changed in another session. Reload and try again."
            : "We could not save the demo pledge.",
        );
      throw error;
    }
  };

  // ---------- STEP 1: Role selection ----------
  const choosePortal = (portalId: PortalRole) => {
    setPendingRole(portalId);
    setStep(STEPS.AUTH_CHOICE);
    navigate(`/onboarding/${portalId}`);
  };

  // ---------- STEP 3: invitation-backed citizen session ----------
  const handleInvitationSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!invitationToken.trim()) {
      setSsoError(
        "Enter the invitation or login token supplied to you, then try again.",
      );
      return;
    }
    setSsoLoading(true);
    setSsoError("");
    try {
      await redeemInvitation(invitationToken.trim());
      setInvitationToken("");
      setVerified(false);
      setUserProfile(null);
      setTier("Invited tester · synthetic records");
      toast.success("Secure invited-tester session started.", {
        title: "Access granted",
      });
      if (authMode === "signup") {
        setStep(STEPS.LIVENESS);
      } else if (pendingRole) {
        finishRole(pendingRole);
      }
    } catch (error) {
      const message =
        typeof errorField(error, "message") === "string"
          ? (errorField(error, "message") as string)
          : "We could not redeem that invitation. It may be expired or already used.";
      setSsoError(message);
      toast.error(message, { title: "Invitation not accepted" });
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
      const liveness = session as LivenessSession;
      setLivenessSession(liveness);

      livenessPopupRef.current = window.open(
        liveness.url,
        "eGovLiveness",
        "width=480,height=640,noopener",
      );

      setLivenessStage(2);
      setLivenessMessage("Waiting for the demo face check...");

      const result = (await egovApi.pollLivenessResult(liveness.token)) as {
        status?: string;
        confidence_score?: number;
      };

      if (livenessPopupRef.current && !livenessPopupRef.current.closed) {
        livenessPopupRef.current.close();
      }

      if (
        result.status === "SUCCEEDED" &&
        Number(result.confidence_score) >= 95.0
      ) {
        setLivenessStage(3);
        setLivenessMessage(
          "Demo face check complete. No government identity was verified.",
        );
        setVerified(true);
        toast.success("Demo face check complete", {
          title: "Demo step complete",
        });

        setTimeout(() => {
          if (authMode === "signup") {
            if (pendingRole === "recipient") setStep(STEPS.RECIPIENT_HEALTH);
            else if (pendingRole === "donor") setStep(STEPS.DONOR_PLEDGE);
            else if (pendingRole) finishRole(pendingRole);
          } else {
            if (pendingRole) finishRole(pendingRole);
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
  const handleRecipientHealthSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    try {
      await saveRoleIntake("recipient");
    } catch {
      /* surfaced above */
    }
  };

  // ---------- STEP 5b: Donor Organ Pledge Submit (sign-up only) ----------
  const handleDonorPledgeSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!donorPledge.ageConsent) return;

    setAnchoringPledge(true);
    setPledgeError("");
    try {
      await saveRoleIntake("donor");
      setAnchoringPledge(false);
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

  const handleSignOut = async () => {
    await signOut();
    setRole(null);
    setPendingRole(null);
    setStep(STEPS.ROLE_SELECT);
    setVerified(false);
    setUserProfile(null);
    setInvitationToken("");
    setSsoError("");
    setLivenessSession(null);
    setLivenessStage(0);
    navigate("/", { replace: true });
    toast.info("Signed out successfully", { title: "Signed Out" });
  };

  const goBackTo = (targetStep: string) => setStep(targetStep);

  const citizenDashboard = (
    expectedRole: PortalRole,
    dashboard: React.ReactNode,
  ) => {
    if (!restored) {
      return (
        <main id="main-content" tabIndex={-1} className="page-content">
          <div role="status" aria-live="polite">
            Restoring your secure session…
          </div>
        </main>
      );
    }
    const hasCitizenAccount = accountRole === "citizen";
    const selectedRole =
      role || (hasCitizenAccount ? expectedRole : accountRole);
    if (!selectedRole) return <Navigate to="/" replace />;
    if (selectedRole !== expectedRole)
      return <Navigate to={`/${selectedRole}`} replace />;

    return (
      <>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navbar
          currentRole={selectedRole}
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
          {dashboard}
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
          element={citizenDashboard(
            "recipient",
            <RecipientDashboard onboardingHealth={recipientHealth} />,
          )}
        />
        <Route
          path="/donor"
          element={citizenDashboard(
            "donor",
            <DonorDashboard onboardingPledge={donorPledge} />,
          )}
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
                            <h1 id="onboarding-heading" tabIndex={-1}>
                              eBuhay Citizen Onboarding
                            </h1>
                            <p>
                              Invited-tester prototype using synthetic records
                              and simulated hospital steps.
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
                          chooseAuthMode={(mode) => {
                            setAuthMode(mode);
                            setStep(STEPS.SSO_PENDING);
                          }}
                          onBack={() => {
                            navigate("/");
                            setPendingRole(null);
                            setStep(STEPS.ROLE_SELECT);
                          }}
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
                            invitationToken={invitationToken}
                            setInvitationToken={setInvitationToken}
                            ssoError={ssoError}
                            ssoLoading={ssoLoading}
                            onSubmit={handleInvitationSubmit}
                            authMode={authMode}
                            setAuthMode={setAuthMode}
                            onBack={() => {
                              if (authMode === "signup") {
                                setStep(STEPS.AUTH_CHOICE);
                              } else {
                                navigate("/");
                                setPendingRole(null);
                                setStep(STEPS.ROLE_SELECT);
                              }
                            }}
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
                            onBack={() => setStep(STEPS.SSO_PENDING)}
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
                            onBack={() => setStep(STEPS.LIVENESS)}
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
                            setDonorPledge={(value) =>
                              setDonorPledge((previous) => ({
                                ...previous,
                                ...value,
                              }))
                            }
                            onSubmit={handleDonorPledgeSubmit}
                            onBack={() => setStep(STEPS.LIVENESS)}
                            savingPledge={anchoringPledge}
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

export default function App() {
  return (
    <AuthProvider>
      <MatchProvider>
        <AppContent />
      </MatchProvider>
    </AuthProvider>
  );
}
