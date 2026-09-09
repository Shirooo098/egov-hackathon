import "../../styles/components/onboarding/OnboardingStepCards.css";
import React from "react";
import { HeartIcon, DropIcon } from "../../components/ui/Icons";
import Stepper from "./Stepper";

const STEPS = [
  { key: "role", label: "Role" },
  { key: "auth", label: "Access" },
  { key: "sso", label: "Demo code" },
  { key: "face", label: "Face check" },
  { key: "profile", label: "Profile" },
];

export function RoleSelectCard({ choosePortal }) {
  return (
    <div className="anim-in">
      <p className="hero-eyebrow">eBuhay demo / prototype</p>
      <h1 className="onboarding-hero-title">
        Connecting people, Donors, and care teams through one guided journey.
      </h1>
      <p className="onboarding-hero-copy">
        Choose how you will begin the demonstrated citizen workflow.
      </p>
      <Stepper steps={STEPS} active={1} />
      <div className="role-pick-grid migrated-918d2990">
        {[
          {
            id: "recipient",
            title: "Recipient Portal",
            desc: "Review a demo request for blood or organ support and choose a sample consultation slot.",
            icon: <HeartIcon size={24} />,
            badge: "primary",
          },
          {
            id: "donor",
            title: "Donor Portal",
            desc: "Review a demo donation pledge and upload a sample consent document.",
            icon: <DropIcon size={24} />,
            badge: "success",
          },
        ].map((item) => (
          <button
            key={item.id}
            aria-label={item.id === "recipient" ? "Recipient" : "Donor"}
            onClick={() => choosePortal(item.id)}
            className={`card card-interactive role-card role-card-${item.id} migrated-94421d05`}
          >
            <div className="role-card-icon migrated-5cae9bad">{item.icon}</div>
            <div>
              <div className="migrated-6259269e">
                <strong className="migrated-fec80a53">{item.title}</strong>
                <span className={`badge badge-${item.badge} migrated-a607aaa0`}>
                  Select
                </span>
              </div>
              <p className="migrated-79418d27">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
export function AuthChoiceCard({ pendingRole, chooseAuthMode, onBack }) {
  return (
    <div className="anim-in">
      <Stepper steps={STEPS} active={2} />
      <div className="migrated-2f55da8d">
        <span>Portal selected:</span>
        <strong className="migrated-bab4ced8">{pendingRole}</strong>
        <button
          type="button"
          className="btn btn-ghost btn-sm migrated-6dac5f26"
          onClick={onBack}
        >
          Change
        </button>
      </div>

      <h3 className="migrated-ca024c9a">Step 2 — Sign In or Sign Up</h3>

      <div className="migrated-9cc65e78">
        <button
          className="btn btn-primary btn-lg btn-full btn-stacked"
          onClick={() => chooseAuthMode("signin")}
        >
          <span className="btn-stacked-title">Sign In with eGov (Demo)</span>
          <span className="btn-caption btn-caption-on-primary">
            Use the demo exchange code supplied by the presenter
          </span>
        </button>
        <button
          className="btn btn-outline btn-lg btn-full btn-stacked"
          onClick={() => chooseAuthMode("signup")}
        >
          <span className="btn-stacked-title">Sign Up with eGov (Demo)</span>
          <span className="btn-caption">
            Walk through the sample profile and consent steps
          </span>
        </button>
      </div>
      <p className="migrated-dc777a65">
        This prototype shows a sample eGov exchange and face check for Recipient
        and Donor citizen journeys. It does not verify a government identity.
      </p>
    </div>
  );
}
