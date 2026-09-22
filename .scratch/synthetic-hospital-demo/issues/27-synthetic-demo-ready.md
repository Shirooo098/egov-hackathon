# 27 — Synthetic Demo Ready

**What to build:** Assemble the reproducible synthetic demo baseline and publish measured evidence for supported showcase flows.

**Blocked by:** 26 — Blood and Multi-Organ Simulation

**Status:** blocked — Tickets 24–26 do not have an open verified dependency chain

The partial Ticket 24 evidence ([baseline measured 2026-09-17](../evidence/baseline-partial-2026-09-17.md), [automated partial manifest](../evidence/automated-partial-2026-09-17/manifest.json), [browser accessibility partial](../evidence/browser-accessibility-partial-2026-09-17.md)) does not satisfy the Demo Ready gate. The default Node/`tsx` release-run startup still fails before loading tests; a temporary preloader completed the client helper check (15 tests / 4 suites), and eight non-DB commands passed with raw logs retained. Server PostgreSQL-backed checks remain blocked by `EACCES`; browser access was user-declined, manual categories are untested, and there is no accessibility signoff or accountable reviewer approval.

- [ ] Current test, build, typecheck, lint, database, concurrency, accessibility, reset-boundary, rejection, and reconciliation results are measured and retained with source revision and synthetic environment.
- [x] `hospital_admin` console reset requires explicit confirmation, server-side authorization, CSRF/origin checks, audit logging, and reset safeguards; there is no reset CLI.
- [x] Current landing-page disclosure states that all healthcare records, hospital, blood, and transplant workflows are synthetic, and Citizen runtime login uses official eGov staging SSO (authentication invitations superseded; provider doubles are tests only; case/pair workflow invitations remain); update only the current landing disclosure and existing `SHOWCASE` documentation.
- [x] The demo runbook includes fixture reset, known limitations, support owner, no-live-use boundary, and a rejection-plus-reconciliation scenario.
- [x] No synthetic record, credential, fixture, or evidence is promoted to an external or live system.
