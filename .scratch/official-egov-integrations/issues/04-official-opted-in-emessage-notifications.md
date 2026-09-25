# 04 — Official opted-in eMessage notifications

**What to build:** Send a narrow set of consented transactional SMS notifications through the official eMessage staging API using authenticated server-side workflow triggers and truthful provider status.

**Blocked by:** 01 — Official eGov SSO-only Citizen login.

**Status:** in progress — official SSO mobile is the only SMS destination, with explicit opt-in and revocation; the three generic outbound SMS templates explicitly say they are simulated demo updates. Documented `201 Created` records accepted without a delivery claim, and the Citizen dashboard now shows recent request status as “Accepted by eMessage — delivery unconfirmed.” Undocumented `200`/`204` responses remain unconfirmed and unavailable for reconciliation, with no automatic retry. Arbitrary short provider exception text is redacted to a generic error before return or audit persistence. Credentialed staging and full workflow validation remain open.

Local regression checks now reject anonymous and cross-origin SMS consent writes and prove that an unavailable provider attempt is recorded without a second automatic send or secret-bearing audit value. An HTTP fixture checks accepted and unavailable SMS list/detail statuses, excludes raw provider error text, and rejects a direct Citizen dispatch request; accepted summaries remain visibly synthetic without claiming delivery. The test-only SMS handler now rejects unsupported `sent` and `delivered` success fixtures as unavailable. Authenticated Staff trigger coverage, real-database validation, and staging acceptance remain open.

A 2026-09-25 source audit found no operator route for resolving an ambiguous or interrupted `sending` notification: the current reconciliation routes cover hospital events and appointment outbox items only. Dispatch now writes the notification outcome, delivery attempt, and a metadata-only `audit_events` record in one database statement. Provider status/reconciliation behavior or an approved manual-evidence workflow is still needed before a submission can be resolved without risking a duplicate send. Real-database and credentialed staging checks remain open.

- [x] SMS consent defaults to off, requires explicit opt-in, and can be revoked immediately.
- [x] A mobile number received through SSO does not itself enroll a Citizen in SMS notifications.
- [x] Only the opted-in mobile number supplied by official SSO is used; an unverified manually entered number is not a destination.
- [x] Approved purposes are limited to appointment changes, application-status updates, and document-action reminders.
- [x] Message bodies are generic and exclude medical or sensitive case details.
- [x] Only authenticated and authorized Staff or system workflows can initiate a message; no arbitrary public SMS relay exists.
- [x] The documented `201 Created` response is accepted as “Accepted by eMessage,” with delivery unconfirmed; an undocumented message ID or `sent`/`delivered` field is not required for request acceptance.
- [ ] Rejected, unavailable, malformed, and ambiguous submissions remain truthful; ambiguous submissions are reconciled rather than automatically retried or called delivered. Local `200`/`204` and no-retry regressions pass; provider reconciliation remains unverified.
- [ ] Credentials and message bodies are excluded from logs; audit metadata records the actor, purpose, internal request, time, and provider correlation identifier when supplied.
- [ ] HTTP-level tests cover opt-in, revocation, SSO-mobile-only destination, authorization, approved purposes, generic content, documented `201` acceptance, provider failure, and absence of a delivery claim.
