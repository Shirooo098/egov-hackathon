import React from "react";
import "../../styles/components/onboarding/Stepper.css";

// Horizontal 5-step progress indicator for the onboarding flow.
// `steps` is an array of strings or {label, key}.
// `active` is the 1-based index of the current step (1..N).
// Completed steps show a check; the active step is filled.

function CheckMini({ color = "white" }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export const ONBOARDING_SIGNUP_STEPS = [
  { key: "role", label: "Role" },
  { key: "auth", label: "Access" },
  { key: "sso", label: "Invitation" },
  { key: "face", label: "Face check" },
  { key: "profile", label: "Profile" },
];

export const ONBOARDING_SIGNIN_STEPS = [
  { key: "role", label: "Role" },
  { key: "auth", label: "Access" },
  { key: "sso", label: "Invitation" },
];

export const ONBOARDING_STEPS = ONBOARDING_SIGNUP_STEPS;

type Step = string | { key: string; label: string };
type Props = { steps?: Step[]; active?: number };
export default function Stepper({
  steps = ONBOARDING_STEPS,
  active = 1,
}: Props) {
  return (
    <div className="stepper" role="list" aria-label="Onboarding progress">
      {steps.map((s, i) => {
        const idx = i + 1;
        const key = typeof s === "string" ? s : s.key;
        const label = typeof s === "string" ? s : s.label;
        const isActive = idx === active;
        const isDone = idx < active;
        const isFuture = idx > active;
        return (
          <React.Fragment key={key}>
            <div
              role="listitem"
              aria-current={isActive ? "step" : undefined}
              className="stepper-item"
            >
              <div
                className={`stepper-dot${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                style={{
                  background: isActive
                    ? "var(--primary)"
                    : isDone
                      ? "var(--emerald)"
                      : "var(--background-alt)",
                  border: isFuture ? "1px solid var(--border)" : "none",
                  color:
                    isActive || isDone ? "white" : "var(--foreground-muted)",
                }}
              >
                {isDone ? <CheckMini /> : idx}
              </div>
              <div
                className={`stepper-label${isActive ? " active" : isDone ? " done" : ""}`}
              >
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`stepper-line${idx < active ? " done" : ""}`}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
