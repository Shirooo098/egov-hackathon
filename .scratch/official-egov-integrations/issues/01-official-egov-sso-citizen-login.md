# 01 — Official eGov SSO-only Citizen login

**What to build:** Complete the official in-app `exchange_code` handoff as the only Citizen session authority, with server-side exchange, minimal identity, `uniqid`-only linking, and explicit verified-identity confirmation before a local session. The official web-widget entry and post-login case choice are Ticket 08.

**Open verification:** Approved credentialed staging validation remains open. The provider's callback-correlation mechanism is undocumented in the available evidence and remains an explicit unknown; the implementation must fail closed rather than infer `state`/nonce semantics.

**Provider evidence — 2026-09-27:** The existing backend `verifyEgovExchange` successfully redeemed a user-supplied fresh test code and retrieved its profile, both HTTP 200. The verifier accepted required identity/name fields and a valid mobile. [Redacted evidence](../evidence/sso-provider-smoke-2026-09-27.json) records this limited provider check at source `863e4d5`; no account, pending identity or app session was created. It does not establish deployed callback/widget/confirmation behavior or partner correlation. The redeemed code and profile values are not retained.

**Status:** open — official in-app handoff, pending confirmation, `uniqid`-only session creation, replay protection, and HTTP failure/cancellation checks are implemented; actual staging verification remains open. Any concrete unresolved authentication vulnerability blocks completion.

Local HTTP fixtures verify that malformed provider profiles and provider outages create no pending identity or session and disclose no code, token, or secret in the response. An unmatched callback URL also cannot echo its exchange code through the generic 404 response or request log. Cancellation consumes the pending identity and blocks later confirmation. These fixtures do not prove the partner's callback-correlation behavior or a real staging handoff.

A local HTTP regression also verifies that an active Citizen session blocks widget exchange, in-app callback, and pending confirmation before provider use or identity writes. This does not replace actual staging verification; provider callback correlation remains an explicit unknown.

Malformed pending confirmation and cancellation IDs now return `422` before reaching PostgreSQL's UUID parser; the HTTP regression also verifies that a malformed cancellation cannot consume the valid pending identity.

A 2026-09-25 read-only Agy explorer audit found no further material local gap in the scoped in-app exchange, pending confirmation, account-linking, and test paths. It does not establish a credentialed staging handoff; callback correlation is recorded as unknown rather than inferred.

- [ ] A valid official staging in-app handoff exchanges its single-use code server-side and shows a pending verified identity without creating an eBuhay session yet.
- [x] Explicit Citizen confirmation creates the HttpOnly eBuhay session; cancellation creates none, and an uncorrelated code never silently replaces an existing account session.
- [x] Citizen accounts are created or linked only by provider plus stable `uniqid`; names, email addresses, and mobile numbers never trigger automatic merging.
- [ ] Authentication fails closed when `uniqid` is missing, the provider response is malformed, or the provider is unavailable.
- [ ] Partner secrets and access tokens remain server-side. The short-lived exchange code is exposed only by the documented eGovPH launch URL or widget callback and is redeemed promptly by the backend; it is absent from eBuhay responses, persistence, and application logs.
- [x] Runtime synthetic invitation login and generated Citizen identities are removed; provider doubles remain test-only.
- [x] Citizen SSO never grants Hospital Staff authority.
- [x] The callback rejects replay and handles initial session restoration without overwriting a successful login.
- [x] Callback-correlation behavior is explicitly recorded as unknown; unsupported or ambiguous paths fail closed instead of assuming `state`/nonce behavior, and any concrete unresolved authentication vulnerability blocks completion.
- [ ] HTTP-level tests cover pending and confirmed states, cancellation, failure, replay, identity linking, session creation, and secret exclusion.
