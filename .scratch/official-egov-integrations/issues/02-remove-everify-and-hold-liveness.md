# 02 — Remove eVerify; keep Face Liveness fail-closed

**What to build:** Remove eVerify as a product feature, including its UI entry points, placeholder, runtime provider/API path, and credential dependency. Keep optional standalone Face Liveness unavailable until its separate provider/privacy gates pass in Ticket 09; never generate a liveness result.

**Blocked by:** None — can start immediately.

**Status:** complete — verified at commit b51b67a (2026-09-23); eVerify removed entirely, Face Liveness remains unavailable

**Evidence:** Astra implementation followed by independent source review and Codex verification. Final focused checks: removal HTTP 4/4, official deferrals 4/4, API security 12/12, SSO boundary 4/4; server typecheck passed. Client tests, lint and build passed; server package tests passed 52/52. The final auth-routing edit was covered by the focused server rerun. No provider smoke or deployment was performed.

- [x] No user-facing eVerify control, unavailable placeholder, or verification claim remains.
- [x] No operational eVerify endpoint, provider call, credential, PhilSys profile, PCN, or PASS result remains; legacy requests fail closed without provider calls.
- [x] Until Ticket 09's gates pass, Face Liveness is clearly unavailable and creates no session, score, token, or plausible-success result.
- [x] Provider, configuration, and network failures remain failures and never fall back to plausible demo success.
- [x] Neither removed eVerify paths nor unavailable Face Liveness can influence Citizen authentication, eligibility, matching, or Staff authority.
- [x] UI and HTTP tests prove eVerify is absent and the remaining Face Liveness surface fails closed without fabricated output.
