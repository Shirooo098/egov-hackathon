import "../../styles/components/match/MatchReviewModal.css";
import React from "react";

export default function MatchReviewModal({
  match,
  role,
  consentSigned,
  hospitalApproved = false,
  onClose,
  onAcceptChat,
  onSchedule,
}) {
  const [isMatched, setIsMatched] = React.useState(false);
  const dialogRef = React.useRef(null);
  const closeRef = React.useRef(null);
  React.useEffect(() => {
    if (!match) return undefined;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [
        ...dialog.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const dialog = dialogRef.current;
    dialog?.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog?.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [match, onClose]);
  if (!match) return null;
  const isApproved = hospitalApproved;
  const isRecipientView = role === "recipient";
  const name = consentSigned
    ? isRecipientView
      ? `${match.donor?.first_name || "Juan"} ${match.donor?.last_name || "Dela Cruz"}`
      : match.recipientName || "Ana Reyes"
    : isRecipientView
      ? `Anonymous Donor #${(match.donor?.id || "7C2A").substring(0, 4).toUpperCase()}`
      : "Anonymous Recipient #9C41";
  const bloodType = isRecipientView
    ? match.donor?.blood_type || "O-"
    : match.blood_type || "A+";
  const score = match.compatibilityScore || match.score || 96;
  const scoreColor =
    score >= 85
      ? "var(--emerald)"
      : score >= 65
        ? "var(--sun)"
        : "var(--destructive)";
  const location = isRecipientView
    ? match.donor?.location_city || "Manila City"
    : "Makati City";
  return (
    <div className="anim-in match-review-modal">
      <div
        ref={dialogRef}
        className="card anim-up match-review-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-review-title"
        aria-describedby="match-review-description"
      >
        <div className="match-review-modal__header">
          <div>
            <div
              className={`badge badge-${isRecipientView ? "primary" : "success"} match-review-modal__role-badge`}
            >
              {isRecipientView
                ? "Donor Evaluation"
                : "Recipient Request Review"}
            </div>
            <h2 className="match-review-modal__title" id="match-review-title">
              Match Compatibility Review
            </h2>
          </div>
          <button
            ref={closeRef}
            className="btn btn-ghost btn-sm match-review-modal__close"
            onClick={onClose}
            aria-label="Close match compatibility review"
          >
            ✕
          </button>
        </div>
        <div className="match-review-modal__profile">
          <div
            className={`blood-pill ${isRecipientView ? "blood-pill-organ" : "blood-pill-blood"} match-review-modal__blood`}
          >
            {bloodType}
          </div>
          <div className="match-review-modal__profile-copy">
            <div className="match-review-modal__name">{name}</div>
            <div className="match-review-modal__meta">
              <span>📍 {location} (Nearby)</span>
              <span>·</span>
              <span className="badge badge-verified match-review-modal__identity">
                Demo identity profile
              </span>
            </div>
          </div>
        </div>
        <div className="match-review-modal__metrics">
          <div className="match-review-modal__metric-heading">
            <span>Clinical Compatibility Rating</span>
            <strong style={{ color: scoreColor }}>{score}% Match Index</strong>
          </div>
          <div className="compat-track match-review-modal__track">
            <div
              className="compat-fill match-review-modal__fill"
              style={{ width: `${score}%`, background: scoreColor }}
            />
          </div>
          <div className="grid-2 match-review-modal__metric-grid">
            <div className="match-review-modal__metric">
              <div>ABO/Rh Blood Match</div>
              <strong>100% Compatible</strong>
            </div>
            <div className="match-review-modal__metric">
              <div>Urgency Status</div>
              <strong>{match.urgency || "Moderate"} Need</strong>
            </div>
          </div>
        </div>
        <div
          className="match-review-modal__summary"
          id="match-review-description"
        >
          <div className="match-review-modal__summary-header">
            <div>Clinical Match Summary</div>
            <span
              className={`badge ${isApproved ? "badge-success" : isMatched ? "badge-sun" : "badge-primary"} match-review-modal__summary-badge`}
            >
              {isApproved
                ? "Hospital Demo Review Complete ✓"
                : isMatched
                  ? "Awaiting Hospital Demo Review ⏳"
                  : "Sample Match Evaluation"}
            </span>
          </div>
          {isRecipientView ? (
            <div>
              Sample donor profile with active organ pledges (
              {match.donor?.donor_profile?.organ_pledges?.join(", ") ||
                "Kidney, Cornea"}
              ). Direct messaging opens after the demo review step.
            </div>
          ) : (
            <div>
              Sample recipient profile under demo review. ABO blood type O- is
              shown as a compatibility estimate. Direct messaging opens after
              the demo review step.
            </div>
          )}
        </div>
        {!consentSigned && (
          <div className="match-review-modal__privacy">
            <span>🔒</span>
            <span>
              Citizen name is masked for privacy. The prototype reveals sample
              names after the agreement step; this does not verify identity.
            </span>
          </div>
        )}
        <div className="match-review-modal__actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          {onSchedule && (
            <button
              className="btn btn-outline"
              onClick={() => {
                onClose();
                onSchedule();
              }}
            >
              Clinical Schedule
            </button>
          )}
          {isApproved ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onAcceptChat();
              }}
            >
              Accept &amp; Chat →
            </button>
          ) : !isMatched ? (
            <button
              className="btn btn-primary"
              onClick={() => setIsMatched(true)}
            >
              Match →
            </button>
          ) : (
            <button className="btn btn-outline" disabled>
              🔒 Awaiting Hospital Demo Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
