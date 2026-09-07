import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../shared/ui/Navbar';
import { startHospitalDemoSession } from './staffDemoSession';

export default function StaffSignIn() {
  const navigate = useNavigate();

  const continueAsDemoStaff = () => {
    startHospitalDemoSession();
    navigate('/hospital-dashboard', { replace: true });
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar currentRole={null} verified={false} tier="" userProfile={null} onSignOut={() => {}} showStaffEntry={false} />
      <main id="main-content" tabIndex={-1} className="page-content staff-sign-in-page">
        <div className="container">
          <section className="card staff-sign-in-card" aria-labelledby="staff-sign-in-heading">
            <p className="hero-eyebrow">Staff demonstration access</p>
            <h1 id="staff-sign-in-heading">Staff Sign-In</h1>
            <p className="staff-sign-in-context">Philippine General Hospital · Hospital Administrator demo context</p>
            <p>This is a presentation-only prototype. It does not authenticate employment, institutional authority, or production access.</p>
            <button type="button" className="btn btn-primary btn-lg" aria-label="Continue as PGH demo staff" onClick={continueAsDemoStaff}>
              Continue as PGH demo staff
            </button>
          </section>
        </div>
      </main>
    </>
  );
}
