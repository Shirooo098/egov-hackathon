# 04 — Official opted-in eMessage notifications

**What to build:** Send a narrow set of consented transactional SMS notifications through the official eMessage staging API using authenticated server-side workflow triggers and truthful provider status.

**Blocked by:** 01 — Official eGov SSO-only Citizen login.

**Status:** in progress — official SSO mobile is the only SMS destination, with explicit opt-in and revocation; documented `201 Created` records accepted without a delivery claim. Undocumented `200`/`204` responses remain unconfirmed and unavailable for reconciliation, with no automatic retry. Arbitrary short provider exception text is redacted to a generic error before return or audit persistence. Credentialed staging and full workflow validation remain open.

Local regression checks now reject anonymous and cross-origin SMS consent writes and prove that an unavailable provider attempt is recorded without a second automatic send or secret-bearing audit value. The full authenticated workflow and staging acceptance gate remains open.

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
