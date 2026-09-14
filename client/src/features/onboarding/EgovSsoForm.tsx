import "../../styles/components/onboarding/EgovSsoForm.css";
import React from "react";
import Stepper from "./Stepper";

const STEPS = [
  { key: "role", label: "Role" },
  { key: "auth", label: "Access" },
  { key: "sso", label: "Invitation" },
  { key: "face", label: "Face check" },
  { key: "profile", label: "Profile" },
];

type Props = {
  pendingRole: string | null;
  invitationToken: string;
  setInvitationToken: (value: string) => void;
  ssoError: string;
  ssoLoading: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};
export default function EgovSsoForm({
  pendingRole,
  invitationToken,
  setInvitationToken,
  ssoError,
  ssoLoading,
  onSubmit,
  onBack,
}: Props) {
  return (
    <div className="anim-in">
      <Stepper steps={STEPS} active={3} />
      <div className="migrated-2f55da8d">
        <span>
          {pendingRole === "recipient" ? "Recipient" : "Donor"} portal —{" "}
          Invitation access
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm migrated-6dac5f26"
          onClick={onBack}
        >
          Back
        </button>
      </div>

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
          <input
            id="invitation-token"
            className="input"
            type="password"
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Paste the token supplied to you"
            value={invitationToken}
            onChange={(e) => setInvitationToken(e.target.value)}
          />
        </div>

        {ssoError && <div className="migrated-13ec00a5">{ssoError}</div>}

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
