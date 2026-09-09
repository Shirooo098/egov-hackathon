import "../../styles/components/onboarding/EgovSsoForm.css";
import React from "react";
import Stepper from "./Stepper";

const STEPS = [
  { key: "role", label: "Role" },
  { key: "auth", label: "Access" },
  { key: "sso", label: "Demo code" },
  { key: "face", label: "Face check" },
  { key: "profile", label: "Profile" },
];

export default function EgovSsoForm({
  pendingRole,
  authMode,
  exchangeCode,
  setExchangeCode,
  ssoError,
  ssoLoading,
  onSubmit,
  onDemoSignIn,
  onBack,
}) {
  return (
    <div className="anim-in">
      <Stepper steps={STEPS} active={3} />
      <div className="migrated-2f55da8d">
        <span>
          {pendingRole === "recipient" ? "Recipient" : "Donor"} portal —{" "}
          {authMode === "signin" ? "Sign In" : "Sign Up"}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm migrated-6dac5f26"
          onClick={onBack}
        >
          Back
        </button>
      </div>

      <h3 className="migrated-1f2c3427">eGov Exchange Code (Demo)</h3>
      <p className="migrated-78d8b799">
        Paste the demo exchange code supplied by the presenter. This prototype
        shows a sample profile; it does not verify a government identity.
      </p>

      <form onSubmit={onSubmit} className="migrated-039dd51e">
        <div className="field">
          <label className="label" htmlFor="egov-exchange-code">
            Demo exchange code
          </label>
          <input
            id="egov-exchange-code"
            className="input"
            type="text"
            placeholder="Paste the code supplied by the presenter"
            value={exchangeCode}
            onChange={(e) => setExchangeCode(e.target.value)}
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
                <span className="spinner migrated-13ae4626" /> Checking demo
                code…
              </>
            ) : (
              "Continue with demo code"
            )}
          </button>
        </div>
      </form>

      {onDemoSignIn && (
        <>
          <div className="migrated-07c4431b">
            <span className="migrated-0174a332" />
            <span>Or shortcut for evaluators</span>
            <span className="migrated-0174a332" />
          </div>

          <button
            type="button"
            onClick={onDemoSignIn}
            disabled={ssoLoading}
            className="btn btn-demo btn-full egov-quick-signin"
          >
            <span>⚡ Use Quick Demo Sign-In</span>
            <span className="migrated-9fe3f3ec">
              (uses a sample identity, skips live eGov and face-check steps)
            </span>
          </button>
        </>
      )}
    </div>
  );
}
