import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/components/public-landing.css";

const actions = [
  { to: "/onboarding/recipient", label: "I need transplant support" },
  { to: "/onboarding/donor", label: "I want to become a donor" },
];
const journeyRows = [
  [
    "1",
    "Share your starting point",
    "Tell the coordination team what support you need.",
  ],
  [
    "2",
    "Coordinate the details",
    "Follow-up stays clear as your case moves forward.",
  ],
  [
    "3",
    "Hospital teams decide",
    "Clinical decisions stay with authorized hospital teams.",
  ],
];
const roleCards = [
  {
    role: "recipient",
    title: "Recipient",
    description: "For people seeking transplant support and a clear next step.",
    steps: [
      "Share your support needs",
      "Review coordination follow-up",
      "Receive hospital-team updates",
    ],
    to: "/onboarding/recipient",
    link: "Start as a recipient →",
  },
  {
    role: "donor",
    title: "Donor",
    description:
      "For people exploring how to offer support to someone in need.",
    steps: [
      "Tell us you’re interested",
      "Coordinate the next conversation",
      "Hospital teams guide clinical steps",
    ],
    to: "/onboarding/donor",
    link: "Start as a donor →",
  },
];

export default function PublicLanding({ role }) {
  const headingRef = useRef(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <>
      <a href="#landing-main" className="skip-link">
        Skip to main content
      </a>
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="eBuhay home">
            eBuhay <span>Prototype</span>
          </Link>
          <Link className="landing-staff-link" to="/staff-sign-in">
            <b>SIMULATED</b> Staff demo
            <span className="landing-sr-only">Simulated staff demo</span>
          </Link>
        </div>
      </header>
      <main id="landing-main" className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-heading">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">A coordinated care journey</p>
            <h1 id="landing-heading" ref={headingRef} tabIndex={-1}>
              A clearer path through transplant coordination
            </h1>
            <p className="landing-lede">
              Move from questions to the next right step with a team that keeps
              your journey visible, considered, and connected.
            </p>
            <span className="landing-sr-only">
              Connecting recipients, donors, and coordination teams through one
              guided journey. This intended-pilot prototype is for invited
              testers and uses synthetic records and simulated hospital steps.
            </span>
            <p className="landing-note">
              Invited-tester prototype with synthetic records and simulated
              steps. Coordinators handle follow-up; authorized hospital teams
              make clinical decisions.
            </p>
            {role && (
              <div className="landing-continue" role="status">
                <span>Returning to your {role} journey?</span>
                <Link to={`/${role}`} className="btn btn-primary btn-sm">
                  Open {role} dashboard
                </Link>
              </div>
            )}
            <nav
              className="landing-actions"
              aria-label="Start a citizen journey"
            >
              {actions.map((action, index) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`landing-button ${index === 0 ? "landing-button-primary" : "landing-button-secondary"}`}
                >
                  {action.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="landing-preview" aria-hidden="true" hidden></div>
          <aside className="landing-journey" aria-label="Your care journey">
            <p className="landing-journey-kicker">Your care journey</p>
            <h2>One calm view of what comes next.</h2>
            {journeyRows.map(([number, title, description]) => (
              <div className="landing-journey-row" key={number}>
                <span className="landing-journey-dot">{number}</span>
                <div>
                  <strong className="landing-journey-title">{title}</strong>
                  <p className="landing-journey-description">{description}</p>
                </div>
              </div>
            ))}
          </aside>
        </section>
        <section className="landing-trust" aria-label="Prototype commitments">
          <div className="landing-trust-inner">
            <span>Invited-tester prototype</span>
            <span>Synthetic records and simulated steps</span>
            <span>Clinical decisions stay with authorized hospital teams</span>
          </div>
        </section>
        <section
          id="process"
          className="landing-process"
          aria-labelledby="process-heading"
        >
          <h2 id="process-heading">Two paths. One coordinated journey.</h2>
          <p>
            Choose the starting point that fits you. You can keep both donor and
            recipient cases under one account.
          </p>
          <nav
            className="landing-role-cards landing-closing-actions"
            aria-label="Start another citizen journey"
          >
            {roleCards.map((card) => (
              <article
                className={`landing-role-card landing-role-card-${card.role}`}
                key={card.role}
              >
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <ol>
                  {card.steps.map((step, index) => (
                    <li key={step}>
                      <i>{`0${index + 1}`}</i>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <Link className="landing-role-link" to={card.to}>
                  {card.link}
                </Link>
              </article>
            ))}
          </nav>
        </section>
        <section
          id="what-happens-next"
          className="landing-sr-only"
          aria-labelledby="legacy-journey-heading"
        >
          <h2 id="legacy-journey-heading">What happens next</h2>
          <ol className="landing-steps">
            <li>You share your intent</li>
            <li>Coordination Team follows up</li>
            <li>Authorized hospital staff review</li>
          </ol>
        </section>
      </main>
      <footer id="prototype-status" className="landing-footer">
        <strong>Prototype limits</strong>
        <p>
          eBuhay never matches, ranks, or decides eligibility, and never grants
          clinical clearance. This demo uses synthetic records and simulated
          steps; follow-up is coordinated by staff.{" "}
          <span className="landing-sr-only">
            synthetic or simulated; does not provide clinical clearance; does
            not automatically match people; not emergency care or medical advice
          </span>{" "}
          It does not verify live identity, decide compatibility, claim
          confirmed hospital integration, or provide emergency care or medical
          advice.
        </p>
      </footer>
    </>
  );
}
