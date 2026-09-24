# 08 — Official web-widget and post-SSO journey

**What to build:** Complete the official web-widget Citizen entry alongside Ticket 01's in-app handoff, then let an authenticated Citizen choose donor or recipient case intent and end only the local eBuhay session.

**Blocked by:** 01 — Official in-app SSO identity and session boundary.

**Status:** in progress — documented widget and post-authentication case choice are implemented; local sign-out now retains the session when server revocation is unconfirmed; the in-app SSO evidence gate in Ticket 01 and credentialed validation remain open

- [x] The official web widget uses only provider-documented launch and return behavior; eBuhay adds no independent OTP, PIN, synthetic login, or guessed provider URL.
- [ ] Both official entry paths create or use the same `uniqid`-linked Citizen account and never grant Hospital Staff authority.
- [ ] Partner secrets and provider access tokens remain server-side. The documented widget callback's short-lived exchange code is sent only to the backend for redemption and is absent from eBuhay responses, persistence, and application logs.
- [x] A Citizen chooses donor or recipient case intent only after authentication; the choice does not create a second account type or a separate local Sign In/Sign Up route.
- [x] Signing out revokes the local eBuhay session without claiming to end the eGovPH session.
- [ ] HTTP and user-visible tests cover web-widget return, session restoration, case choice, sign-out, malformed/unavailable provider responses, and no silent account switch.
