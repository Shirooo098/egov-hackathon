# Issue #002: Create shared `MatchContext` for match lifecycle state

> **Priority:** High  
> **Status:** Completed  
> **Decision Ref:** [grilling-decisions.md — Decision 9](../research/grilling-decisions.md)  
> **Depends on:** Issue #001 (react-router-dom) — context must wrap both routes  
> **Created:** 2026-07-29

---

## Problem

Donor and Recipient dashboards each manage **independent, duplicated** match state:

- `RecipientDashboard`: `step` (`declare → find → matched → approved → scheduled`), `selectedMatch`, `doctorApproved`, `approvedMatch`
- `DonorDashboard`: `matchStep` (`list → matched → approved → scheduled`), `matchedRecipient`, `doctorApproved`
- `App.jsx`: `consentSigned` (prop-drilled to both dashboards)

The new flow requires all three views (Donor, Recipient, Hospital Dashboard) to share a single source of truth for match status. When the Hospital approves at `/hospital-dashboard`, both Donor and Recipient at `/` must reflect the change.

## Solution

Create a `MatchContext` React context with a single `match` object tracking the lifecycle:

```
Pending Hospital Approval → Approved → Waiting for Donor Confirmation → Scheduled → Contract Signed → Ready for Transplant
```

### Context shape (draft)

```jsx
{
  match: {
    id: 'demo-match-001',
    donor: { /* seed data */ },
    recipient: { /* seed data */ },
    status: 'pending_hospital_approval', // enum
    scheduledDate: null,
    donorSigned: false,
    recipientSigned: false,
    blockchainAnchor: null,
  },
  advanceStatus: (newStatus) => void,
  setScheduledDate: (date) => void,
  signAgreement: (role) => void,
  anchorToBlockchain: (anchorData) => void,
}
```

## Implementation Steps

- [x] Create `client/src/context/MatchContext.jsx` with provider and hook
- [x] Pre-seed with one demo match (auto-generated from existing seed data)
- [x] Wrap `<BrowserRouter>` children with `<MatchProvider>` in `main.jsx`
- [x] Replace `DonorDashboard` internal match state with `useMatch()` context hook
- [x] Replace `RecipientDashboard` internal match state with `useMatch()` context hook
- [x] Replace `consentSigned` / `setConsentSigned` prop drilling from `App.jsx` with context
- [x] Wire `HospitalDashboard` approve/reject actions to `advanceStatus()`
- [x] Update `BlockchainBadge`, `ChatBox`, `MatchReviewModal` to consume context instead of props

## Acceptance Criteria

1. Approving a match on `/hospital-dashboard` is immediately reflected on `/` for both Donor and Recipient
2. Scheduling by Recipient updates Donor's view
3. Signing by either party updates the other's view
4. No prop drilling of `consentSigned` or `doctorApproved` — everything flows through context
5. Demo seed data loads automatically on mount (no user action needed to see a match)
