import "../../styles/components/onboarding/OnboardingStepCards.css";
import React from "react";
import { HeartIcon, DropIcon } from "../../components/ui/Icons";
import Stepper from "./Stepper";

type PortalRole = "recipient" | "donor";
type RoleCard = {
  id: PortalRole;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge: string;
};

export function RoleSelectCard({
  choosePortal,
}: {
  choosePortal: (role: PortalRole) => void;
}) {
  return (
    <div className="anim-in">
      <p className="hero-eyebrow">eBuhay demo / prototype</p>
      <h1 className="onboarding-hero-title">
        Connecting people, Donors, and care teams through one guided journey.
      </h1>
      <p className="onboarding-hero-copy">
        Choose your starting path to begin the guided citizen journey.
      </p>
      <Stepper active={1} />
      <div className="role-pick-grid migrated-918d2990">
        {(
          [
            {
              id: "recipient",
              title: "Recipient Portal",
              desc: "Review a demo request for blood or organ support and choose a sample consultation slot.",
              icon: <HeartIcon size={24} />,
              badge: "primary",
              action: "Request Care",
            },
            {
              id: "donor",
              title: "Donor Portal",
              desc: "Review a demo donation pledge and upload a sample consent document.",
              icon: <DropIcon size={24} />,
              badge: "success",
              action: "Pledge Donation",
            },
          ] as (RoleCard & { action: string })[]
        ).map((item) => (
          <button
            key={item.id}
            aria-label={`${item.title} — ${item.desc}`}
            onClick={() => choosePortal(item.id)}
            className={`card card-interactive role-card role-card-${item.id} migrated-94421d05`}
          >
            <div className="role-card-icon migrated-5cae9bad">{item.icon}</div>
            <div>
              <div className="migrated-6259269e">
                <strong className="migrated-fec80a53">{item.title}</strong>
                <span className={`badge badge-${item.badge} migrated-a607aaa0`}>
                  {item.action}
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
