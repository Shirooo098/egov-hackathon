# Issue #007: Institutional Medical Governance (Hospital Review & Approval Flow)

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Completed  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Replace the legacy "Doctor Console" component with the authoritative Philippine General Hospital (PGH) Dashboard accessible at `/hospital-dashboard`. Provide medical administrators and presentation evaluators with a 3-tab institutional console: *Match Review*, *Laws Q&A* (eGovAI legal guidance showcase), and *Analytics* (national organ statistics). Within the *Match Review* tab, allow hospital officers to inspect pending matched citizen pairs, examine blood group compatibility metrics, and explicitly click to formally grant or decline clinical procedure approval—instantaneously advancing the shared match lifecycle state visible to citizens.

## Acceptance criteria

- [x] Legacy `DoctorConsole.jsx` component is replaced by an authoritative `HospitalDashboard.jsx` interface rendered at `/hospital-dashboard`.
- [x] The Hospital Dashboard displays three clear tabs: *Match Review*, *Laws Q&A* (displaying existing eGovAI medical law chatbot capabilities), and *Analytics* (displaying organ analytics visualizations).
- [x] The *Match Review* tab displays cards for pending matches, displaying Donor/Recipient names, kidney organ criteria, blood compatibility score, and active clinical status.
- [x] Clicking an "Approve Match" button on an institutional match card transitions the match state in `MatchContext` from `pending_hospital_approval` to `approved`.
- [x] Clicking a "Reject Match" button transitions the match status to `rejected`.
- [x] Navigating back to the Citizen Portal (`/`) immediately reflects the hospital's evaluation choice without requiring a browser refresh.

## Blocked by

- [Issue #006: Automated Matchmaking & Citizen Profile Management](./006-automated-matchmaking-profile-management.md)
