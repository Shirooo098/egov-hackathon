# 01 — Official eGov SSO-only Citizen login

**What to build:** Complete the official in-app `exchange_code` handoff as the only Citizen session authority, with server-side exchange, minimal identity, `uniqid`-only linking, and explicit verified-identity confirmation before a local session. The official web-widget entry and post-login case choice are Ticket 08.

**Blocked by:** None — can start immediately.

**Status:** in progress — runtime synthetic authentication and authentication invitations removed; authenticated callback-correlation clarification is still required before implementing the official handoff and completing this ticket

- [ ] A valid official staging in-app handoff exchanges its single-use code server-side and shows a pending verified identity without creating an eBuhay session yet.
- [ ] Explicit Citizen confirmation creates the HttpOnly eBuhay session; cancellation creates none, and an uncorrelated code never silently replaces an existing account session.
- [ ] Citizen accounts are created or linked only by provider plus stable `uniqid`; names, email addresses, and mobile numbers never trigger automatic merging.
- [ ] Authentication fails closed when `uniqid` is missing, the provider response is malformed, or the provider is unavailable.
- [ ] Exchange codes, partner secrets, and access tokens never reach the browser, persistence, or application logs.
- [ ] Runtime synthetic invitation login and generated Citizen identities are removed; provider doubles remain test-only.
- [ ] Citizen SSO never grants Hospital Staff authority.
- [ ] The callback rejects replay and handles initial session restoration without overwriting a successful login.
- [ ] The provider's actual callback-correlation behavior is documented from authenticated partner evidence; an unsupported or ambiguous path fails closed instead of assuming `state`/nonce behavior.
- [ ] HTTP-level tests cover pending and confirmed states, cancellation, failure, replay, identity linking, session creation, and secret exclusion.
