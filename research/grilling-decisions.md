# eBuhay Workflow Redesign — Grilling Session Decisions

> Captured: 2026-07-29  
> Status: Completed (All 19 decisions confirmed — Shared Understanding Reached)

---

## Decision 1: "Doctor" → "Hospital"

**Question:** The existing codebase uses "Doctor" as the entity that approves matches. The new spec uses "Hospital." Which is canonical?

**Decision:** **Hospital** replaces **Doctor** everywhere.

- `DoctorConsole.jsx` → becomes `HospitalDashboard.jsx`
- "Doctor Approval" → "Hospital Approval" in all UI text
- "Simulate Doctor Approval" buttons → updated language
- The `doctor_id` column in the schema is irrelevant (dummy data)
- The spec's "Doctors / Medical Administrators" role is retired

**Rationale:** Single hospital, no auth, demo-only. The institutional approval concept is cleaner for presentation.

---

## Decision 2: Automatic Matching (not Recipient-initiated)

**Question:** Currently, recipients manually search for donors via a form. The new flow says matching is automatic. Confirm?

**Decision:** **Automatic matching.** No manual search step.

- Remove the Recipient's "Declare Need → Find Donor" wizard steps (`declare` → `find`)
- Match appears automatically on all three dashboards after both profiles are completed
- The `MatchService.js` ABO/Rh compatibility algorithm still runs — it just fires automatically against seed data
- This mirrors real organ registries (UNOS-style waitlists)

---

## Decision 3: Keep Calendar, Simplify Scheduling

**Question:** The existing AI Tri-Party Scheduler is sophisticated. The new flow is a simple Recipient proposes → Donor confirms handshake. Keep the calendar?

**Decision:** **Keep the `CalendarScheduleView.jsx` calendar component** but change behavior:

- **Recipient view:** Calendar where they pick a date + time slot. No AI optimization.
- **Donor view:** Shows the proposed date/time with Accept/Reject buttons. No calendar interaction.
- **Hospital Dashboard:** No scheduling responsibility at all — it only approves/rejects matches.
- The AI Tri-Party Scheduler tab from DoctorConsole is **dropped**.

---

## Decision 4: Donation Agreement — Auto-generated, In-Dashboard View

**Question:** How is the agreement generated, who signs first, and where does it live?

**Decision:**

- **Auto-generated.** Once Donor accepts the schedule, the agreement document automatically appears for both parties.
- **Either party can sign in any order.** "Store to Blockchain" button activates only after both sign.
- **Lives as a view/tab within each dashboard** — not a separate route. Consistent with existing tab-based navigation.
- Reuses existing `BlockchainBadge.jsx` and `SignatureUploader.jsx` components.

---

## Decision 5: Chat — No Anonymous Phase

**Question:** Currently chat has two layers: lock screen (pre-approval) and identity masking (pre-consent). Since chat now opens post-contract, is anonymity still needed?

**Decision:** **Drop the anonymous identity masking.** 

- Chat unlocks after **Contract Signed** status
- Both parties see real names immediately — they already know each other from the signed agreement
- The `consentSigned` gating logic in `ChatBox.jsx` is simplified

---

## Decision 6: "Contract Signed" → "Ready for Transplant" (Auto-transition)

**Question:** When does the final status transition happen? No user action triggers it in the flow.

**Decision:** **Auto-transition after blockchain anchoring completes.**

- Both sign → "Store to Blockchain" activates → Click → Simulation runs → Status = **Contract Signed** → Immediately becomes **Ready for Transplant**
- **Contract Signed** is a momentary/transitional state
- **Ready for Transplant** is the final resting state

---

## Decision 7: Hospital Dashboard Tabs

**Question:** The old DoctorConsole had 4 tabs (Cases, Schedule, Laws, Analytics). What carries over?

**Decision:**

| Old Tab | New Hospital Dashboard | Reason |
|---|---|---|
| Cases | ✅ **Match Review** (primary) | Core approve/reject functionality |
| Schedule | ❌ Dropped | Scheduling is now Recipient's job |
| Laws | ✅ **Laws Q&A** (secondary) | eGov integration showcase for demo |
| Analytics | ✅ **Analytics** (secondary) | Looks impressive in presentations |

---

## Decision 8: Routing — Minimal `react-router-dom`

**Question:** The app has no React Router. Adding `/hospital-dashboard` requires introducing routing. Minimal or full?

**Decision:** **Add `react-router-dom` with a minimal 2-route setup.**

| Route | Component | Notes |
|---|---|---|
| `/` | Current onboarding + dashboard flow | Preserves existing state-machine behavior |
| `/hospital-dashboard` | `<HospitalDashboard />` | No auth, directly accessible by URL |

**Rationale:**
- Cramming Hospital into the existing 660-line `App.jsx` state machine would bloat it further
- A proper route makes the demo easier — judges can bookmark `/hospital-dashboard` directly
- Minimal surface area: only 2 routes, no nested routing complexity
- `react-router-dom` is a single new dependency

---

## Confirmed Match Status Flow

```
Pending Hospital Approval
        ↓
Approved by Hospital
        ↓
Waiting for Donor Confirmation
        ↓
    Scheduled
        ↓
  Contract Signed
        ↓
Ready for Transplant
```

---

## Existing Components to Reuse

| Component | Reuse Plan |
|---|---|
| `CalendarScheduleView.jsx` | Keep for Recipient scheduling (simplified behavior) |
| `ChatBox.jsx` | Keep, gate moved to post-contract, drop anonymous phase |
| `BlockchainBadge.jsx` | Keep for agreement anchoring |
| `SignatureUploader.jsx` | Keep for agreement signatures |
| `MatchReviewModal.jsx` | Adapt for Hospital Dashboard match review |
| `EGovAIWidget.jsx` | Keep in Hospital Dashboard Laws tab |
| `OrganAnalytics.jsx` | Keep in Hospital Dashboard Analytics tab |
| `Toast.jsx` | Keep as-is |
| `Navbar.jsx` | Update labels (Doctor → Hospital) |

---

## Decision 9: Shared `MatchContext` for Match Lifecycle State

**Question:** Donor and Recipient dashboards each manage independent match state (`matchStep`, `doctorApproved`, `selectedMatch`, etc.). The new flow requires all three dashboards (Donor, Recipient, Hospital) to see the same match status. How do we synchronize?

**Decision:** **Lift match state into a shared `MatchContext` React context.**

- A single `match` object with a `status` field tracks the confirmed flow:
  ```
  Pending Hospital Approval → Approved → Waiting for Donor Confirmation → Scheduled → Contract Signed → Ready for Transplant
  ```
- Both dashboards and the Hospital Dashboard consume this context
- No websockets, no polling — shared in-memory state (sufficient for a demo app)
- Replaces per-dashboard `matchStep`, `doctorApproved`, `approvedMatch`, `matchedRecipient` state

**Rationale:** Keeping state separate and faking synchronization with prop drilling would make the demo feel broken when switching between views and status doesn't match. A context is the minimal React-native solution.

---

## Decision 10: Remove "Simulate Doctor Approval" Buttons

**Question:** Both Donor and Recipient dashboards have "Simulate Doctor Approval (Demo)" buttons. With the Hospital Dashboard now handling approval via `MatchContext`, do we keep these shortcuts?

**Decision:** **Remove them entirely.** Approval only happens from `/hospital-dashboard`.

- Delete `simulateDoctorApproval()` from `DonorDashboard.jsx` and `RecipientDashboard.jsx`
- Donor/Recipient dashboards show a **status indicator** (e.g., "⏳ Pending Hospital Approval") instead of a button
- During demos, presenter opens `/hospital-dashboard` in a second tab and approves — the status updates live in both views
- This is how production would work: the citizen never self-approves

**Rationale:** The entire redesign's value proposition is showing the Hospital as a separate institutional workflow. Keeping simulate buttons undermines that story. Two tabs side-by-side is actually more impressive for judges.

---

## Decision 11: Recipient Dashboard Tabs (New Flow)

**Question:** The current Recipient Dashboard has 6 wizard-style tabs (Declare Need → Find Donors → Match Status → Schedule → Chat → Consent). With automatic matching, the "Declare Need" and "Find Donors" steps are gone. What replaces them?

**Decision:** **5-tab structure with an editable "My Profile" tab:**

| Tab | Purpose | Availability |
|---|---|---|
| **My Profile** | View/edit health declaration (organ/blood need, blood type, urgency). Carried over from onboarding. Editing re-triggers automatic match. | Always |
| **My Match** | Shows auto-matched donor + current status from `MatchContext` | Always (shows "searching..." if no match) |
| **Schedule** | Calendar to propose a date + time slot | Unlocks after Hospital Approval + Donor Confirmation |
| **Agreement** | Donation agreement with dual signatures + blockchain anchoring | Unlocks after Donor accepts schedule |
| **Chat** | Direct messaging with matched donor | Unlocks after agreement is signed |

**Rationale:** A returning recipient may have new medical needs in the future (e.g., different organ, changed urgency) without needing to create a duplicate account. The "My Profile" tab mirrors the Donor's existing profile tab, keeping the two dashboards symmetric.

---

## Decision 12: Donor Dashboard Tabs (New Flow)

**Question:** The Donor currently has 4 tabs (My Profile, My Matches, Chat 🔒, Consent). How do these change for the new flow?

**Decision:** **4 tabs, restructured — no separate Schedule tab:**

| Tab | Purpose | Availability |
|---|---|---|
| **My Profile** | Edit blood type, organ pledges, availability toggle (keep as-is) | Always |
| **My Match** | Shows auto-matched recipient + status. Contains **Accept/Reject** buttons for the Recipient's proposed schedule date. | Always (shows "waiting for match..." if none) |
| **Agreement** | Donation agreement + dual signatures + blockchain anchoring | Unlocks after Donor accepts schedule |
| **Chat** | Messaging with matched recipient | Unlocks after agreement is signed |

**Key asymmetry with Recipient:** No "Schedule" tab. Per Decision 3, the Donor doesn't pick dates — they see the Recipient's proposed date/time inside "My Match" and Accept or Reject. The person in medical need (Recipient) drives scheduling urgency.

---

## Decision 13: Demo Seed Data — PGH + Kidney Transplant

**Question:** The current seed data has a "Doctor" entity (Maria Santos) and a blood donation match. What should the Hospital entity be, and should the demo match be blood or organ?

**Decision:**

1. **Hospital entity:** **Philippine General Hospital (PGH)** — replaces the "Dr. Maria Santos" doctor seed
2. **Demo match:** **Kidney transplant** (organ), not blood donation

Updated seed data:

| Role | Name | Blood Type | Details |
|---|---|---|---|
| **Hospital** | Philippine General Hospital (PGH) | — | `pgh@ebuhay.gov.ph`, Manila, Metro Manila |
| **Donor** | Juan Dela Cruz | O- | Pledges: `['kidney']`, available, age 32 |
| **Recipient** | Ana Reyes | A+ | Needs: kidney (organ), urgent |

- O- → A+ is compatible (O- donates to all)
- Donor already pledges kidney → organ match score is high
- Kidney transplant is more dramatic for a hackathon demo than routine blood donation (full flow: hospital approval → scheduling → agreement → blockchain for a life-saving transplant)

---

---

## Decision 14: Schema Status Enum Alignment

**Question:** The `matches.status` enum in `schema.sql` doesn't match the confirmed flow. The old schema has `doctor_approved` after `scheduled`, but Hospital approval now comes first. Also, `doctor_id` should become `hospital_id`.

**Decision:** **Update the schema to match the confirmed flow.**

New status enum:
```sql
status IN (
  'pending_hospital_approval',
  'approved',
  'waiting_donor_confirmation',
  'scheduled',
  'contract_signed',
  'ready_for_transplant',
  'rejected'
)
```

Additional schema changes:
- `matches.doctor_id` → `matches.hospital_id`
- `schedules.doctor_id` → `schedules.hospital_id`
- `users.role` CHECK: add `'hospital'` (or replace `'doctor'`)
- `schedules.doctor_notes` → `schedules.notes`

---

## Decision 15: Conditional Navbar Across Routes

**Question:** The Navbar currently shows role badge, eVerify status, user name, and "Exit Role." How does it behave on `/hospital-dashboard` where there's no user session?

**Decision:** **Single `<Navbar>` component with conditional rendering based on route.**

- **On `/`** (Donor/Recipient): Unchanged — role badge, eVerify pill, user name, "Exit Role"
- **On `/hospital-dashboard`**: Shows "🏥 Philippine General Hospital" as role badge, no eVerify pill, no user name, "← Back to Citizen Portal" link instead of "Exit Role"

---

## Decision 16: Agreement Document — Styled Form + Silent Blockchain

**Question:** What does the agreement document contain, and how does blockchain anchoring work from the user's perspective?

**Decision:**

1. **Styled HTML document** rendered inline, resembling an official Philippine government form:
   - Pre-filled with match data: donor name, recipient name, organ type (kidney), scheduled date, hospital (PGH), compatibility score
   - Signature upload areas for both parties (reuses `SignatureUploader.jsx`)
   - A "Submit Agreement" button (not "Store to Blockchain")

2. **Blockchain anchoring is invisible to citizens.** When both parties sign and submit:
   - The system auto-anchors the agreement hash to Besu in the background
   - Citizens see a simple "✓ Agreement Submitted" confirmation
   - No tx hash, block number, or explorer URL shown to citizens
   - The blockchain proof (tx hash, block, chain ID) surfaces only on the **Hospital Dashboard** — the institutional party that cares about audit trails

**Rationale:** Citizens don't need to know about blockchain infrastructure. They just sign a document. The Hospital (and hackathon judges) can see the on-chain proof in the Hospital Dashboard's match detail view.

---

## Decision 17: Blockchain Proof Surfaces on Hospital Dashboard Only

**Question:** Blockchain is invisible to citizens (Decision 16). Where do hackathon judges see the Besu integration working?

**Decision:** **Hospital Dashboard → Match Review tab.**

When a match reaches "Contract Signed" or "Ready for Transplant," the match card in Hospital's Match Review shows:
- ✓ Both signatures received
- ✓ Anchored on Besu (Chain 13371)
- Tx Hash, Block Number, Explorer link

This is the natural place — the Hospital is the institutional auditor. Judges see it when demoing the Hospital Dashboard.

---

## Decision 18: Rejection Handling & Schedule Counter-Proposals

**Question:** How does the system handle rejections from either the Hospital or the Donor during the demo flow?

**Decision:** **Interactive counter-proposals for scheduling, and automated re-searching for match rejection:**

1. **Schedule Rejection (Donor Counter-Proposal):**
   - When the Donor rejects the Recipient's proposed scheduled date, instead of a simple decline, they are prompted to **suggest an alternative date/time** (counter-proposal).
   - This returns the match status to `waiting_donor_confirmation` or back to scheduling with the Donor's suggested date displayed on the Recipient's calendar tab for simple 1-click confirmation.
   - Creates an authentic two-way clinical negotiation handshake.

2. **Match Rejection (Hospital or Donor Declines Match):**
   - If the Hospital declines approval or the Donor altogether opts out of the match, the Recipient dashboard smoothly transitions into an automated **"Searching for compatible donors..."** scanning state.
   - Demonstrates the national registry database scanning fallback without breaking the demo presentation flow.

---

## Decision 19: Surfacing `eMessage` SMS Notifications in UI

**Question:** Currently eMessage push API calls only log to the Node.js terminal during events. How do hackathon judges see the eMessage integration?

**Decision:** **Visual simulated mobile push notification toasts on workflow state transitions:**

- When `MatchContext.advanceStatus()` fires (e.g., Hospital approves, schedule proposed/accepted, agreement signed), a dedicated eMessage Toast alert appears in the UI.
- Displays realistic sender/recipient phone formatting and concise SMS copy (e.g., *"📱 DICT eMessage SMS Sent to Ana Reyes: PGH has formally approved your Kidney transplant match..."*).
- Makes the backend eMessage integration immediately obvious and visually impressive during live demos without leaving the browser viewport.

---

## Existing Code to Remove/Replace

| Item | Action |
|---|---|
| `DoctorConsole.jsx` | Replace with `HospitalDashboard.jsx` |
| Recipient "Declare → Find" wizard tabs | Replace with "My Profile" + "My Match" tabs |
| Recipient `findMatches()` manual search | Replace with auto-match on profile load/edit |
| AI Tri-Party Scheduler logic | Drop from Hospital, simplify in Recipient |
| `simulateDoctorApproval()` in both dashboards | Remove entirely (Decision 10) |
| Anonymous identity masking in ChatBox | Remove entirely |
| `doctor_id` columns in schema | Rename to `hospital_id` (Decision 14) |
| Match status enum in schema | Replace with new 7-status flow (Decision 14) |
| Per-dashboard match state (`matchStep`, `doctorApproved`, etc.) | Replace with shared `MatchContext` |
| `consentSigned` prop drilling from `App.jsx` | Absorb into `MatchContext` |
| Doctor seed in `schema.sql` | Replace with PGH hospital entity |
| Recipient request seed (`blood`, `O-`) | Change to organ/kidney transplant |
| "Store to Blockchain" button in `BlockchainBadge.jsx` | Replace with "Submit Agreement"; anchoring runs silently |
| Blockchain tx hash / explorer UI in citizen dashboards | Move to Hospital Dashboard only |
| Silent console-only eMessage triggers | Supplement with interactive UI toast alerts (Decision 19) |

