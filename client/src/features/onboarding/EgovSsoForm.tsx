import "../../styles/components/onboarding/EgovSsoForm.css";
import Stepper, {
  ONBOARDING_SIGNIN_STEPS,
} from "./Stepper";

type Props = {
  pendingRole: string | null;
  ssoError?: string;
  ssoLoading?: boolean;
  onBack: () => void;
};

export default function EgovSsoForm({
  pendingRole,
  ssoError,
  ssoLoading,
  onBack,
}: Props) {
  return (
    <div className="anim-in">
      {pendingRole && <Stepper steps={ONBOARDING_SIGNIN_STEPS} active={3} />}
      {pendingRole && (
        <div className="portal-status-bar migrated-2f55da8d">
          <span>
            {pendingRole === "recipient" ? "Recipient" : "Donor"} portal — eGovPH sign-in
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
      )}

      <h3 className="migrated-1f2c3427">
        {pendingRole ? "Open eBuhay from eGovPH to sign in" : "Citizen sign-in is not available yet"}
      </h3>

      <div role="status" aria-live="polite" className="migrated-78d8b799">
        <p>
          Official eGov Single Sign-On staging is the only supported Citizen login method. Citizen sign-in must start from eGovPH and secure callback completion awaits the verified provider correlation contract.
        </p>
        {ssoLoading && <p>Checking sign-in status…</p>}
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
        >
          Back
        </button>
      </div>
    </div>
  );
}
