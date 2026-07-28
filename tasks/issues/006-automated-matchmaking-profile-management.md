# Issue #006: Automated Matchmaking & Citizen Profile Management

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Completed  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Eliminate legacy manual search forms, multi-step declaration wizards, and self-service "Simulate Doctor Approval" shortcut buttons from citizen dashboard portals. When an authenticated Donor or Recipient enters their citizen portal at `/`, the application automatically queries the matchmaking service and pairs them against their initial onboarding profile parameters. Establish clean tab architectures for both roles: an editable "My Profile" tab allowing citizens to adjust their clinical criteria or availability without account re-registration, and a "My Match" tab displaying blood ABO/Rh compatibility scores and clearly indicating that clinical procedure scheduling is pending institutional hospital evaluation.

## Acceptance criteria

- [x] All "Simulate Doctor Approval" buttons and manual match search initiation buttons are completely removed from both Donor and Recipient citizen portals.
- [x] The Recipient dashboard loads directly into a clean tab interface (*My Profile* and *My Match*) and automatically exhibits a matched compatible donor without manual query execution.
- [x] The Donor dashboard loads directly into an equivalent tab structure showing the reciprocal kidney transplant match.
- [x] The *My Profile* tab allows users in either role to view and modify their initial health declarations (blood group, organ criteria, urgency/availability) and persist updates.
- [x] The *My Match* tab clearly renders a compatibility score card and exhibits a status indicator noting that medical evaluation by Philippine General Hospital is currently pending.

## Blocked by

- [Issue #005: Central Match Lifecycle Engine & Schema Alignment](./005-central-match-lifecycle-engine.md)
