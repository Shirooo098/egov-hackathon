# Issue #005: Central Match Lifecycle Engine & Schema Alignment

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Completed  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Update the database schema and backend APIs to support institutional medical terminology, renaming legacy doctor references to hospital entities and establishing an immutable 7-stage match lifecycle status progression. Replace default routine blood seed data with an high-urgency Kidney Transplant demonstration scenario featuring Philippine General Hospital (PGH) as the evaluating medical institution. Introduce a centralized `MatchContext` provider across the frontend client application to wrap both route boundaries, synchronizing real-time match state between Citizen portals and Hospital review tables without page reloads. This ticket absorbs and supersedes exploratory Issue #002.

## Acceptance criteria

- [x] Database DDL (`schema.sql`) and API endpoints reflect `hospital_id` instead of `doctor_id` across relevant tables (`matches`, `schedules`), and support the canonical 7-stage match lifecycle enum:
  ```
  pending_hospital_approval ➔ approved ➔ waiting_donor_confirmation ➔ scheduled ➔ contract_signed ➔ ready_for_transplant [and rejected]
  ```
- [x] Database seed data is reconfigured so the evaluating institution is "Philippine General Hospital (PGH)", the Donor pledges a kidney with O- blood, and the Recipient requires an urgent kidney transplant with A+ blood.
- [x] A React `MatchContext` state provider wraps the frontend application routes (`/` and `/hospital-dashboard`), providing unified match status inspection and status advancement methods.
- [x] State mutations in `MatchContext` immediately reflect across both Citizen and Hospital views when switching routes during demo verification.

## Blocked by

- [Issue #004: Core Navigation Seam](./004-core-navigation-seam.md)
