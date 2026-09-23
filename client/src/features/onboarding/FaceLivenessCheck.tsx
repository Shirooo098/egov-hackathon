import "../../styles/components/onboarding/FaceLivenessCheck.css";

type Props = {
  livenessStage?: number;
  setLivenessStage?: (value: number) => void;
  livenessMessage?: string;
  onBack: () => void;
};

export default function FaceLivenessCheck({
  livenessMessage,
  onBack,
}: Props) {
  return (
    <div className="anim-in migrated-7f597a40" data-testid="face-liveness-check">
      <h3 className="migrated-9f19d7d0">Face Liveness Check — Unavailable</h3>
      <div
        className="badge badge-muted"
        style={{ marginBottom: "1rem", display: "inline-block" }}
      >
        Capability Deferred (503)
      </div>
      <p className="migrated-dd39b1f9">
        Official eGov Face Liveness verification is deferred pending verified
        official provider contracts. This service is unavailable and cannot be used
        to verify identity or generate liveness scores.
      </p>

      <div
        className="face-liveness-preview"
        style={{
          borderColor: "var(--danger, #DC2626)",
        }}
      >
        <svg
          width="90"
          height="90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--foreground-subtle)"
          strokeWidth="1.5"
          className="migrated-f73aaf90"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <div
        className="face-liveness-status"
        role="status"
        aria-live="polite"
        style={{
          color: "var(--danger, #DC2626)",
        }}
      >
        {livenessMessage ||
          "Official Face Liveness service is deferred and unavailable. Please retry later after official integration is verified."}
      </div>

      <div className="migrated-1d233a92">
        <button className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
