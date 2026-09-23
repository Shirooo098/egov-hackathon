# 09 — Optional standalone Face Liveness

**What to build:** Offer an optional Citizen-initiated official staging proof-of-presence check after SSO, separate from the absent eVerify feature and without making an identity, access, eligibility, or clinical decision.

**Blocked by:** 01 — Official Citizen session; 02 — no eVerify feature and truthful liveness unavailability; authenticated Face Liveness error/status and provider-retention contract; approved privacy notice and safety review.

**Status:** blocked-external — success contract supplied; error/expiry behavior, provider/privacy gates and credentialed validation remain outstanding; does not block Ticket 07

## Contract evidence — 2026-09-24

The user-supplied Face Liveness portal excerpt agrees with the Face Liveness section of `egov-api-documentation.md`. This is documentation evidence, not an executed staging check. The API base URL is issued with credentials; do not infer it from the hosted verification URL.

- `POST /v1/liveness/session`: backend `x-api-key` and JSON body; required `action` is `redirect`, `post`, or `close`; `callback_url` is required for redirect; optional integer `delay` defaults to 3000 milliseconds. Documented HTTP 201 returns `token` and `url`.
- `GET /v1/liveness/result/{sessionToken}`: backend-to-backend `x-api-key`; documented HTTP 200 returns `status`, numeric `confidence_score`, and sensitive `reference_image_url`.
- Accept only exact `SUCCEEDED` and a score of at least 95.0. The application displays only the binary outcome and does not fetch, display, log, or persist the reference image.
- The excerpts do not specify pending/failure/expired response shapes, token lifetime, callback binding guarantees, or provider biometric retention/deletion terms. These remain open; the documented success example does not resolve them.

Ticket 02 is complete. Ticket 01's authenticated Citizen session and the remaining gates above are still prerequisites for runtime activation.

## Acceptance

- [ ] Until every external gate is approved, runtime remains unavailable and creates no fabricated session or result.
- [ ] Each session requires explicit Citizen opt-in and is bound to that authenticated Citizen's transient pending state.
- [ ] The official hosted `redirect` return triggers server-to-server retrieval of the pending session's result; redirect parameters alone cannot claim success or switch sessions.
- [ ] “Presence check completed” appears only for official `SUCCEEDED` with `confidence_score >= 95`; other completed results show “Not completed—retry,” while outages remain unavailable.
- [ ] Raw scores, session tokens, selfies, reference-image URLs, and liveness-specific outcomes are not displayed or persistently retained while the retention basis is unresolved.
- [ ] A liveness result never grants SSO identity, Staff authority, case access, eligibility, clearance, or clinical status.
- [ ] HTTP and user-visible tests cover opt-in, session binding, redirect tampering, result threshold, failure/expiry, no persistence or sensitive logging, and no access-control effect.
- [ ] A separate credentialed official-staging smoke check and documented provider/privacy approval are retained before marking this ticket complete.
