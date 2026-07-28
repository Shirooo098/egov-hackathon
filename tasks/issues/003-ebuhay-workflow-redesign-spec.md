# Spec / Issue #003: eBuhay Clinical Workflow & Platform Redesign

> **Labels:** `ready-for-agent`, `spec`, `prd`  
> **Status:** Open / Ready for Implementation  
> **Created:** 2026-07-29  
> **Vocabulary Reference:** [CONTEXT.md](../../CONTEXT.md)

---

## Problem Statement

The legacy medical matchmaking platform suffers from disjointed UX flows, mismatched terminology ("Doctor Console" instead of an institutional facility), manual search friction that contradicts real-world clinical waitlists, and unnecessary exposure of low-level infrastructure (raw blockchain transaction hashes and complex multi-party scheduling calendars) to anxious citizens in emergency medical situations. Furthermore, independent and duplicated match states across citizen portals cause synchronization drift during live presentations, failing to convey an authoritative, unified government health platform integrated with PhilSys eVerify, DICT eMessage, and Hyperledger Besu.

## Solution

Redesign the eBuhay platform around an authentic institutional clinical workflow featuring automated matching, shared real-time state, and clear cognitive boundaries between ordinary Citizens (Donors and Recipients) and medical institutional governance (the Hospital). 

By establishing a zero-friction automatic matchmaking process based on verified onboarding profiles, an interactive two-way clinical schedule handshake with counter-proposals, an official government-styled Donation Agreement with silent background cryptographic archiving, and high-visibility DICT eMessage mobile toast notifications, the platform elevates user trust, streamlines clinical coordination, and cleanly presents institutional blockchain auditing exclusively where it belongs: inside the Hospital dashboard.

## User Stories

1. As a Citizen onboarding onto eBuhay, I want to authenticate via PhilSys eGov Single Sign-On and complete biometric Face Liveness verification, so that my demographic profile and living status are trusted by national health registries.
2. As a Recipient completing registration, I want to declare my specific organ requirement (kidney) and urgency level during initial setup, so that the platform can match me with compatible donors without forcing me through repetitive manual search forms.
3. As a Donor completing registration, I want to pledge my organs and confirm my O- blood type during sign-up, so that my willingness to save a life is immediately registered in the clinical national vault.
4. As a Recipient accessing my citizen portal, I want to see an automatic clinical Match with a verified donor instantly upon loading my dashboard, so that I immediately gain reassurance without manual querying.
5. As a Recipient viewing my match status, I want to clearly observe that our case is currently pending formal medical evaluation by an institutional Hospital, so that I understand the clinical governance steps required before procedure scheduling.
6. As a Citizen on either dashboard, I want to view an editable "My Profile" tab displaying my initial health declarations and availability, so that I can update my clinical criteria or organ availability over time without recreating my eGov account.
7. As an institutional Hospital administrator (PGH) visiting a dedicated direct route, I want to access an institutional review console without citizen authentication hurdles, so that medical triage officers and presentation judges can rapidly evaluate pending matches.
8. As an institutional Hospital administrator, I want to review blood ABO/Rh compatibility scores and clinical details for pending matches, so that I can formally grant or decline clinical procedure approval.
9. As a Recipient waiting for approval, I want to receive a high-visibility simulated mobile push notification toast from DICT eMessage the instant a Hospital approves my match, so that I am alerted to immediately log in and propose a procedure schedule.
10. As a Recipient whose match has been approved by the Hospital, I want my dashboard to automatically unlock a date and time scheduling interface, so that I can propose a specific time slot for our surgical clearance.
11. As a Donor paired with an approved Recipient, I want to receive a DICT eMessage push notification alert when the Recipient proposes an appointment schedule, so that I know my confirmation is required.
12. As a Donor reviewing my match tab, I want to see the exact date, time, and clinical location proposed by the Recipient, so that I can quickly click to either accept the procedure appointment or reject it.
13. As a Donor who is unavailable on a proposed procedure date, I want to reject the schedule and propose an alternative date/time (a counter-proposal), so that the Recipient and I can collaboratively achieve an appointment handshake without starting over.
14. As a Recipient receiving a schedule counter-proposal, I want to view the Donor's newly suggested date on my schedule tab and confirm it with a single click, so that clinical coordination remains uninterrupted.
15. As a Citizen whose match is rejected altogether by either the Hospital or Donor, I want my dashboard to automatically fall back into an interactive "Searching for compatible donors..." status, so that I am reassured the national registry is continuously scanning for my next life-saving match.
16. As a Citizen whose procedure schedule is finalized, I want an official government-styled Donation Agreement document to automatically unlock in my portal, so that I can review full clinical terms pre-filled with verified identities, anatomical details, and hospital facility assignments.
17. As a Citizen reviewing the Donation Agreement, I want to digitally attach my encrypted e-signature directly onto the rendered clinical form, so that neither party is forced to deal with complex external legal software.
18. As a Citizen who completes dual signing with my match partner, I want to click a simple "Submit Agreement" button and receive a plain confirmation checkmark, so that I am shielded from technical blockchain transaction hashes, gas, or explorer URLs.
19. As a system architect, I want fully signed Donation Agreements to automatically anchor their SHA-256 consent hash onto the DICT Hyperledger Besu network in the background, so that an immutable, tamper-proof national audit trail is established without user friction.
20. As a Citizen who has finalized and submitted our Donation Agreement, I want direct real-time clinical chat messaging to unlock between myself and my matched partner, so that we can communicate openly using our verified names prior to hospital admission.
21. As a Citizen utilizing direct chat, I want critical messages to emit simulated DICT eMessage push SMS notifications, so that off-platform communication continuity is demonstrated.
22. As an institutional Hospital administrator viewing the Match Review tab, I want to see explicit proof of dual signatures alongside the immutable Besu transaction hash, block number, and audit network chain ID once an agreement is submitted, so that clinical auditing governance is definitively satisfied for presentation evaluators.
23. As a user navigating the platform during a live demonstration, I want to use browser tab navigation between the Citizen Portal and the Hospital Dashboard seamlessly, so that parallel interactive workflows function reliably without manual page reload hacks.

## Implementation Decisions

- **Domain Language Standardization**: Replace all references to "Doctor" or individual physician approvers with the canonical entity **Hospital** (specifically the *Philippine General Hospital / PGH* in seed configurations). Establish canonical domain concepts: *Citizen*, *Donor*, *Recipient*, *Match*, *Schedule Proposal*, *Donation Agreement*, and *Blockchain Anchor*.
- **Routing & Navigation Architecture**: Introduce minimal client-side URL routing supporting exactly two authoritative boundaries: the Citizen Portal (`/`, housing onboarding and both citizen role dashboards) and the Hospital Dashboard (`/hospital-dashboard`, directly accessible without citizen SSO). The global navigation bar renders conditionally based on route context (displaying eVerify pills and portal exit controls solely in citizen context, and institutional branding with return navigation in hospital context).
- **Shared Match Lifecycle & State Machine**: Lift match progression out of isolated component state into a centralized provider (`MatchContext`) wrapping both route boundaries. All portals reactively consume and transition a shared match object governed by a 7-stage state enum:
  ```
  pending_hospital_approval ➔ approved ➔ waiting_donor_confirmation ➔ scheduled ➔ contract_signed ➔ ready_for_transplant [or rejected]
  ```
- **Removal of Citizen Simulation Bypass**: Eliminate all self-service "Simulate Doctor Approval" controls from Citizen views. Approval transition is strictly triggered via the Hospital Dashboard interface, enforcing production-grade segregation of responsibilities.
- **Automated Matchmaking & Seed Scenario Reconfiguration**: Eliminate manual search and declaration wizards from the Recipient view. Replace default routine blood donation seed criteria with an high-urgency **Kidney Transplant** matching scenario (O- universal donor paired with A+ kidney recipient), running automated compatibility scoring immediately against onboarding profile parameters upon dashboard entry.
- **Citizen Dashboard Tab Restructuring**:
  - **Recipient Portal (5 tabs)**: *My Profile* (editable health parameters) ➔ *My Match* (auto-match display & status indicator) ➔ *Schedule* (calendar proposal interface, unlocked post-approval) ➔ *Agreement* (styled clinical document) ➔ *Chat* (unmasked post-agreement communication).
  - **Donor Portal (4 tabs)**: *My Profile* ➔ *My Match* (incorporating proposed date evaluation and alternate date suggestion controls) ➔ *Agreement* ➔ *Chat*. (No standalone calendar scheduling tab for Donors, reflecting real-world clinical demand orientation).
- **Government-Styled Donation Agreement & Silent On-Chain Anchoring**: Render the agreement as a formal, visually rich HTML document containing pre-populated clinical attributes. Replace technical web3 nomenclature with standard user-facing submission controls ("Submit Agreement"). Execute Hyperledger Besu SHA-256 zero-knowledge anchoring entirely via background service calls upon dual-signature completion.
- **Auditing Proof Localization**: Restrict display of raw cryptographic audit receipts (transaction hash, chain ID `13371`, block numbers, explorer anchors) strictly to the Match Review card within the institutional Hospital Dashboard.
- **Reactive eMessage UI Toast Visualization**: Whenever state transitions occur within the match lifecycle or schedule handshakes, automatically trigger a high-visibility animated toast simulating a DICT eMessage push SMS sent to the citizen's mobile handset, exposing backend integration activity natively within the client UI.

## Testing Decisions

- **Core Testing Philosophy**: Tests must evaluate observable clinical workflow capabilities, route transitions, and state progression rather than testing internal React hook implementation details or private UI state variables.
- **Single Architectural Testing Seam**: To minimize fragility and adhere to the highest verification boundary, all client frontend workflows will be verified through a **single top-level seam**: **The Rendered Application Route Layer wrapped in `MatchContext`**. 
  - Instead of mounting isolated child cards with mock props, tests will simulate user interaction (clicks, form inputs, route visits) at the highest application boundary (`/` and `/hospital-dashboard`).
  - This single seam verifies that when an institutional user clicks "Approve Match" on the hospital route, the citizen dashboard seamlessly updates its rendered badges, unlocks schedule components, and triggers simulated eMessage toast banners without requiring internal stubbing.
- **Backend API Contract Seam**: On the Express API server, testing will target the HTTP REST endpoint boundary (`/api/matches`, `/api/schedule`, `/api/blockchain`, `/api/egovai`), validating compatibility algorithms and eGov service wrappers strictly through external JSON response assertions and status codes.
- **Prior Art & Continuity**: Tests should align with and extend existing Jest/Supertest patterns in the Express backend and utilize standard browser DOM assertion patterns for verifying glassmorphism UI element visibility and toast emissions.

## Out of Scope

- Multi-tenant hospital authentication or complex hospital RBAC permissions (the demo features a single authoritative facility, PGH, accessible directly via route).
- Real-time WebSocket or WebRTC signaling across remote distributed physical devices (shared browser state via context is authoritative for live presentation architecture).
- Physical mobile device carrier SMS billing or live cellular network dispatch (eMessage integrations will execute HTTP API push requests and surface via UI mobile toasts and console verification logs).
- Complex clinical re-matching algorithms involving dozens of simultaneous candidate rows (automated matching handles seed scenario pairing and drops into a simulated nationwide registry scan upon rejection).
- Live mainnet financial gas fee handling or wallet connector browser extensions (MetaMask, WalletConnect) for ordinary citizens; all anchoring utilizes DICT eGov zero-fee permitted testnet RPC (`Chain ID 13371`).

## Further Notes

- All design refinements must adhere strictly to the established DICT eGov color palette (Deep Blue `#0038A8`, Sub-brand Cyan `#0284C7`, Sun Gold `#F59E0B`, Health Emerald `#059669`) and utilize vibrant glassmorphism visual styling, smooth micro-animations, and clean typography to ensure maximum presentation impact during evaluation.
