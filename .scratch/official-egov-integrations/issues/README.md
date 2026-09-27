# Official eGov ticket status

Updated 2026-09-27 from the individual ticket records and retained local checks.
**1 complete; 1 open for runtime alignment; 7 blocked.** Blocked does not erase
implemented work or passing local checks; it means the full acceptance gate is open.

| Ticket | Status | Still needs to be accomplished / blocker |
| --- | --- | --- |
| [01 — Citizen SSO](01-official-egov-sso-citizen-login.md) | **Blocked** | Obtain partner callback-correlation and acceptance evidence; validate actual in-app staging sign-in and confirmation. Local handoff/session/replay checks are implemented. |
| [02 — Remove eVerify](02-remove-everify-and-hold-liveness.md) | **Complete** | No remaining work in this ticket. eVerify removed; Face Liveness held unavailable. |
| [03 — Read-only Chain](03-official-egovchain-consent-proof.md) | **Open** | Align runtime with ADR0016: issued URL/token only, documented chain/gas/block reads, no signer or consent broadcast/anchor claims; then retain authorized staging evidence. No Citizen SSO dependency for network metadata. |
| [04 — eMessage](04-official-opted-in-emessage-notifications.md) | **Blocked** | Depends on 01; validate official `201` acknowledgement using an approved opted-in SSO destination; obtain and implement approved ambiguous-send reconciliation. Local consent, authorization, audit and PostgreSQL checks pass. |
| [05 — AI contract](05-capture-authenticated-egovai-contract.md) | **Blocked** | Obtain redacted authenticated token/inference schemas, error/quota behavior and applicable privacy/retention terms. Configured credentials and success examples do not close this gate. |
| [06 — AI public guidance](06-official-egovai-public-guidance.md) | **Blocked** | Depends on 05; implement and verify the approved official provider contract and curated FAQ staging response. Fixed FAQ choices and local request restrictions are already implemented. |
| [07 — Deployment validation](07-official-only-deployment-validation.md) | **Blocked** | Depends on 01/03/04/05/06/08; supply approved deployment/test inputs and call authorization, then retain complete staging smoke evidence. Local structural checks and runbook are ready. |
| [08 — Widget / post-SSO](08-official-web-widget-and-post-sso-journey.md) | **Blocked** | Depends on 01; validate both real staging entry paths use the same account and preserve Citizen/Staff separation, case choice and local sign-out. Local widget/journey checks are implemented. |
| [09 — Optional Face Liveness](09-optional-standalone-face-liveness.md) | **Blocked — optional** | Depends on 01 and provider error/expiry/binding/retention terms, privacy approval and safety review; then implement and validate the optional hosted flow. Does not block 07. |

Individual ticket acceptance checklists remain authoritative. No unchecked item is
declared complete by this summary. A limited [local-backend SSO provider check](../evidence/sso-provider-smoke-2026-09-27.json) passed token/profile operations; its mobile did not match the approved SMS destination. Complete deployed staging smoke checks have not run.
Follow the [staging smoke runbook](../../../docs/OFFICIAL_EGOV_STAGING_SMOKE.md)
when its approved inputs and contracts are available; keep credentials in the
server environment, not in tickets or evidence.

A separately authorized [standalone local SMS provider test](../evidence/emessage-provider-smoke-2026-09-27.json) returned HTTP201/accepted for the controlled destination ending4218. The recipient confirmed receipt; the complete opted-in Citizen workflow remains unverified; this does not close Ticket04.

Requirement provenance (2026-09-27): provider requirements come from supplied documentation; project safeguards are not additional provider credentials. Undocumented behavior remains explicitly unconfirmed, not an invented mandatory provider field or API.

- 01/08: documented exchange-code/token/profile/widget flow; project confirmation, uniqid-only linking and Staff separation; callback-correlation and partner acceptance remain unconfirmed.
- 03: documented URL/token and chain/gas/block reads; signed consent anchoring deferred by user decision. No signer provision or receipt is a current completion gate.
- 04: documented SMS push and HTTP201; project opt-in, SSO-mobile routing, generic purposes and audit safeguards; provider reconciliation capabilities remain unconfirmed. Standalone recipient-confirmed test is retained.
- 05/06: supplied AI success examples and configured credentials are available; authenticated errors/quota and applicable retention remain unconfirmed. Curated prompts, privacy and truthful failure handling are project safeguards.
- 07: aggregate project deployment gate for enabled integrations, including revised read-only Chain scope; optional09 does not block it.
- 09: documented liveness create/result and SUCCEEDED/95 threshold; project session binding/opt-in/data minimization; provider expiry/error/retention details remain unconfirmed.
