import { useLocation, Link } from "react-router-dom";
import VerifiedPill from "./VerifiedPill";

type Props = {
  currentRole?: "recipient" | "donor" | "doctor" | "hospital" | null;
  verified?: boolean;
  tier?: string;
  userProfile?: {
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  onSignOut?: () => void | Promise<void>;
  showStaffEntry?: boolean;
};
export default function Navbar({
  currentRole,
  verified,
  tier,
  userProfile,
  onSignOut,
  showStaffEntry = false,
}: Props) {
  const location = useLocation();
  const isHospitalRoute = location.pathname === "/hospital-dashboard";

  const roleLabels = {
    recipient: "Recipient",
    donor: "Donor",
    doctor: "Medical Doctor",
    hospital: "Hospital Administration",
  };

  return (
    <header className="landing-header navbar">
      <nav className="landing-header-inner navbar-inner" aria-label="Main navigation">
        {/* Brand matching PublicLanding */}
        <Link
          to={isHospitalRoute ? "/hospital-dashboard" : "/"}
          aria-current={
            location.pathname === "/" ||
            location.pathname === "/hospital-dashboard"
              ? "page"
              : undefined
          }
          className="landing-brand navbar-brand-link"
          aria-label={isHospitalRoute ? "Hospital dashboard" : "eBuhay home"}
        >
          {isHospitalRoute ? (
            <>
              Philippine General Hospital <span>Demo</span>
            </>
          ) : (
            <>
              eBuhay <span>Prototype</span>
            </>
          )}
        </Link>

        {/* Conditional Navigation / Actions */}
        {isHospitalRoute ? (
          /* Institutional Hospital Context */
          <div className="navbar-actions">
            <span className="nav-context-label badge badge-success nav-context-hospital">
              Hospital Administrator Demo
            </span>
            <span className="nav-facility-id">
              Sample facility: PGH-MNL-1000
            </span>
            <Link to="/" className="btn btn-outline btn-sm nav-back">
              ← Back to Citizen Portal
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Sign out of hospital demo"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        ) : (
          /* Citizen Portal Context */
          <div className="navbar-actions navbar-actions-citizen">
            {/* Single Hospital CTA when no role is active (avoid CTA collision) */}
            {!currentRole && showStaffEntry && (
              <Link
                to="/staff-sign-in"
                className="landing-staff-link nav-staff-entry"
              >
                <b>SIMULATED</b> Staff demo
                <span className="landing-sr-only">Simulated staff demo</span>
              </Link>
            )}

            {currentRole && (
              <>
                {/* Active Role Label */}
                <span
                  className={`nav-context-label badge badge-${currentRole === "doctor" || currentRole === "hospital" ? "moderate" : currentRole === "donor" ? "success" : "primary"}`}
                >
                  {roleLabels[currentRole] || "Citizen"} Portal
                </span>

                {/* Humane avatar-style verified pill (replaces the small "PhilSys Tier I" text) */}
                {verified && userProfile && (
                  <VerifiedPill
                    firstName={userProfile.first_name}
                    lastName={userProfile.last_name}
                    tier={tier || "Tier I"}
                  />
                )}
                {!verified && (
                  <div className="ev-pill nav-unverified">
                    <ShieldIcon />
                    <span>Unverified</span>
                  </div>
                )}

                {/* Exit Role control */}
                <button
                  className="btn btn-ghost btn-sm nav-exit"
                  onClick={onSignOut}
                >
                  <span className="nav-exit-text">Exit Role</span>
                  <span className="nav-exit-icon">✕</span>
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
