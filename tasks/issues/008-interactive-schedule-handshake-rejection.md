# Issue #008: Interactive Schedule Handshake & Rejection Fallback

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Open  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Unlock an interactive scheduling interface in the Recipient portal once a match receives formal hospital approval, empowering the Recipient to propose a tentative clinical procedure date and time. Present this schedule proposal on the Donor’s *My Match* tab with intuitive action buttons to either confirm the schedule or decline it by offering an alternative date/time counter-proposal for simple 1-click confirmation by the Recipient. Additionally, implement clean rejection handling: if a match is entirely declined by either the hospital or donor, smoothly transition the Recipient dashboard into an automated "Searching for compatible donors..." national scanning state.

## Acceptance criteria

- [ ] When a match reaches `approved` status, a dedicated *Schedule* tab (or embedded scheduling UI within My Match) automatically unlocks on the Recipient portal.
- [ ] Submitting a proposed appointment date transitions match status to `waiting_donor_confirmation` and surfaces the proposed date/time on the Donor’s *My Match* interface.
- [ ] The Donor can click "Confirm Schedule" to immediately advance match status to `scheduled`.
- [ ] The Donor can select "Suggest Alternative Date" (counter-proposal), allowing them to input a new date/time which updates the proposal on the Recipient's view for 1-click confirmation.
- [ ] If a match status enters `rejected` (from hospital decline or total donor opt-out), the Recipient dashboard hides match details and renders an interactive animated state reading *"Searching for compatible donors in national registry..."*.

## Blocked by

- [Issue #007: Institutional Medical Governance (Hospital Review & Approval Flow)](./007-institutional-medical-governance.md)
