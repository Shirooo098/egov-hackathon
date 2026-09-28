# 08 — Official web-widget and post-SSO journey

**What to build:** Complete the official web-widget Citizen entry alongside Ticket 01's in-app handoff, then let an authenticated Citizen choose donor or recipient case intent and end only the local eBuhay session.

**Open verification:** 01's SSO identity and session boundary are implemented locally; actual credentialed verification of both official entry paths remains open.

**Status:** open — documented widget and post-authentication case choice are implemented; local sign-out now retains the session when server revocation is unconfirmed; actual credentialed validation remains open.

Local HTTP coverage now rejects widget exchange and in-app callback during an active Citizen session with `409 session_exists`, and rejects pending confirmation without replacing that session. This is local fixture evidence only.

A tracked client regression now invokes the official widget callback with a malformed return, verifies that an accessible retry alert appears, and confirms that no CSRF or backend exchange starts. The documented successful widget return and restored-session tests remain in the same client suite; actual staging verification is still open.

A 2026-09-25 read-only Agy explorer audit found no further material local gap in the scoped widget return, pending confirmation, and session boundaries. Both credentialed entry-path checks remain open; provider callback correlation is recorded as unknown, not a generic partner-evidence deliverable.

- [x] The official web widget uses only provider-documented launch and return behavior; eBuhay adds no independent OTP, PIN, synthetic login, or guessed provider URL.
- [ ] Both official entry paths create or use the same `uniqid`-linked Citizen account and never grant Hospital Staff authority.
- [ ] Partner secrets and provider access tokens remain server-side. The documented widget callback's short-lived exchange code is sent only to the backend for redemption and is absent from eBuhay responses, persistence, and application logs.
- [x] A Citizen chooses donor or recipient case intent only after authentication; the choice does not create a second account type or a separate local Sign In/Sign Up route.
- [x] Signing out revokes the local eBuhay session without claiming to end the eGovPH session.
- [ ] HTTP and user-visible tests cover web-widget return, session restoration, case choice, sign-out, malformed/unavailable provider responses, and no silent account switch.
