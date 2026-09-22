# 25 — Synthetic Hospital Foundation

**What to build:** Establish one simulated hospital deployment with a logically separate console shell and access model for Staff with blood/transplant service scopes. Operational mutations use APIs and the shared server-side signer; `seed:synthetic` is the sole transactional fixture-bootstrap exception.

**Blocked by:** 24 — Synthetic Demo Baseline Evidence

**Status:** blocked — Ticket 24 baseline evidence is incomplete

- [x] Console shell and access controls exist for named, role-separated Staff: hospital_admin, coordinator, clinical_lead, doctor, scheduler, supervisor, and blood_approver, with blood/transplant service scopes as applicable.
- [x] Staff use password plus MFA with environment-provided seed inputs and scoped authorization; Citizen runtime access uses official eGov staging SSO only (authentication invitations superseded; case/pair workflow invitations remain; provider doubles are tests only).
- [x] One simulated hospital exposes a synthetic blood service and one transplant service with strict synthetic gating and visibly labelled resettable fixtures.
- [x] Hospital, blood, and transplant events use the shared server-side signer, with replay, ordering, hash, idempotency, and rejection evidence.
- [x] Move signing into shared server code, then delete the `hospital:sign` package script and `server/src/cli/synthetic-hospital.ts` once no caller remains; keep `seed:synthetic` as the fixture-bootstrap path.
