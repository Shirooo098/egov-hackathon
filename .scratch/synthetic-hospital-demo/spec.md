# eBuhay synthetic hospital demo specification

**Status:** Active implementation contract for synthetic healthcare workflows (2026-09-14, reconciled 2026-09-23). This is a demo specification, not production approval, clinical approval, legal advice, or authorization to process live records. Official eGov staging SSO is the only runtime Citizen login in every environment (authentication invitations superseded; case/pair workflow invitations remain); provider doubles are tests only. All healthcare workflows and records are synthetic and remain live-disabled.

**Source of truth:** Authority is ordered: [canonical PRD](../../tasks/prd-hospital-integrated-donation-platform.md) > [official eGov staging integration specification](../official-egov-integrations/spec.md) for branded integrations > this specification for synthetic healthcare workflows. The [historical specification](../hospital-integrated-donation-platform/spec.md) is provenance only.

## Current showcase status

The repository is a project-owned synthetic prototype. Public Showcase, Private Synthetic Demo, and isolated Synthetic Hospital Rehearsal are demo profiles, not deployed live surfaces. Official eGov staging SSO is the only runtime Citizen login in every environment; provider doubles are automated test fixtures only. A simulated hospital and executable contract doubles are used for healthcare demonstration. All healthcare data is synthetic only; pilot and production environments remain out of scope.

Recorded evidence is maintained as demo evidence only. Acceptance must report measured test, build, typecheck, lint, database, concurrency, and accessibility results from the current run; counts must not be treated as hardcoded readiness claims. No eGov portal, hospital, blood-service, or other live connection is evidenced or required.

## Problem and solution

Hospital-coordinated blood and organ donation work is fragmented across citizen intake, coordinator follow-up, hospital clinical records, scheduling systems, and urgent external processes. A coordination record can improve ownership, safe status visibility, reminders, and reconciliation, but it must not become the authority for clinical eligibility, compatibility, allocation, consent, outcomes, or booking.

eBuhay is a server-authoritative synthetic coordination service. Citizens authenticate through official eGov staging SSO in every environment (authentication invitations are superseded; case and pair workflow invitations remain); provider doubles are tests only. Named synthetic hospital staff operate fixed, scoped roles (password plus MFA). Official staging identity never grants Staff authority or live approval. eBuhay stores minimum attributable summaries, references, source/author/time, workflow state, and immutable reconciliation history. The simulated hospital remains authoritative for synthetic clinical and scheduling facts. Healthcare records and hospital/blood/transplant workflows remain synthetic and live-disabled.

## Actors and boundaries

- Citizen: adult self-service user who sees only owned or explicitly shared coordination projections.
- Coordinator: assigned staff member responsible for intake, follow-up, proposals, and communication.
- Clinical lead/Doctor: hospital-authorized staff; clinical decisions stay in the hospital system.
- Blood-service approver: authorized staff who approve and publish blood requests.
- Hospital integration service: authenticated source of allowlisted events and booking facts.
- Administrator: provisions, recovers, scopes, disables, and reassigns named staff.
- Privacy/support operator: handles scoped requests and delivery failures without unnecessary health data.
- Operations/security operator: monitors, pauses unsafe workflows, manages incidents, backups, and releases.
- Demo governance owner: approves synthetic fixtures, retention, recovery rehearsal, and evidence review.

eBuhay never performs automated matching or ranking, compatibility calculation, clinical clearance, diagnosis, treatment, allocation, procurement, collection, testing, transplant/removal, or urgent-response replacement. A synthetic deterministic queue is coordination-only and must never be described as a recommendation. Manual hospital updates are attributable records, not automatic synchronization.

## Numbered user stories

1. [Superseded for runtime Citizen login by official eGov staging SSO] As an invited Citizen, runtime synthetic invitation login is superseded by official eGov staging SSO in all environments; provider doubles are automated test fixtures only.
2. [Superseded for login] Authentication invitation tokens are superseded by official eGov staging SSO; case and pair workflow invitations remain.
3. As a Citizen, I want session expiry, listing, and revocation, so unattended demo sessions are safe.
4. As an Administrator, I want named Staff accounts with scoped roles and password plus MFA, so privilege is never self-selected.
5. As an Administrator, I want Staff recovery, reassignment, disabling, and audit controls.
6. As a Citizen, I want independent donor and recipient cases with versioned intake and safe projections.
7. As Staff, I want case claims and authorization checks before disclosure.
8. As a blood-service Staff member, I want approved synthetic blood requests and independent responses.
9. As a transplant-service Staff member, I want synthetic kidney, liver, heart, lung, and pancreas scenarios represented without clinical claims.
10. As Staff, I want server-signed simulated-hospital events with replay, ordering, hash, and idempotency checks.
11. As a coordinator, I want durable synthetic appointments, outbox retries, and truthful status.
12. As a Citizen, I want booking status only after simulated-hospital evidence.
13. As Staff, I want conflicts, dead letters, manual updates, and reconciliation preserved with attribution.
14. As a Citizen, I want assigned coordination-team messaging without a direct Doctor channel.
15. As a coordinator, I want unranked Staff-confirmed candidate links and bounded anonymous conversation.
16. As a participant, I want consent, pause, resume, withdrawal, notifications, and read-only history.
17. As a data steward, I want environment-provided synthetic secrets, encryption, retention, holds, deletion receipts, and privacy exports.
18. As an operator, I want redacted logs, metrics, audit, kill switches, resettable fixtures, and hospital-admin reset safeguards.
19. As a reviewer, I want server-only operational mutation authority, no direct database mutation outside `seed:synthetic`, and immutable measured demo evidence.
20. As a tester, I want deterministic representative fixtures and measured concurrency, accessibility, build, typecheck, lint, and recovery checks.

## Architecture and module decisions

The system is one synthetic deployment: a portable Express API and worker backed by isolated PostgreSQL, with a logically separate simulated-hospital console for Staff using blood and transplant service scopes. The browser is presentation only. Use versioned routes, secure HttpOnly SameSite cookies, server-side sessions, CSRF protection, configured origins, correlation IDs, rate limits, redacted errors/logs, and graceful shutdown. Operational mutations go through server APIs and signed events; the explicit `seed:synthetic` command is the sole transactional fixture-bootstrap exception.

Modules have explicit ownership: identity/admission; session and staff MFA; citizen profile/cases/episodes; hospital claims; blood; hospital adapter/event verification; appointments/outbox/worker; reconciliation; assignments/messaging/pair proposals; consent/exit/history; notifications; privacy requests; retention/legal holds/deletion; audit; operations/kill switches; migrations and backup tooling. Authorization is deny-by-default and checked at route, service, object, hospital, service, assignment, and consequential-action boundaries, with a final transaction-time recheck.

Citizen runtime authentication is official eGov staging SSO only in every environment, superseding runtime invitation login (authentication invitations are superseded; provider doubles are tests only; case and pair workflow invitations remain). The flow is `exchange_code` → server-side provider token/profile handling → HttpOnly eBuhay session; partner secrets and tokens remain server-only. Missing credentials or provider failure fails closed with clear error/retry and no synthetic-success fallback. Staff use separate named accounts, scoped roles, password authentication, and MFA backed by environment-provided secrets. Official eGov Citizen staging identity never grants Staff authority or live approval, and there is no automatic identity merge.

Staff roles are fixed and separated across `hospital_admin`, `coordinator`, `clinical_lead`, `doctor`, `scheduler`, `supervisor`, and `blood_approver`, with blood/transplant service scopes as applicable. Passwords, MFA secrets, recovery material, and environment secrets never appear in browser storage, logs, or error responses; demo credentials are environment-supplied seed inputs, never committed secrets.

## Data model and provenance

PostgreSQL is authoritative. Use immutable IDs, UTC timestamps, optimistic versioning, and unique constraints for invitations, Staff accounts, source event IDs, nonces, outbox keys, and booking/slot identity. Core records include CitizenProfile, Session, StaffAccount/MfaFactor, Invitation, Case, Episode, HospitalClaim, BloodRequest/Response, transplant service and organ-type attributes on Case/Episode, PairProposal/ParticipantConversation/Message, Appointment/Booking, HospitalEvent/EventEnvelope, Outbox/DeliveryAttempt, Conflict/DeadLetter/Reconciliation, Consent/Exit, Notification, PrivacyRequest/Export, RetentionPolicy/LegalHold/DeletionReceipt, AuditEvent, KeyAccess, KillSwitch, and ReleaseEvidence.

Every hospital-derived or manually recorded fact carries source system, source event/reference, author or service identity, observed/received time, payload hash where applicable, schema version, ordering/version, and reconciliation state. This MVP stores only approved summaries and references; raw clinical records are out of scope and require a separately approved product and technical specification change, not merely a partner contract. Corrections append a new version. Deletion is record-class and hold aware, two-person approved, and produces a receipt while preserving legally required audit evidence.

## API and integration contracts

Expose resource-oriented endpoints for official eGov staging SSO Citizen sessions (runtime invitation login endpoints superseded; provider doubles are tests only), Staff administration, cases, blood requests/responses, transplant scenarios, simulated-hospital events, appointments/bookings, reconciliation, messaging, pair proposals, consent/exits, notifications, privacy, retention, health, operations, reset, and evidence. Each mutation requires authenticated scope, validation, authorization, transaction-time version check, and an auditable result. There is no automatic matching or ranking; candidate links are Staff-confirmed and unranked. Response projections omit prohibited clinical, counterpart, and secret fields.

Hospital adapters accept only allowlisted signed envelopes with source ID, event ID, schema/version, issued/observed time, nonce, sequence/version, payload hash, and signature. Verify before parsing sensitive payload; reject invalid signature, schema, timestamp, nonce, scope, or ordering safely. Persist accepted envelopes and hashes before applying an idempotent projection. Duplicates return the prior outcome; conflicts and dead letters pause unsafe advancement and retain evidence. Manual fallback records hospital confirmation reference, actor, reason, time, and later reconciliation; it is visibly manual.

Appointment creation uses a transactional outbox and simulated-hospital evidence. The shared server signer signs event envelopes; the console never signs or writes directly. A booking is confirmed only by simulated-hospital evidence and protected slot state. No clinical eligibility, allocation, clearance, or urgent-response replacement is implemented.

## No-live-use boundary

This specification is synthetic-only for business workflows and records. No record, fixture, contract double, workflow, UI, API, or evidence from this demo may be used as a live hospital, blood-service, organ, eGov, pilot, or production system. Living- and deceased-donor kidney workflows are synthetic simulation only and remain disabled for live use.

### Official eGov staging SSO Citizen login in all environments (2026-09-21)

Official eGov staging SSO is the only runtime Citizen login in every environment, superseding the prior local synthetic invitation-login boundary. Provider doubles are automated test fixtures only. Partner secrets/tokens are server-only; exchange failures and staging failures fail closed without synthetic-success fallback. Only provider staging/test identities and synthetic eBuhay business records are allowed. Hospital Staff authentication remains separate, and eGov Citizen identity never grants Staff authority or live approval. No production/live deployment, real clinical/hospital records, or inferred government endorsement is authorized. Authentication invitations are superseded, while case and pair workflow invitations remain. eMessage remains disabled until a bounded authenticated notification workflow exists.

### Approved eGovChain staging exception (2026-09-18)

Actual eGovChain STAGING transactions are permitted only for synthetic donor/recipient cases. The proof is a zero-fee, hash-only transaction on chain ID 13371, submitted with a server-side RPC token and signer; PostgreSQL remains authoritative for versioned, per-purpose case and pairing consent. Anchoring is asynchronous, remains visibly pending while unresolved, and never fabricates a successful receipt. Synthetic identities, cases, and hospital records remain the only business data. This exception does not authorize production, legal or clinical consent, live-hospital integration, live eGov identity authorization, or launch; signed-write and receipt verification remain pending. [ADR 0012](../../docs/adr/0012-record-egovchain-staging-and-case-consent-boundaries.md) records the accepted boundaries. The [draft consent specification](../../tasks/spec-egovchain-consent-staging.md) is for review before further implementation.

## Security, privacy, and operations

Keep the single synthetic deployment, database, environment-provided secrets, telemetry, and fixtures isolated and visibly labelled. Synthetic records are resettable. Enforce least privilege, session controls, audit, redaction, CSRF/origin checks, rate limits, and server-side signing.

External integrations, live credentials, external providers, and service-level promises are outside this synthetic demo except for the bounded hosted staging exception above. No live use or production deployment is permitted by this spec.

## Runtime, migration, and recovery

Configuration validation fails closed for missing/unsafe origin, database, or environment-provided secret settings. Worker leases and idempotency tolerate restart. Shutdown drains requests and outbox work with a bounded deadline. Synthetic initialization uses resettable fixtures. Browser and console state are never authority. Backups, when exercised, remain synthetic and are evidenced with measured restore results.

## Highest-seam test strategy

Prefer black-box HTTP plus browser acceptance against a disposable PostgreSQL database and the simulated-hospital console. Cover the synthetic stories, role/privacy projections, ownership checks, session behavior, signed event rejection/idempotency/replay/order/conflict, outbox restart/retry, booking authority, reconciliation, notifications, encryption/key rotation, privacy rights, legal holds/deletion, kill switches, reset boundaries, backup/restore, and legacy-browser non-authority. Run concurrency and accessibility checks with measured results. Retain immutable demo artifacts, source revision, synthetic environment, fixtures, and accountable reviewer.

## Synthetic execution plan

The demo progresses through synthetic foundation, blood and multi-organ simulation, then measured demo readiness. Every business stage remains synthetic, resettable, visibly labelled, and live-disabled. Official eGov staging SSO is the only runtime Citizen login in every environment; provider doubles are tests only; controlled-live and production promotion are explicitly out of scope.

The 27 issue files are the dependency-ordered synthetic execution plan. Tickets 01–23 establish the synthetic runtime, security, identity, coordination, privacy, operations, authority, and continuity seams; ticket 24 records measured demo evidence; tickets 25–27 define synthetic hospital foundation, blood and multi-organ simulation, and demo readiness. Each ticket's blockers and acceptance checklist are binding.

## Explicit external blockers

External partner, clinical, legal, hosting, and production approvals are intentionally out of scope. They must not be inferred from synthetic implementation or evidence; a future live project would require a separate approved specification.

## Mandatory out of scope

- Clinical diagnosis, advice, eligibility, compatibility, clearance, consent determination, outcomes authority, allocation, ranking, matching, procurement, collection, testing, transplant/removal, or urgent-response replacement.
- Apart from official eGov staging APIs (official staging SSO for Citizen login, staging eGovChain consent anchoring, and staging eMessage), real eGov production, hospital, blood-service, organ, payment, AI, analytics, or third-party integrations are out of scope; healthcare doubles remain synthetic simulations only.
- Contact/name-based identity merge, runtime invitation-as-login in any environment (authentication invitations superseded; case/pair workflow invitations remain; provider doubles are tests only), citizen role selection, direct Doctor chat, unrestricted pair identity disclosure, or guaranteed anonymity beyond bounded controls.
- Minors, incapacity/representatives, family/shared accounts, multiple-hospital transfer, research/secondary use, cross-border processing, or unapproved health-record/raw-test storage.
- Fixed retention durations, legal basis, clinical sign-off rules, arbitrary service targets, or provider contracts are out of scope for this demo.
- Browser/local-storage workflow authority, synthetic-to-live data promotion, unapproved live activation or expansion, or claims that this document or synthetic evidence constitutes production readiness.
