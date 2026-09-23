# 07 — Official-only deployment and staging validation

**What to build:** Validate that the Vercel staging deployment enables only correctly configured official eGov integrations, reports real provider state truthfully, and preserves synthetic healthcare-data boundaries.

**Blocked by:** 01 — Official in-app SSO; 02 — Remove eVerify and keep Face Liveness fail-closed; 03 — Official eGovChain consent proof; 04 — Official opted-in eMessage notifications; 06 — Official eGovAI public guidance (which requires 05); 08 — Official web-widget and post-SSO journey. Ticket 09 is optional and does not block this core gate.

**Status:** blocked by the listed tickets and credentialed staging evidence; prior package checks alone do not complete this ticket

- [ ] Every enabled integration validates its credential-issued HTTPS base URL and required secrets during deployment startup.
- [ ] Missing or malformed credentials prevent an enabled feature from starting; runtime provider outages produce clear unavailable responses.
- [ ] Audit logs include only feature, internal request, provider status, time, actor, and provider correlation metadata and exclude credentials, tokens, exchange codes, message bodies, and unnecessary personal data.
- [ ] UI labels verified SSO identity, accepted SMS request, and anchored consent only with their respective official evidence; SMS acceptance is never called delivery.
- [ ] Credentialed staging smoke checks cover both official SSO entry paths, confirmation, an actual eGovChain receipt, an opted-in eMessage `201 Created` acknowledgement, and a curated public eGovAI FAQ.
- [ ] No eVerify feature or provider call is present; Face Liveness remains unavailable unless separately enabled through Ticket 09.
- [ ] Smoke checks use approved staging identities and synthetic healthcare records, never print secrets, and remain separate from ordinary CI.
- [ ] Server and client typechecks, targeted provider-boundary tests, and the production client build pass.
- [ ] Deployment documentation states that production or controlled-live use is not authorized.
