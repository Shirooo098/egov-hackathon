/**
 * Retired under Ticket 22 / Issue 034: Browser sessionStorage is not an authority
 * for hospital staff sessions. Staff authentication is strictly server-authoritative
 * via HttpOnly session cookies and partner-approved MFA.
 */
export const HOSPITAL_DEMO_SESSION_KEY = "ebuhay:demo:hospital-session";

export function hasHospitalDemoSession(): boolean {
  return false;
}

export function startHospitalDemoSession(): void {
  throw new Error(
    "Browser sessionStorage cannot authorize hospital workflows; staff must use server-authoritative /api/v1/auth/staff login.",
  );
}

export function clearHospitalDemoSession(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(HOSPITAL_DEMO_SESSION_KEY);
  }
}
