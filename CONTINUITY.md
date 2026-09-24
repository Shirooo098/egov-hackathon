# Continuity

## Snapshot
- 2026-09-23 [USER] Goal: finish official eGov tickets first, then unblock synthetic hospital demo; confirmed SSO, Chain, Message, AI, and optional standalone Face Liveness; eVerify is explicitly absent from the product.
- 2026-09-23 [USER] Work on a `{feature}` branch, commit each accomplishment, never push, and never use a `codex/*` branch.
- 2026-09-23 [CODE] Current branch: `feature/official-egov-open-tickets`.
- 2026-09-24 [TOOL] Ticket03 Chain reorg sweep (`fdda661`), expanded server suite (`02eebdd`), obsolete simulated Besu removal (`f06795f`), and Ticket08 failed-logout fix (`291b745`) are committed. Unrelated staged synthetic specs and user-owned `AGENTS.md` remain untouched.
- 2026-09-24 [USER] Supplied the SSO guide again and confirmed the credential-issued URL, partner code, and secret are configured in `server/.env`; do not expose their values. The guide does not define `state`/nonce.
- 2026-09-23 [USER] Resumed available-ticket work; include `.scratch/official-egov-integrations/issues`. Current implementation covers safe Ticket 01 work and Ticket 02; preserve external gates and all ticket scope.
- 2026-09-23 [TOOL] Astra Ticket01 safe slice and Ticket02 correction completed; conversation `2f06993a-41e4-48d5-9038-b20b7ee11785` terminal (exit0/SUCCESS). Codex verification/review complete. No active agent or process.
- 2026-09-23 [USER] Commit each verified accomplishment on the existing feature branch; do not push. Preserve unrelated staged specification work. This supersedes this turn's no-commit default.
- 2026-09-24 [CODE] Now: Tickets 01/08 SSO, Ticket04 eMessage consent/error redaction and ambiguous-2xx handling, Ticket03 truthful chain status, receipt sweep, delayed-receipt handling, and local HTTP proof-state coverage, Ticket06 local AI request boundary, and Ticket07 startup plus shared response/log privacy are implemented. Obsolete Besu simulation and misleading health label are removed. No provider call or push occurred.
- 2026-09-24 [CODE] Open: eGovPH callback correlation and partner acceptance need authenticated clarification; no provider smoke ran. Ticket 24 baseline remains unrun; isolated test DB is currently inaccessible (EACCES) in this sandbox.
- 2026-09-24 [CODE] Open: Ticket03 signed official-staging receipt, Ticket04 provider SMS acknowledgement, Ticket05/06 authenticated AI contract, Ticket07 deployment smoke, and optional Ticket09 privacy/error terms require external evidence or credentials/approval. No live provider calls ran.

## Done
- 2026-09-24 [TOOL] Ticket03 tracked Citizen consent HTTP test now covers unavailable, receipt-pending, and recorded verified proof fields; SQL selection and response redaction assertions exclude raw evidence/salt and internal outbox fields. Astra explorer and Codex tester verified the seam.
- 2026-09-24 [TOOL] Ticket03 pending signed transaction remains recoverable past eight worker leases without duplicate broadcast; malformed receipts cap as unavailable. Antigravity worker and independent review surfaced and closed a test-fidelity gap and invalid-receipt retry gap; full server suite 105/105 and typecheck passed.
- 2026-09-24 [TOOL] Ticket01/07 unmatched callback 404 responses, unknown route logs, and unexpected error logs no longer copy untrusted URL/body/exception content; tracked canary regressions pass.
- 2026-09-24 [TOOL] Ticket06 local AI endpoint now rejects extra request data or invalid categories; the official client payload remains deferred, and user-visible retry guidance is asserted. Independent review found no material issue.
- 2026-09-24 [TOOL] Ticket04 undocumented `200`/`204` SMS responses stay unavailable/unconfirmed without an automatic second send; Antigravity worker implemented the fix, and independent review and verification passed.
- 2026-09-24 [TOOL] Commit `291b745` preserves the Citizen or Staff session when eBuhay logout is unconfirmed and corrects Ticket01/08 exchange-code wording to match the supplied SSO guide; client tests/build passed.
- 2026-09-24 [TOOL] Commit `f06795f` removes unused simulated Besu success and automatic demo anchoring; health reports staging configuration without a receipt claim. Server 95/95, client tests/build, and typechecks passed.

## Decisions
- D1 2026-09-24 [CODE] Official SSO handoff is implemented with pending identity and explicit user confirmation, without invented state/nonce; provider callback-correlation evidence and credentialed validation remain open.
- D2 2026-09-23 [CODE] Unsafe SSO work is recoverable in `stash@{0}` and must not be applied or committed.
- D3 2026-09-23 [CODE] Provider doubles are test-injected only; no runtime demo mode or plausible-success fallback.
- D4 2026-09-23 [CODE] Failed, unavailable, or ambiguous SMS outcomes are not automatically retried; in-flight `sending` requires reconciliation.
- D5 2026-09-23 [USER] Ticket 24 requires a measured automated baseline, including isolated database checks and retained evidence; manual accessibility, walkthrough, and reviewer signoff belong to Ticket 27. Applied to approved spec/ticket wording, but evidence is still incomplete.
- D6 2026-09-23 [USER] Support both official eGovPH in-app handoff and official web widget, with no eBuhay-built OTP/PIN or synthetic Citizen runtime login.
- D7 2026-09-23 [USER] Keep automatic account linking by `uniqid` only and retain a minimal SSO profile despite the guide's broader matching and mapping suggestions; clarify partner acceptance separately.
- D8 2026-09-23 [USER] In-app SSO code redemption pauses for explicit verified-identity confirmation before eBuhay session creation; no silent account switch. Keep eBuhay-only session sign-out.
- D9 2026-09-23 [USER] Authenticate Citizens first, then select donor or recipient case intent; remove the separate local Sign In/Sign Up choice.
- D10 2026-09-23 [USER] eMessage HTTP 201 means accepted request, not delivery; use SSO-supplied mobile with opt-in and only appointment, application-status, or document-action purposes.
- D11 2026-09-23 [USER] eGovChain uses synthetic consent data on the actual official staging chain, with anchored status only after validated receipt; runtime simulated success is prohibited.
- D12 2026-09-23 [USER] eGovAI offers curated fixed public FAQ prompts, not free-text chat. eVerify deferral superseded by D15.
- D13 2026-09-23 [USER] Face Liveness is an optional post-SSO proof-of-presence demonstration, not identity or eligibility; each session needs explicit opt-in. Superseded the tentative minimal persistent outcome audit plan by D14.
- D14 2026-09-23 [USER] Liveness completion requires provider `SUCCEEDED` and score >=95, but displays only a binary message; hosted redirect triggers server-side verification bound to a pending Citizen session; no persistent liveness-specific outcome, score, token, or image until its retention basis is approved. Runtime remains deferred pending authenticated contract, retention terms, privacy notice, and safety checks.
- D15 2026-09-23 [USER] No eVerify feature at all: remove user-facing placeholder and runtime API/provider path/credentials; optional Face Liveness is independent. This supersedes the earlier deferred-eVerify treatment.
- D16 2026-09-24 [CODE] Ticket04 stores only current SSO mobile, resets consent on changed/missing mobile, checks it at notification record and dispatch, and uses generic messages for three approved purposes; credentialed staging remains open.
- D17 2026-09-24 [USER] The supplied SSO guide exposes the short-lived exchange code in the eGovPH launch URL or official widget callback. Ticket01/08 now require prompt server redemption and exclusion from eBuhay responses, persistence, and logs, rather than impossible browser non-exposure. A failed local logout preserves the session until server revocation is confirmed.

## Working set
- `server/src/worker.ts`
- `server/src/services/EgovChainService.ts`
- `server/tests/egovchain-pending.test.ts`
- `server/tests/egovchain-consent.test.ts`
- `.scratch/official-egov-integrations/issues/03-official-egovchain-consent-proof.md`

## Receipts
- 2026-09-24 [TOOL] Ticket03 local HTTP gap: Antigravity explorer `d15725e4-3ecd-4326-8ea7-3d8e7e51aae3` exited 0/SUCCESS and identified missing verified receipt evidence on the public route. Independent Codex tester ran focused consent suite 5/5 and server typecheck exit0; root ran full server suite 105/105. No real DB or provider call ran.
- 2026-09-24 [TOOL] Ticket03 pending recovery Antigravity explorer `7f1f9039-33de-4078-8c7c-04d8094a49f3` and worker `5239434d-140f-497e-a270-05a30bd7ddc3` exited 0/SUCCESS. Independent reviewer identified SQL-fake and invalid-receipt gaps; root corrected both. Focused pending 6/6, full server 105/105, typecheck passed. Codex tester was usage-limited before running; no provider or real PostgreSQL check ran.
- 2026-09-24 [TOOL] Ticket01/07 Antigravity explorer `b7301c85-32d5-4afc-bb8d-635fc56db8f9` returned partial/no finding at 10-minute print timeout; root verified the leak in source. Worker `4bef04b7-0712-469b-b1d1-c6a536400655` exited 0/SUCCESS and reproduced failing 404/error-log canaries before fixing. Worker tests initially landed in ignored `api-security.test.ts`; root restored that file and moved regressions into tracked official suite. Independent tracked tests 7/7, server full suite 99/99, typecheck and lint exited 0 (existing lint warnings); final independent review found no material issue. No provider call ran.
- 2026-09-24 [TOOL] Ticket06 Antigravity explorer `e1f198ca-998d-4096-84ff-1a24479cb31b` and worker `2f847d66-a1a0-4469-8dc1-a1d7b83e2621` exited 0/SUCCESS. Worker reproduced extra-data `503` before fix. Independent client focused 5/5 and both typechecks passed; independent server test initially could not start (`uv_os_get_passwd` ENOMEM), then root reran with temporary userInfo shim: focused 5/5, full server 97/97. Worker reported full client 84/84 Vitest plus 15/15 node. No provider call ran.
- 2026-09-24 [TOOL] Ticket04 ambiguous 2xx: Antigravity explorer `60bd335a-54e5-4a2c-b2cb-8722b201eb05` and worker `adb823ae-0012-4519-8315-91db4dbbe455` exited 0/SUCCESS. Worker reproduced a failing regression before fixing it; full server suite 96/96 and typecheck passed. Independent tester passed focused service 6/6, dispatch 2/2, and typecheck; reviewer found no actionable issue. No provider call ran.
- 2026-09-24 [TOOL] Ticket08 failed-logout regression reproduced a false success/route change, then passed after the fix: focused client tests 24/24, full client tests exit0, production build/typecheck exit0. No provider call or deployment ran.
- 2026-09-24 [TOOL] Obsolete Besu cleanup and truthful `/api/health`: server suite 95/95 and typecheck passed; client full tests and production build/typecheck passed. Independent static review found no material server issue. Follow-up reviewer request hit account usage limit; root checked the small client diff. No provider call ran.
- 2026-09-24 [TOOL] Tracked provider-boundary tests omitted from `npm test` passed 30/30 in isolation; after adding them, the full server suite passed 95/95. The stale `demo-mode.test.ts` was removed with the obsolete simulated Besu service.
- 2026-09-24 [TOOL] Ticket03 reorg sweep/receipt hash binding: Antigravity worker `f01a1c5b-d7a3-4adb-b4f0-2b120190ea07` exited 0/SUCCESS; final focused tests 10/10, full server suite 61/61, and typecheck passed with Windows userInfo shim. Independent reviewer found both P2 issues closed. No real staging receipt or SQL integration was exercised.
