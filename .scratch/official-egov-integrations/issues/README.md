# Official eGov ticket status

Updated 2026-09-27 from the individual ticket records and retained local checks.
**1 complete; 8 blocked and still requiring completion.** Blocked does not erase
implemented work or passing local checks; it means the full acceptance gate is open.

| Ticket | Status | Still needs to be accomplished / blocker |
| --- | --- | --- |
| [01 — Citizen SSO](01-official-egov-sso-citizen-login.md) | **Blocked** | Obtain partner callback-correlation and acceptance evidence; validate actual in-app staging sign-in and confirmation. Local handoff/session/replay checks are implemented. |
| [02 — Remove eVerify](02-remove-everify-and-hold-liveness.md) | **Complete** | No remaining work in this ticket. eVerify removed; Face Liveness held unavailable. |
| [03 — Consent proof](03-official-egovchain-consent-proof.md) | **Blocked** | Depends on 01; retain an actual signed synthetic staging transaction and validated canonical receipt. Local privacy, receipt, pending/reorg and UI checks do not prove a staging anchor. |
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

A separately authorized [standalone local SMS provider test](../evidence/emessage-provider-smoke-2026-09-27.json) returned HTTP201/accepted for the controlled destination ending4218. Delivery and the complete opted-in Citizen workflow remain unverified; this does not close Ticket04.
