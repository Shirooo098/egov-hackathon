import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/components/public-landing.css";

const actions = [
  { to: "/onboarding/recipient", label: "I need transplant support", tone: "primary" },
  { to: "/onboarding/donor", label: "I want to become a donor", tone: "outline" },
];

export default function PublicLanding({ role }) {
  const headingRef = useRef(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <>
      <a href="#landing-main" className="skip-link">Skip to main content</a>
      <header className="landing-header">
        <div className="container landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="eBuhay home">eBuhay <span>Prototype</span></Link>
          <nav aria-label="Landing page">
            <a href="#how-it-works" onClick={(event) => event.currentTarget.focus()}>How it works</a>
            <a href="#who-does-what" onClick={(event) => event.currentTarget.focus()}>Who does what</a>
            <a href="#prototype-status" onClick={(event) => event.currentTarget.focus()}>Prototype status</a>
            <Link className="landing-staff-link" to="/staff-sign-in">Staff demo</Link>
          </nav>
        </div>
      </header>
      <main id="landing-main" className="landing-main">
        <section className="landing-hero container" aria-labelledby="landing-heading">
          <div>
            <p className="hero-eyebrow">eBuhay demo / prototype · Civic Care Console</p>
            <h1 id="landing-heading" ref={headingRef} tabIndex={-1}>A clearer path through transplant coordination</h1>
            <p className="landing-lede">Connecting people, Donors, and care teams through one guided journey.</p>
            <p className="landing-note">An intended-pilot experience for invited testers, using synthetic records and simulated hospital steps.</p>
            {role && (
              <div className="landing-continue" role="status">
                <strong>Continue your journey</strong>
                <span>Your {role} journey is ready to revisit.</span>
                <Link to={`/${role}`} className="btn btn-primary btn-sm">Open {role} dashboard</Link>
              </div>
            )}
            <div className="landing-actions" aria-label="Start a citizen journey">
              {actions.map((action) => <Link key={action.to} to={action.to} className={`btn btn-lg btn-${action.tone}`}>{action.label}</Link>)}
            </div>
          </div>
          <div className="landing-status-cards" aria-label="Illustrative prototype status">
            <div className="landing-status-card"><span>Illustrative prototype</span><strong>Citizen intake</strong><small>Ready to begin</small></div>
            <div className="landing-status-card"><span>Illustrative prototype</span><strong>Coordination review</strong><small>Team follow-up</small></div>
            <div className="landing-status-card"><span>Illustrative prototype</span><strong>Hospital step</strong><small>Clinical team review</small></div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section container" aria-labelledby="journey-heading">
          <p className="hero-eyebrow">One guided journey</p><h2 id="journey-heading">How it works</h2>
          <div className="landing-steps"><div><b>1. You share your intent</b><p>Choose a citizen journey and provide information in the invited-tester flow.</p></div><div><b>2. Coordination Team follows up</b><p>A Coordinator helps with operational next steps and keeps the journey clear.</p></div><div><b>3. Hospital Clinical Team reviews</b><p>Clinical decisions and hospital outcomes remain with authorized hospital staff.</p></div><div><b>4. Follow-up stays visible</b><p>See coordination milestones without turning a demo record into a medical record.</p></div></div>
        </section>

        <section id="who-does-what" className="landing-section landing-responsibilities container" aria-labelledby="responsibilities-heading">
          <p className="hero-eyebrow">Clear roles, clear boundaries</p><h2 id="responsibilities-heading">Who does what</h2>
          <div className="landing-role-grid"><div><h3>You</h3><p>Choose whether you need support or want to donate, share consent, and decide whether to continue.</p></div><div><h3>Coordination Team</h3><p>Coordinates invitations, conversations, and appointment requests; it does not provide clinical clearance.</p></div><div><h3>Hospital Clinical Team</h3><p>Authorized clinical leads and Doctors own clinical review. Hospital Administration manages staff access.</p></div></div>
        </section>

        <section className="landing-repeat container" aria-labelledby="start-heading"><h2 id="start-heading">Ready when you are</h2><div className="landing-actions">{actions.map((action) => <Link key={action.to} to={action.to} className={`btn btn-lg btn-${action.tone}`}>{action.label}</Link>)}</div></section>
      </main>
      <footer id="prototype-status" className="landing-footer"><div className="container"><h2>Prototype status</h2><p>eBuhay is an intended-pilot prototype for invited testers. Records and integrations here are synthetic or simulated. This demo does not verify live identity, automatically match people, or decide eligibility or compatibility. eBuhay does not provide clinical clearance or confirmed hospital integration.</p><p>This experience is not emergency care or medical advice. For staff demo access, visit <Link to="/staff-sign-in">Staff demo sign-in</Link>.</p></div></footer>
    </>
  );
}
