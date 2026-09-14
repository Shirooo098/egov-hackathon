import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/ui/Navbar";
import { useAuth } from "../../context/AuthContext";

export default function StaffSignIn() {
  const navigate = useNavigate();
  const { signInStaff, status } = useAuth()!;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password || !mfaCode.trim()) {
      setError(!mfaCode.trim()
        ? "Enter your one-time code or recovery code."
        : "Enter your staff username and password.");
      return;
    }
    setError("");
    try {
      await signInStaff(username.trim(), password, mfaCode.trim());
      setPassword("");
      setMfaCode("");
      navigate("/hospital-dashboard", { replace: true });
    } catch {
      setPassword("");
      setMfaCode("");
      setError("We could not sign you in. Check your credentials and try again.");
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar
        currentRole={null}
        verified={false}
        tier=""
        userProfile={null}
        onSignOut={() => {}}
        showStaffEntry={false}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="page-content staff-sign-in-page"
      >
        <div className="container">
          <section
            className="card staff-sign-in-card"
            aria-labelledby="staff-sign-in-heading"
          >
            <p className="hero-eyebrow">
              Named hospital staff · synthetic demo access
            </p>
            <h1 id="staff-sign-in-heading">Staff Sign-In</h1>
            <p className="staff-sign-in-context">
              Philippine General Hospital · Hospital Administrator demo context
            </p>
            <p>
              Use the named account provisioned for your hospital role. This
              invited-tester prototype uses synthetic records and simulated
              hospital steps; it does not grant production access.
            </p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="staff-username">Staff username</label>
              <input
                id="staff-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
              <label htmlFor="staff-password">Password</label>
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <label htmlFor="staff-mfa-code">One-time code or recovery code</label>
              <input
                id="staff-mfa-code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                autoComplete="one-time-code"
                required
              />
              {error && <p role="alert">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={status === "loading"}
              >
                {status === "loading"
                  ? "Signing in…"
                  : "Sign in as hospital staff"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
