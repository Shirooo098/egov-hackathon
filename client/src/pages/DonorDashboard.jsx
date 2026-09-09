import React, { useState } from "react";
import ChatBox from "../features/match/ChatBox";
import GovernmentAgreement from "../features/match/GovernmentAgreement";
import ClinicalMatchCard from "../features/match/ClinicalMatchCard";
import LockedTabPanel from "../components/ui/LockedTabPanel";
import LockGlyph from "../components/ui/LockGlyph";
import LiveDot from "../components/ui/LiveDot";
import LifecycleStrip from "../features/match/LifecycleStrip";
import { useToast } from "../context/ToastContext";
import { useMatch } from "../context/MatchContext";
import { DonorProfileTab } from "../features/donor/DonorTabComponents";
import { ALL_ORGANS, BLOOD_TYPES } from "../services/domain";
import { formatStatus } from "../utils/matchStatus";
import {
  UserIcon,
  MatchIcon,
  ChatIcon,
  ChainIcon,
  DropIcon,
} from "../components/ui/Icons";

export default function DonorDashboard({ onboardingPledge }) {
  const { match, hospitalApproved, consentSigned, updateMatchFromProfile } =
    useMatch();
  const [tab, setTab] = useState("mymatch"); // Default to automatic match console upon portal load (Issue #006)
  const [bloodType, setBloodType] = useState(
    () => match.donor?.blood_type || onboardingPledge?.bloodType || "O-",
  );
  const [isBlood, setIsBlood] = useState(
    onboardingPledge?.isBlood !== undefined ? onboardingPledge.isBlood : true,
  );
  const [organs, setOrgans] = useState(() =>
    Array.isArray(match.donor?.organ_pledged)
      ? match.donor.organ_pledged
      : onboardingPledge?.organs || ["kidney", "cornea"],
  );
  const [avail, setAvail] = useState(true);
  const { success, warning } = useToast();

  const handleAvailChange = (valOrFn) => {
    const nextAvail = typeof valOrFn === "function" ? valOrFn(avail) : valOrFn;
    if (
      !nextAvail &&
      !["rejected", "ready_for_transplant"].includes(match.status)
    ) {
      warning(
        "Cannot set availability to offline while clinical evaluation or procedure coordination is in-flight.",
        { title: "Availability Protected", duration: 5000 },
      );
      return;
    }
    setAvail(nextAvail);
  };
  const toggleOrgan = (o) =>
    setOrgans((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));

  const saveProfile = () => {
    const res = updateMatchFromProfile("donor", { bloodType, organs, avail });
    if (!res.success) {
      warning(res.error, { title: "Profile Sync Warning", duration: 5000 });
      return;
    }
    success("Donor profile preferences updated in this demo.", {
      title: "Profile Saved",
      duration: 4000,
    });
  };

  const isAgreementUnlocked = [
    "scheduled",
    "agreement_finalized",
    "contract_signed",
    "ready_for_transplant",
  ].includes(match.status);
  const isChatUnlocked =
    consentSigned ||
    ["agreement_finalized", "contract_signed", "ready_for_transplant"].includes(
      match.status,
    );

  const TABS = [
    {
      id: "profile",
      label: "My Profile",
      shortLabel: "Profile",
      icon: <UserIcon />,
    },
    {
      id: "mymatch",
      label: "My Match",
      shortLabel: "Match",
      icon: <MatchIcon />,
      activeIndicator: true,
    },
    {
      id: "agreement",
      label: "Agreement",
      shortLabel: "Agreement",
      icon: <ChainIcon />,
      locked: !isAgreementUnlocked,
    },
    {
      id: "chat",
      label: "Chat",
      shortLabel: "Chat",
      icon: <ChatIcon />,
      locked: !isChatUnlocked,
    },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-page">
      <section className="hero care-journey-hero donor-care-journey">
        <div className="container">
          <div className="hero-eyebrow anim-up dashboard-hero-eyebrow-donor">
            <DropIcon size={14} /> Donor Portal · Demo profile
          </div>
          <h1 className="care-journey-title anim-up-d1">Donor Care Journey</h1>
          <ul
            className="care-journey-rail anim-up-d3"
            aria-label="Donor current care facts"
          >
            <li className="care-journey-primary" role="status">
              <span>Current Match</span>
              <strong>{formatStatus(match.status)}</strong>
            </li>
            <li>
              <span>Blood type</span>
              <strong>{bloodType}</strong>
            </li>
            <li>
              <span>Pledged organs</span>
              <strong>{organs.length}</strong>
            </li>
            <li>
              <span>Availability</span>
              <strong>{avail ? "Active" : "Off"}</strong>
            </li>
          </ul>
        </div>
      </section>

      {/* Network Marquee */}
      <div className="dashboard-network-band">
        <div className="marquee-outer">
          <div className="marquee-track dashboard-marquee-track">
            {[
              "PHILIPPINE RED CROSS · DEMO",
              "DOH ORGAN DONATION PROGRAM · DEMO",
              "PHILIPPINE GENERAL HOSPITAL (PGH) · DEMO",
              "Simulated trust registry",
              "NATIONAL KIDNEY INSTITUTE (NKI) · DEMO",
              "Sample policy reference",
              "Simulated notification system",
            ].map((a, i) => (
              <span key={i} className="marquee-item">
                🏥 {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* -- Tab Bar (pill nav) -- */}
      <div className="tab-bar tab-bar-pill">
        <div className="container tab-bar-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? " active" : ""}${t.locked ? " locked" : ""}`}
              onClick={() => setTab(t.id)}
              disabled={t.locked}
              aria-label={t.label}
              aria-pressed={tab === t.id}
              title={t.locked ? `${t.label} (locked)` : t.label}
            >
              <span className="tab-btn-icon">{t.icon}</span>
              <span className="tab-btn-label">{t.label}</span>
              {t.activeIndicator && (
                <span className="tab-btn-live">
                  <LiveDot />
                </span>
              )}
              {t.locked && (
                <span className="tab-btn-lock">
                  <LockGlyph size={11} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content dashboard-content">
        <div className="container">
          {/* PROFILE TAB */}
          {tab === "profile" && (
            <DonorProfileTab
              avail={avail}
              setAvail={handleAvailChange}
              bloodType={bloodType}
              setBloodType={setBloodType}
              isBlood={isBlood}
              setIsBlood={setIsBlood}
              organs={organs}
              toggleOrgan={toggleOrgan}
              saveProfile={saveProfile}
              BLOOD_TYPES={BLOOD_TYPES}
              ALL_ORGANS={ALL_ORGANS}
            />
          )}

          {/* MY MATCH TAB (Automated & Interactive Handshake, Issue #006 & #008) */}
          {tab === "mymatch" && (
            <div className="dashboard-narrow-840">
              <div className="dashboard-section-gap">
                <LifecycleStrip status={match.status} />
              </div>
              <ClinicalMatchCard role="donor" onNavigateTab={setTab} />
            </div>
          )}

          {/* AGREEMENT TAB (Issue #009) */}
          {tab === "agreement" && (
            <div className="dashboard-narrow-780">
              {isAgreementUnlocked ? (
                <>
                  <div className="dashboard-section-gap">
                    <LifecycleStrip status={match.status} />
                  </div>
                  <GovernmentAgreement role="donor" />
                </>
              ) : (
                <LockedTabPanel
                  title="Agreement unlocks once a date is set"
                  message="After you and your match agree on a date, the agreement will be ready for both of you to sign."
                  ctaLabel="Go to My Match"
                  onCta={() => setTab("mymatch")}
                />
              )}
            </div>
          )}

          {/* CLINICAL CHAT TAB (Issue #010) */}
          {tab === "chat" && (
            <div className="dashboard-narrow-720">
              <ChatBox
                currentRole="donor"
                consentSigned={isChatUnlocked}
                hospitalApproved={hospitalApproved}
              />
            </div>
          )}
        </div>
      </div>

      <footer className="footer-mini">eBuhay prototype · Demo Build</footer>
    </main>
  );
}
