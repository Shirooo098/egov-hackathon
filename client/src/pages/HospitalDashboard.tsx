import { useEffect, useState } from "react";
import { useMatch } from "../context/MatchContext";
import EGovAIWidget from "../features/hospital/EGovAIWidget";
import OrganAnalytics from "../features/hospital/OrganAnalytics";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ClinicalTriageTab } from "../features/hospital/HospitalTabComponents";
import {
  STATIC_MATCHES,
  URGENCY_BADGES,
  URGENCY_LABELS,
  getLiveMatchAsItem,
  filterMatches,
} from "../services/domain";
import { usePersistedStaticMatches } from "../context/usePersistedStaticMatches";
import {
  ClipIcon,
  ScaleIcon,
  AnalyticsIcon,
  HospitalIcon,
} from "../components/ui/Icons";
import LifecycleStrip from "../features/match/LifecycleStrip";
import { platformApi } from "../services/platformApi";
import CandidateQueue, {
  ReviewerSchedulePanel,
} from "../features/hospital/CandidateQueue";
import PairCoordinationPanel from "../features/match/PairCoordinationPanel";
import DeceasedOfferPanel from "../features/hospital/DeceasedOfferPanel";
import { getRuntimeMode } from "../services/runtimeMode";

type AppointmentRequest = {
  id: string;
  version?: number;
  status: string;
  slotReference?: string;
  responseSource?: string;
  responseAuthorReference?: string;
  respondedAt?: string;
  deliveryStatus?: string;
  deliveryAttempts?: number;
  [key: string]: unknown;
};
type Pair = {
  id: string;
  version?: number;
  state?: string;
  [key: string]: unknown;
};
type ScheduleProposal = { id: string; state?: string; [key: string]: unknown };
type HospitalMatch = import("../services/domain").MatchItem;

export default function HospitalDashboard() {
  const { match, advanceStatus, anchorToBlockchain, resetMatch, platform } =
    useMatch();
  const auth = useAuth(true);
  const { success, warning } = useToast();

  const [tab, setTab] = useState("matches");
  const [appointmentRequests, setAppointmentRequests] = useState<
    AppointmentRequest[]
  >([]);
  const [currentPair, setCurrentPair] = useState<Pair | null>(null);
  const [activeScheduleProposal, setActiveScheduleProposal] =
    useState<ScheduleProposal | null>(null);
  const [staticState, setStaticState] =
    usePersistedStaticMatches(STATIC_MATCHES);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleConsoleReset = async () => {
    setResetting(true);
    try {
      await platformApi.resetSyntheticFixtures();
      success("Synthetic fixtures reset successfully to baseline.", {
        title: "Console Reset Complete",
      });
      setResetMessage(
        "Synthetic fixtures reset successfully. Reloading authoritative hospital data.",
      );
      setResetModalOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      warning(msg, { title: "Reset Failed" });
    } finally {
      setResetting(false);
    }
  };
  useEffect(() => {
    let active = true;
    platformApi
      .appointmentRequestsList()
      .then((response) => {
        if (active)
          setAppointmentRequests((response.data as AppointmentRequest[]) || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (
      !currentPair?.id ||
      typeof platformApi.scheduleProposals !== "function"
    ) {
      setActiveScheduleProposal(null);
      return undefined;
    }
    platformApi
      .scheduleProposals(currentPair.id)
      .then((response) => {
        const data = response.data as
          | { items?: ScheduleProposal[] }
          | undefined;
        if (active)
          setActiveScheduleProposal(
            (data?.items || []).find((item) => item.state === "active") || null,
          );
      })
      .catch(() => {
        if (active) setActiveScheduleProposal(null);
      });
    return () => {
      active = false;
    };
  }, [currentPair?.id, currentPair?.version]);
  useEffect(() => {
    let active = true;
    if (typeof platformApi.currentPair !== "function") return undefined;
    platformApi
      .currentPair()
      .then((response) => {
        if (active) setCurrentPair((response.data as Pair) || null);
      })
      .catch(() => {
        if (active) setCurrentPair(null);
      });
    return () => {
      active = false;
    };
  }, []);
  const handleApproveMatch = (matchId: string) => {
    if (matchId === match.id) {
      advanceStatus("approved");
    } else {
      setStaticState((prev) =>
        prev.map((c) => (c.id === matchId ? { ...c, status: "approved" } : c)),
      );
      success(
        `Demo match ${matchId} approved for the hospital review workflow.`,
        { title: "Demo Review Approved" },
      );
    }
  };

  const handleRejectMatch = (matchId: string) => {
    if (matchId === match.id) {
      advanceStatus("rejected");
    } else {
      setStaticState((prev) =>
        prev.map((c) => (c.id === matchId ? { ...c, status: "rejected" } : c)),
      );
      warning(
        `This demo match was marked declined. No new match search has started.`,
        { title: "Demo Match Declined" },
      );
    }
  };

  const handleAnchor = async () => {
    await anchorToBlockchain();
  };

  const TABS = [
    { id: "matches", label: "Hospital Demo Review", icon: <ClipIcon /> },
    { id: "laws", label: "PH Health Laws AI", icon: <ScaleIcon /> },
    {
      id: "analytics",
      label: "Demo Workflow Analytics",
      icon: <AnalyticsIcon />,
    },
  ];

  // Combine shared live match with static demo items for rich UI table
  const liveMatchAsItem = getLiveMatchAsItem(match);
  const allMatches: HospitalMatch[] = platform.authoritative
    ? []
    : ([liveMatchAsItem, ...staticState] as HospitalMatch[]);
  const { pendingMatches, activeMatches, rejectedMatches } =
    filterMatches(allMatches);

  // Active workflow items = matches already in scheduling or beyond
  const activeProcedureCount =
    allMatches.filter(
      (m) =>
        m.isLiveContext &&
        [
          "scheduled",
          "agreement_finalized",
          "contract_signed",
          "ready_for_transplant",
        ].includes(m.status),
    ).length +
    activeMatches.filter(
      (m) =>
        !m.isLiveContext &&
        [
          "scheduled",
          "agreement_finalized",
          "contract_signed",
          "ready_for_transplant",
        ].includes(m.status),
    ).length;

  // Today's scheduled consultations (rough: count items with date today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const consultationsToday = allMatches.filter((m) => {
    if (!m.scheduledDate) return false;
    const d = new Date(String(m.scheduledDate));
    return d >= today && d < tomorrow;
  }).length;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen dashboard-page"
    >
      <section className="hero care-journey-hero hospital-care-journey">
        <div className="container">
          <div className="hero-eyebrow anim-up dashboard-hero-eyebrow-hospital">
            <HospitalIcon size={14} /> Hospital Console
          </div>
          <h1 className="care-journey-title anim-up-d1">
            Hospital Care Journey
          </h1>
          <ul
            className="care-journey-rail hospital-care-rail anim-up-d3"
            aria-label="Hospital current care facts"
          >
            <li className="care-journey-primary" role="status">
              <span>Pending review</span>
              <strong>{pendingMatches.length}</strong>
            </li>
            <li>
              <span>Approved Matches</span>
              <strong>{activeMatches.length}</strong>
            </li>
            <li>
              <span>Active demo workflows</span>
              <strong>{activeProcedureCount}</strong>
            </li>
            <li>
              <span>Consultations</span>
              <strong>{consultationsToday}</strong>
            </li>
          </ul>
        </div>
      </section>

      {/* Hospital Network Marquee */}
      <div className="dashboard-network-band">
        <div className="marquee-outer">
          <div className="marquee-track dashboard-marquee-track">
            {[
              "NATIONAL KIDNEY INSTITUTE (NKI) · DEMO",
              "PHILIPPINE GENERAL HOSPITAL (PGH) · DEMO",
              "DOH ORGAN DONATION PROGRAM · SAMPLE DATA",
              "Simulated trust registry",
              "Simulated chain 13371",
              "PHILIPPINE HEART CENTER (PHC) · DEMO",
              "LUNG CENTER OF THE PHILIPPINES · DEMO",
            ].map((a, i) => (
              <span key={i} className="marquee-item">
                🏥 {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation (pill nav) */}
      <div className="tab-bar tab-bar-pill">
        <div className="container tab-bar-inner hospital-tab-bar-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              aria-pressed={tab === t.id}
            >
              <span className="tab-btn-icon">{t.icon}</span>
              <span className="tab-btn-label">{t.label}</span>
            </button>
          ))}
          {!platform.authoritative && (
            <button
              onClick={resetMatch}
              className="btn btn-ghost btn-sm hospital-reset-btn"
              title="Reset live demonstration state"
            >
              ↺ Reset Demo State
            </button>
          )}
          {getRuntimeMode() === "synthetic" &&
            auth?.session?.account?.role === "hospital_admin" && (
              <button
                onClick={() => setResetModalOpen(true)}
                className="btn btn-outline btn-sm hospital-admin-reset-btn"
                title="Reset synthetic hospital fixtures (hospital_admin only)"
                style={{
                  color: "var(--color-danger, #e53e3e)",
                  borderColor: "var(--color-danger, #e53e3e)",
                }}
              >
                ⚠ Console Reset (Admin)
              </button>
            )}
        </div>
      </div>

      <div className="page-content dashboard-content-hospital">
        {resetMessage && (
          <p role="status" aria-live="polite" className="container">
            {resetMessage}
          </p>
        )}
        <div className="container">
          {/* TAB 1: HOSPITAL DEMO REVIEW */}
          {tab === "matches" && (
            <>
              <CandidateQueue
                serviceId={
                  (platform.services || []).find(
                    (service) => service.code === "kidney",
                  )?.id
                }
                onSelected={(selectedPair) =>
                  setCurrentPair(selectedPair as Pair)
                }
              />
              <DeceasedOfferPanel />
              <PairCoordinationPanel
                reviewer={Boolean(currentPair?.id)}
                pairId={currentPair?.id}
                currentPair={currentPair}
              />
              <ReviewerSchedulePanel
                pairId={currentPair?.id}
                status={currentPair?.state}
                targetVersion={currentPair?.version}
                supersedesId={activeScheduleProposal?.id}
                onSuccess={() =>
                  platformApi
                    .currentPair?.()
                    .then((response) =>
                      setCurrentPair((response.data as Pair) || currentPair),
                    )
                }
              />
              <div className="card dashboard-section-gap" aria-live="polite">
                <h2>Hospital appointment requests</h2>
                <p>
                  {
                    appointmentRequests.filter(
                      (request) => request.status === "request_pending",
                    ).length
                  }{" "}
                  pending appointment request(s). Delivery retries
                  automatically; only signed Hospital evidence can confirm a
                  booking.
                </p>
                {appointmentRequests.map((request) => (
                  <div key={request.id} className="dashboard-section-gap">
                    <p>
                      <strong>{request.status.replaceAll("_", " ")}</strong>
                      {request.slotReference
                        ? ` · ${request.slotReference}`
                        : ""}
                    </p>
                    <small role="status">
                      Delivery: {request.deliveryStatus || "pending"}
                      {request.deliveryAttempts
                        ? ` · ${request.deliveryAttempts} attempt(s)`
                        : ""}
                    </small>
                    {request.responseSource && (
                      <small>
                        Source: {request.responseSource}; author:{" "}
                        {request.responseAuthorReference ||
                          "hospital scheduler"}
                        ; time: {request.respondedAt || "recorded"}
                      </small>
                    )}
                  </div>
                ))}
              </div>
              {/* Live lifecycle indicator — only show when a citizen-portal match is active */}
              {!platform.authoritative && match && match.id && (
                <div className="dashboard-section-gap">
                  <LifecycleStrip status={match.status} compact />
                </div>
              )}
              {!platform.authoritative && (
                <ClinicalTriageTab
                  pendingMatches={pendingMatches}
                  activeMatches={activeMatches}
                  rejectedMatches={rejectedMatches}
                  match={liveMatchAsItem}
                  handleRejectMatch={handleRejectMatch}
                  handleApproveMatch={handleApproveMatch}
                  handleAnchor={handleAnchor}
                  advanceStatus={advanceStatus}
                  URGENCY_BADGES={URGENCY_BADGES}
                  URGENCY_LABELS={URGENCY_LABELS}
                />
              )}
            </>
          )}

          {/* TAB 2: LAWS AI */}
          {tab === "laws" && (
            <div className="dashboard-narrow-800">
              <EGovAIWidget />
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {tab === "analytics" && <OrganAnalytics role="hospital" />}
        </div>
      </div>

      {resetModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div
            className="modal-content card"
            style={{ maxWidth: "480px", margin: "auto" }}
          >
            <h3
              id="reset-modal-title"
              style={{ color: "var(--color-danger, #e53e3e)" }}
            >
              ⚠ Confirm Synthetic Fixture Reset
            </h3>
            <p>
              This operational mutation resets all simulated hospital fixtures
              and returns the synthetic environment to the known baseline.
            </p>
            <p>
              <strong>Safeguards:</strong> Server-authorized for{" "}
              <code>hospital_admin</code> with CSRF protection and audit
              logging. Strictly disabled outside synthetic mode; there is no
              reset CLI.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setResetModalOpen(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConsoleReset}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Confirm & Reset Fixtures"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-mini">eBuhay prototype · Demo Build</footer>
    </main>
  );
}
