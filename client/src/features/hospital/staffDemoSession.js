export const HOSPITAL_DEMO_SESSION_KEY = "ebuhay:demo:hospital-session";

export function hasHospitalDemoSession() {
  return (
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(HOSPITAL_DEMO_SESSION_KEY) === "pgh-admin"
  );
}

export function startHospitalDemoSession() {
  sessionStorage.setItem(HOSPITAL_DEMO_SESSION_KEY, "pgh-admin");
}

export function clearHospitalDemoSession() {
  sessionStorage.removeItem(HOSPITAL_DEMO_SESSION_KEY);
}
