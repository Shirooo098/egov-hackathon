# Official eGov ticket status

Updated 2026-09-28 from the individual ticket records and retained local checks.
**2 complete; 6 open; 1 optional deferred.** Open records remaining staging,
provider, or runtime verification; it does not erase implemented work or passing
local checks.

| Ticket | Status | Still needs to be accomplished / blocker |
| --- | --- | --- |
| [01 — Citizen SSO](01-official-egov-sso-citizen-login.md) | **Open** | Validate actual in-app staging sign-in and confirmation. Callback-correlation behavior remains an explicit provider unknown; concrete unresolved authentication vulnerabilities block completion. Local handoff/session/replay checks are implemented. |
| [02 — Remove eVerify](02-remove-everify-and-hold-liveness.md) | **Complete** | No remaining work in this ticket. eVerify removed; Face Liveness held unavailable. |
| [03 — Read-only Chain](03-official-egovchain-consent-proof.md) | **Open** | Read-only runtime is implemented and locally checked; retain authorized actual staging chain/gas/block evidence. No Citizen SSO dependency for network metadata. |
| [04 — eMessage](04-official-opted-in-emessage-notifications.md) | **Open** | Validate official `201` acknowledgement using an approved opted-in SSO destination. Ambiguous sends remain unconfirmed with no automatic retry or new reconciliation tooling required. Local consent, authorization, audit and PostgreSQL checks pass. |
| [05 — AI contract](05-capture-authenticated-egovai-contract.md) | **Complete — documentation-only** | Supplied token/inference success schemas, source lines, privacy limits, and unknowns are recorded. Provider implementation and staging verification remain outside this documentation-only completion. |
| [06 — AI public guidance](06-official-egovai-public-guidance.md) | **Open** | Curated FAQ provider flow and failure handling are implemented and locally checked; retain an actual official staging FAQ response. |
| [07 — Deployment validation](07-official-only-deployment-validation.md) | **Open** | Supply approved deployment/test inputs and call authorization, then retain complete staging smoke evidence. Local structural checks and runbook are ready. |
| [08 — Widget / post-SSO](08-official-web-widget-and-post-sso-journey.md) | **Open** | Validate both real staging entry paths use the same account and preserve Citizen/Staff separation, case choice and local sign-out. Local widget/journey checks are implemented. |
| [09 — Optional Face Liveness](09-optional-standalone-face-liveness.md) | **Deferred — optional** | Separate optional privacy, provider, and safety work remains deferred. Does not block 07. |

Individual ticket acceptance checklists remain authoritative. No unchecked item is
declared complete by this summary. A limited [local-backend SSO provider check](../evidence/sso-provider-smoke-2026-09-27.json) passed token/profile operations; its mobile did not match the approved SMS destination. Complete deployed staging smoke checks have not run.
Follow the [staging smoke runbook](../../../docs/OFFICIAL_EGOV_STAGING_SMOKE.md)
when its approved inputs and contracts are available; keep credentials in the
server environment, not in tickets or evidence.

A separately authorized [standalone local SMS provider test](../evidence/emessage-provider-smoke-2026-09-27.json) returned HTTP201/accepted for the controlled destination ending4218. The recipient confirmed receipt; the complete opted-in Citizen workflow remains unverified; this does not close Ticket04.

Requirement provenance (2026-09-27): provider requirements come from supplied documentation; project safeguards are not additional provider credentials. Undocumented behavior remains explicitly unconfirmed, not an invented mandatory provider field or API.

- 01/08: documented exchange-code/token/profile/widget flow; project confirmation, uniqid-only linking and Staff separation; callback-correlation remains an explicit provider unknown.
- 03: documented URL/token and chain/gas/block reads; signed consent anchoring deferred by user decision. No signer provision or receipt is a current completion gate.
- 04: documented SMS push and HTTP201; project opt-in, SSO-mobile routing, generic purposes and audit safeguards; provider reconciliation capabilities remain unconfirmed. Standalone recipient-confirmed test is retained.
- 05/06: supplied AI success examples and configured credentials are available; authenticated errors/quota and applicable retention remain documented unknowns. Curated prompts, privacy and truthful failure handling are project safeguards.
- 07: aggregate project deployment gate for enabled integrations, including revised read-only Chain scope; optional09 does not block it.
- 09: documented liveness create/result and SUCCEEDED/95 threshold; project session binding/opt-in/data minimization; provider expiry/error/retention details remain unconfirmed.
