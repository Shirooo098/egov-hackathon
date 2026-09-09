// Single source of truth for rendering the match.status enum across the UI.
// Replaces ad-hoc `match.status.replace(/_/g, ' ')` strings with consistent
// human labels and a tone token (used for badge / pill colors).

export const STATUS_LABELS = {
  pending_hospital_approval: "Pending Hospital Demo Review",
  approved: "Hospital Demo Review Complete",
  waiting_donor_confirmation: "Awaiting Donor Confirmation",
  waiting_recipient_confirmation: "Awaiting Recipient Confirmation",
  scheduled: "Scheduled",
  agreement_finalized: "Agreement Finalized",
  contract_signed: "Contract Signed",
  ready_for_transplant: "Demo Workflow Ready",
  rejected: "Match Declined",
};

// Tone buckets map directly to the existing .badge-* utility classes
// in global.css (success, warning, primary, destructive, muted).
export const STATUS_TONES = {
  pending_hospital_approval: "warning",
  approved: "success",
  waiting_donor_confirmation: "primary",
  waiting_recipient_confirmation: "primary",
  scheduled: "success",
  agreement_finalized: "success",
  contract_signed: "success",
  ready_for_transplant: "success",
  rejected: "destructive",
};

export function formatStatus(s) {
  if (!s) return "—";
  return STATUS_LABELS[s] || s.replace(/_/g, " ");
}

export function statusTone(s) {
  return STATUS_TONES[s] || "muted";
}

// Maps match.status to a solid color-coded pill class for the hero
// status indicator. Groups statuses by user-meaning:
//   go   = good progress, keep going (approved, scheduled, signed, ready)
//   wait = waiting on someone else (pending, waiting for confirmation)
//   stop = declined / rejected
//   info = neutral informational state
export const PILL_BY_STATUS = {
  pending_hospital_approval: "wait",
  approved: "go",
  waiting_donor_confirmation: "wait",
  waiting_recipient_confirmation: "wait",
  scheduled: "go",
  agreement_finalized: "go",
  contract_signed: "go",
  ready_for_transplant: "go",
  rejected: "stop",
};

export function statusPillClass(s) {
  const tone = PILL_BY_STATUS[s] || "info";
  return `status-pill status-pill-${tone}`;
}

// Maps a match.status to the index (0-5) of the active step in the
// LifecycleStrip visual. Returns -1 if status is unknown / rejected
// is handled separately by the strip component.
export function lifecycleStepIndex(s) {
  switch (s) {
    case "pending_hospital_approval":
      return 0;
    case "approved":
      return 1;
    case "waiting_donor_confirmation":
    case "waiting_recipient_confirmation":
      return 2;
    case "scheduled":
      return 3;
    case "agreement_finalized":
    case "contract_signed":
      return 4;
    case "ready_for_transplant":
      return 5;
    default:
      return 0;
  }
}

export const LIFECYCLE_STEPS = [
  { key: "pending", label: "Pending Approval", tone: "warning" },
  { key: "approved", label: "Hospital Demo Review Complete", tone: "success" },
  { key: "schedule", label: "Schedule Confirmed", tone: "primary" },
  { key: "agreement", label: "Agreement Signed", tone: "success" },
  { key: "chat", label: "Clinical Chat", tone: "success" },
  { key: "ready", label: "Demo Workflow Ready", tone: "success" },
];
