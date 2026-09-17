import "../../styles/components/onboarding/EgovSsoForm.css";
import React from "react";
import Stepper, {
  ONBOARDING_SIGNIN_STEPS,
  ONBOARDING_SIGNUP_STEPS,
} from "./Stepper";

type Props = {
  pendingRole: string | null;
  invitationToken: string;
  setInvitationToken: (value: string) => void;
  ssoError: string;
  ssoLoading: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  authMode?: "signin" | "signup";
  setAuthMode?: (mode: "signin" | "signup") => void;
};
export default function EgovSsoForm({
  pendingRole,
  invitationToken,
  setInvitationToken,
  ssoError,
  ssoLoading,
  onSubmit,
  onBack,
  authMode = "signin",
  setAuthMode,
}: Props) {
  const steps =
    authMode === "signin" ? ONBOARDING_SIGNIN_STEPS : ONBOARDING_SIGNUP_STEPS;

  return (
    <div className="anim-in">
      <Stepper steps={steps} active={3} />
      <div className="portal-status-bar migrated-2f55da8d">
        <span>
          {pendingRole === "recipient" ? "Recipient" : "Donor"} portal —{" "}
          Invitation access
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm portal-change-btn migrated-6dac5f26"
          onClick={onBack}
          aria-label="Change portal"
        >
          Change
        </button>
      </div>

      {setAuthMode && (
        <div
          className="sso-mode-selector"
          role="group"
          aria-label="Onboarding mode"
        >
          <button
            type="button"
            className={`btn btn-xs ${authMode === "signin" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setAuthMode("signin")}
            aria-pressed={authMode === "signin"}
          >
            Sign In (3-step access)
          </button>
          <button
            type="button"
            className={`btn btn-xs ${authMode === "signup" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setAuthMode("signup")}
            aria-pressed={authMode === "signup"}
          >
            Sign Up (5-step walkthrough)
          </button>
        </div>
      )}

      <h3 className="migrated-1f2c3427">Invitation access</h3>
      <p className="migrated-78d8b799">
        Enter the single-use invitation or login token supplied to you for this
        invited-tester prototype. It creates a secure synthetic citizen session;
        it does not verify a government identity.
      </p>

      <form onSubmit={onSubmit} className="migrated-039dd51e">
        <div className="field">
          <label className="label" htmlFor="invitation-token">
            Invitation or login token
          </label>
          <div className="token-input-wrapper">
            <input
              id="invitation-token"
              className="input token-input"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Paste the token supplied to you"
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
            />
            {typeof navigator !== "undefined" && navigator.clipboard && (
              <button
                type="button"
                className="btn btn-secondary btn-sm token-paste-btn"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setInvitationToken(text.trim());
                  } catch {
                    /* clipboard not accessible */
                  }
                }}
                aria-label="Paste token from clipboard"
              >
                Paste
              </button>
            )}
          </div>
          <p className="token-help-text">
            Demo tokens typically begin with <code>donor-</code> or{" "}
            <code>recipient-</code>.{" "}
            <button
              type="button"
              className="token-fill-sample-btn"
              onClick={() =>
                setInvitationToken(
                  pendingRole === "donor"
                    ? "donor-invitation"
                    : "recipient-invitation",
                )
              }
            >
              Fill demo sample
            </button>
          </p>
        </div>

        {ssoError && (
          <div className="migrated-13ec00a5" role="alert" aria-live="assertive">
            {ssoError}
          </div>
        )}

        <div className="migrated-1d233a92">
          <button
            className="btn btn-ghost migrated-7e90f870"
            type="button"
            onClick={onBack}
            disabled={ssoLoading}
          >
            Back
          </button>
          <button
            className="btn btn-primary migrated-b3730661"
            type="submit"
            disabled={ssoLoading}
          >
            {ssoLoading ? (
              <>
                <span className="spinner migrated-13ae4626" /> Checking
                invitation…
              </>
            ) : (
              "Continue with invitation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
