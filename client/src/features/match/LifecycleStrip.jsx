import "../../styles/components/match/LifecycleStrip.css";
import React from "react";
import {
  LIFECYCLE_STEPS,
  lifecycleStepIndex,
  formatStatus,
} from "../../utils/matchStatus";

function CheckMini({ color = "white" }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Horizontal 6-step progress strip for the match lifecycle.
// Reads from a `status` prop (a match.status value) or accepts an
// explicit `active` index override.
// `compact` shrinks the strip for embed contexts (e.g. hospital dashboard).
export default function LifecycleStrip({
  status = "pending_hospital_approval",
  active,
  compact = false,
}) {
  const activeIdx =
    typeof active === "number" ? active : lifecycleStepIndex(status);
  const isRejected = status === "rejected";
  const headerLabel = isRejected ? "Match Declined" : formatStatus(status);

  return (
    <div
      className={`lifecycle-strip${compact ? " compact" : ""}`}
      role="group"
      aria-label={`Match lifecycle — currently ${headerLabel}`}
      style={{
        padding: compact ? "10px 14px" : "14px 18px",
        marginBottom: compact ? 0 : 24,
      }}
    >
      <div className="lifecycle-header">
        <div className="lifecycle-title">Match Lifecycle</div>
        <div
          className="lifecycle-status"
          style={{
            color: isRejected ? "var(--destructive)" : "var(--primary)",
          }}
        >
          {headerLabel}
        </div>
      </div>

      <div className="lifecycle-steps">
        {LIFECYCLE_STEPS.map((s, i) => {
          const isActive = i === activeIdx && !isRejected;
          const isDone = i < activeIdx && !isRejected;
          const dotBg = isActive
            ? "var(--primary)"
            : isDone
              ? "var(--emerald)"
              : "var(--background-alt)";
          const labelColor = isActive
            ? "var(--primary)"
            : isDone
              ? "var(--emerald)"
              : "var(--foreground-subtle)";
          return (
            <React.Fragment key={s.key}>
              <div
                className={`lifecycle-step${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                title={s.label}
              >
                <div
                  className="lifecycle-step-dot"
                  aria-hidden="true"
                  style={{
                    background: dotBg,
                    color:
                      isActive || isDone ? "white" : "var(--foreground-muted)",
                    border:
                      !isActive && !isDone ? "1px solid var(--border)" : "none",
                  }}
                >
                  {isDone ? <CheckMini /> : i + 1}
                </div>
                <div
                  className="lifecycle-step-label"
                  style={{ color: labelColor }}
                >
                  {s.label}
                </div>
              </div>
              {i < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className="lifecycle-line"
                  aria-hidden="true"
                  style={{
                    background:
                      i < activeIdx ? "var(--emerald)" : "var(--border)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
