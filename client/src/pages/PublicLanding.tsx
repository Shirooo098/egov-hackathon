import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import "../styles/components/public-landing.css";

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  gsap.registerPlugin(ScrollTrigger);
}

const actions = [
  {
    to: "/onboarding/recipient",
    label: "I need transplant support",
    variant: "recipient",
  },
  {
    to: "/onboarding/donor",
    label: "I want to become a donor",
    variant: "donor",
  },
];

const journeyRows = [
  {
    step: "1",
    title: "Share your starting point",
    description:
      "Tell the coordination team what support you or your family need.",
  },
  {
    step: "2",
    title: "Coordinate the details",
    description:
      "Milestones, consultations, and intake follow-ups stay visible.",
  },
  {
    step: "3",
    title: "Hospital teams decide",
    description:
      "Clinical reviews, clearance, and appointments remain strictly doctor-led.",
  },
];

const roleCards = [
  {
    role: "recipient",
    badge: "Transplant Care",
    title: "Recipient Coordination",
    description:
      "For individuals and families seeking transplant support, case tracking, and medical review follow-up.",
    steps: [
      "Share your health context and support needs",
      "Review milestones with your coordinator",
      "Receive updates directly from hospital care teams",
    ],
    to: "/onboarding/recipient",
    link: "Start as a recipient →",
  },
  {
    role: "donor",
    badge: "Living & Blood Giving",
    title: "Donor Coordination",
    description:
      "For citizens exploring blood donation drives or considering living organ donation for someone in need.",
    steps: [
      "Indicate your interest and donation preferences",
      "Coordinate preliminary health screenings",
      "Hospital clinical teams guide medical evaluation",
    ],
    to: "/onboarding/donor",
    link: "Start as a donor →",
  },
];

const governancePillars = [
  {
    role: "Citizen",
    subtitle: "Ang Mamamayan",
    desc: "Maintains private donor or recipient profiles, completes preliminary health intake, and tracks milestone progress.",
  },
  {
    role: "Coordinator",
    subtitle: "Ang Kawani ng eBuhay",
    desc: "Facilitates communication, schedules intake follow-ups, and organizes records without making clinical decisions.",
  },
  {
    role: "Hospital Doctor",
    subtitle: "Ang Dalubhasang Medikal",
    desc: "Authoritative medical professionals who conduct clinical evaluations, order lab work, and make final clearance decisions.",
  },
];

type PortalRole = "recipient" | "donor";
type PublicLandingProps = { role: PortalRole | null };

export default function PublicLanding({ role }: PublicLandingProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const narrativeRef = useRef<HTMLDivElement>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);

  useGSAP(
    () => {
      if (typeof window.matchMedia !== "function") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".landing-hero .landing-reveal", {
          opacity: 0,
          y: 28,
          duration: 0.8,
          stagger: 0.08,
          ease: "power2.out",
        });
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".landing-media",
              start: "top 80%",
              end: "bottom 20%",
              scrub: true,
            },
          })
          .fromTo(
            ".landing-media-image",
            { scale: 0.82, opacity: 0.2 },
            { scale: 1, opacity: 1, duration: 0.55, ease: "none" },
          )
          .to(".landing-media-image", {
            scale: 0.94,
            opacity: 0.2,
            filter: "grayscale(1) brightness(.55)",
            duration: 0.45,
            ease: "none",
          });
        if (narrativeRef.current) {
          gsap.to(narrativeRef.current.querySelectorAll("span"), {
            opacity: 1,
            stagger: 0.05,
            ease: "none",
            scrollTrigger: {
              trigger: narrativeRef.current,
              start: "top 80%",
              end: "bottom 45%",
              scrub: true,
            },
          });
        }
      });
      return () => mm.revert();
    },
    { scope: pageRef },
  );

  return (
    <div className="landing-page" ref={pageRef}>
      <a href="#landing-main" className="skip-link">
        Skip to main content
      </a>

      <header className="landing-header">
        <div className="landing-header-stripe" aria-hidden="true" />
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="eBuhay home">
            <span className="landing-brand-name">eBuhay</span>
          </Link>
          <nav
            className="landing-header-nav"
            aria-label="Landing page sections"
          >
            <a href="#how-it-works">How it works</a>
            <a href="#who-does-what">Who does what</a>
            <a href="#prototype-status">Prototype limits</a>
          </nav>
          <Link className="landing-staff-link" to="/staff-sign-in">
            <span className="landing-staff-label">Staff demo</span>
            <span className="landing-sr-only">Simulated staff demo</span>
          </Link>
        </div>
      </header>

      <main id="landing-main" className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-heading">
          <div className="landing-hero-copy landing-reveal">
            <h1 id="landing-heading" tabIndex={-1}>
              A clearer path
              <br /> through transplant coordination
            </h1>
            <p className="landing-lede">
              Move from uncertainty to a clear next step with a civic team that
              keeps your care journey visible, considered, and coordinated.
            </p>
            <span className="landing-sr-only">
              Connecting people, Donors, and care teams through one guided
              journey. This intended-pilot prototype is for invited testers and
              uses synthetic records and simulated hospital steps.
              Invited-tester prototype. Connecting recipients, donors, and
              coordination teams through one guided journey.
            </span>

            {role && (
              <div className="landing-continue" role="status">
                <span>Returning to your {role} journey?</span>
                <Link
                  to={`/${role}`}
                  className="landing-button landing-button-primary"
                >
                  Open {role} dashboard
                </Link>
              </div>
            )}

            <nav
              className="landing-actions"
              aria-label="Start a citizen journey"
            >
              {actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`landing-button landing-button-${action.variant}`}
                >
                  {action.label}
                </Link>
              ))}
            </nav>
            <div className="landing-preview" aria-hidden="true" hidden></div>

            <p className="landing-note">
              <strong>Notice:</strong> Prototype with synthetic records. All
              records, hospital, blood, and transplant workflows are synthetic.
              Coordinators manage operational follow-up; authorized hospital
              clinical teams evaluate and decide all medical outcomes.
            </p>
          </div>

          <aside
            className="landing-journey landing-reveal"
            aria-label="Your care journey preview"
          >
            <h2 className="landing-journey-title">
              One calm view of what comes next
            </h2>
            <div className="landing-journey-timeline">
              {journeyRows.map((row) => (
                <div className="landing-journey-row" key={row.step}>
                  <div className="landing-journey-dot" aria-hidden="true">
                    {row.step}
                  </div>
                  <div className="landing-journey-content">
                    <strong className="landing-journey-row-title">
                      {row.title}
                    </strong>
                    <p className="landing-journey-row-desc">
                      {row.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section
          className="landing-trust"
          aria-label="Institutional trust and governance"
        >
          <div className="landing-trust-inner">
            <div className="landing-trust-item">
              <span className="landing-trust-label">
                Civic Identity Alignment
              </span>
              <p className="landing-trust-desc">
                Invited testers enter a clearly synthetic access flow; no live
                identity is verified.
              </p>
            </div>
            <div className="landing-trust-item">
              <span className="landing-trust-label">
                Hospital Clinical Authority
              </span>
              <p className="landing-trust-desc">
                Simulated hospital clinical teams retain authority over every
                medical decision in this demo.
              </p>
            </div>
            <div className="landing-trust-item">
              <span className="landing-trust-label">
                Transparent Milestones
              </span>
              <p className="landing-trust-desc">
                One synthetic account keeps donor and recipient journeys visible
                for invited testing.
              </p>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="landing-process"
          aria-labelledby="process-heading"
        >
          <div className="landing-section-header landing-reveal">
            <h2 id="process-heading">Two paths. One coordinated journey.</h2>
            <p className="landing-section-desc">
              Choose the starting point that fits you. Citizens can maintain
              both donor and recipient cases under one synthetic demo account.
            </p>
          </div>

          <nav
            className="landing-role-cards landing-accordion"
            aria-label="Citizen journey pathways"
          >
            {roleCards.map((card) => (
              <details
                className={`landing-role-card landing-role-card-${card.role}`}
                key={card.role}
                open
              >
                <summary className="landing-role-header">
                  <span
                    className={`landing-role-badge landing-role-badge-${card.role}`}
                  >
                    {card.badge}
                  </span>
                  <h3>{card.title}</h3>
                </summary>
                <p className="landing-role-desc">{card.description}</p>
                <ol className="landing-role-steps">
                  {card.steps.map((step, index) => (
                    <li key={step}>
                      <span
                        className="landing-role-step-num"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </nav>
        </section>

        <section
          id="what-happens-next"
          className="landing-governance"
          aria-labelledby="governance-heading"
        >
          <span id="who-does-what" aria-hidden="true" />
          <div className="landing-section-header">
            <h2 id="governance-heading">Who does what in eBuhay</h2>
            <p className="landing-section-desc">
              Clear roles ensure patients and donors receive accountable support
              while clinical judgments stay strictly with authorized hospital
              physicians.
            </p>
          </div>

          <div
            className="landing-marquee"
            aria-label="Synthetic prototype scope"
          >
            <div
              className={`landing-marquee-track${marqueePaused ? " is-paused" : ""}`}
            >
              SYNTHETIC ACCESS · SIMULATED HOSPITAL STEPS · COORDINATOR-LED
              FOLLOW-UP · NO LIVE MATCHING · SYNTHETIC ACCESS · SIMULATED
              HOSPITAL STEPS · COORDINATOR-LED FOLLOW-UP · NO LIVE MATCHING
              ·{" "}
            </div>
            <button
              type="button"
              className="landing-marquee-toggle"
              aria-pressed={marqueePaused}
              onClick={() => setMarqueePaused((paused) => !paused)}
            >
              {marqueePaused ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="landing-governance-grid">
            {governancePillars.map((pillar) => (
              <div className="landing-governance-card" key={pillar.role}>
                <div className="landing-governance-header">
                  <h3>{pillar.role}</h3>
                  <span className="landing-governance-sub">
                    {pillar.subtitle}
                  </span>
                </div>
                <p className="landing-governance-desc">{pillar.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="landing-media"
            aria-label="A considered coordination journey"
          >
            <div className="landing-media-copy" ref={narrativeRef}>
              {"A considered journey keeps people informed while every medical decision stays with the hospital team."
                .split(" ")
                .map((word) => (
                  <span key={word}>{word} </span>
                ))}
            </div>
            <img
              className="landing-media-image"
              src="https://picsum.photos/seed/care-pathway/1200/760"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="landing-sr-only">
            <h3>What happens next</h3>
            <ol className="landing-steps">
              <li>You share your intent</li>
              <li>Coordination Team follows up</li>
              <li>Authorized hospital staff review</li>
            </ol>
          </div>
        </section>

        <section className="landing-action" aria-labelledby="action-heading">
          <div className="landing-action-inner">
            <h2 id="action-heading">Choose your next step.</h2>
            <p>
              This invited synthetic prototype gives you a clear place to begin;
              clinical decisions remain with authorized hospital teams.
            </p>
            <nav
              className="landing-closing-actions"
              aria-label="Begin a synthetic citizen journey"
            >
              <Link
                className="landing-button landing-button-recipient"
                to="/onboarding/recipient"
              >
                I need transplant support
              </Link>
              <Link
                className="landing-button landing-button-donor"
                to="/onboarding/donor"
              >
                I want to become a donor
              </Link>
            </nav>
          </div>
        </section>
      </main>

      <footer id="prototype-status" className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <p className="landing-footer-sub">
              Philippine Hospital-Integrated Donation Coordination Prototype
            </p>
          </div>
          <div className="landing-footer-limits">
            <strong>Prototype Scope & Limits</strong>
            <p>
              eBuhay never matches, ranks, or decides eligibility, and never
              grants clinical clearance. All records, hospital, blood, and
              transplant workflows are synthetic; operational follow-up is
              coordinated by staff.{" "}
              <span className="landing-sr-only">
                synthetic or simulated; does not provide clinical clearance;
                does not automatically match people; not emergency care or
                medical advice
              </span>{" "}
              It does not verify live identity, decide compatibility, claim
              confirmed hospital integration, or provide emergency care or
              medical advice.
            </p>
            <p className="landing-footer-emergency">
              <strong>Emergency Notice:</strong> If you or a loved one are
              experiencing an acute medical emergency, please call{" "}
              <strong>911</strong> or visit your nearest hospital emergency
              department immediately.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
