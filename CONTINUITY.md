# Continuity

## Snapshot
- 2026-09-23 [USER] Goal: finish official eGov tickets first, then unblock synthetic hospital demo; confirmed SSO, Chain, Message, AI, and optional standalone Face Liveness; eVerify is explicitly absent from the product.
- 2026-09-23 [USER] Work on a `{feature}` branch, commit each accomplishment, never push, and never use a `codex/*` branch.
- 2026-09-23 [CODE] Current branch: `feature/official-egov-open-tickets`.
- 2026-09-24 [TOOL] Ticket03 Chain reorg sweep (`fdda661`), expanded server suite (`02eebdd`), and obsolete simulated Besu removal (`f06795f`) are committed. Ticket08 failed-logout fix passed client checks and awaits a scoped commit. Unrelated staged synthetic specs and user-owned `AGENTS.md` remain untouched.
- 2026-09-24 [USER] Supplied the SSO guide again and confirmed the credential-issued URL, partner code, and secret are configured in `server/.env`; do not expose their values. The guide does not define `state`/nonce.
- 2026-09-23 [USER] Resumed available-ticket work; include `.scratch/official-egov-integrations/issues`. Current implementation covers safe Ticket 01 work and Ticket 02; preserve external gates and all ticket scope.
- 2026-09-23 [TOOL] Astra Ticket01 safe slice and Ticket02 correction completed; conversation `2f06993a-41e4-48d5-9038-b20b7ee11785` terminal (exit0/SUCCESS). Codex verification/review complete. No active agent or process.
- 2026-09-23 [USER] Commit each verified accomplishment on the existing feature branch; do not push. Preserve unrelated staged specification work. This supersedes this turn's no-commit default.
- 2026-09-24 [CODE] Now: Tickets 01/08 SSO, Ticket04 eMessage mobile consent/error redaction, Ticket03 truthful chain status and receipt sweep, and Ticket07 enabled-provider startup/documentation are committed. Obsolete Besu simulation and misleading health label are removed. No provider call or push occurred.
- 2026-09-24 [CODE] Open: eGovPH callback correlation and partner acceptance need authenticated clarification; no provider smoke ran. Ticket 24 baseline remains unrun; isolated test DB is currently inaccessible (EACCES) in this sandbox.
- 2026-09-24 [CODE] Open: Ticket03 signed official-staging receipt, Ticket04 provider SMS acknowledgement, Ticket05/06 authenticated AI contract, Ticket07 deployment smoke, and optional Ticket09 privacy/error terms require external evidence or credentials/approval. No live provider calls ran.

## Done
- 2026-09-24 [TOOL] Commit `f06795f` removes unused simulated Besu success and automatic demo anchoring; health reports staging configuration without a receipt claim. Server 95/95, client tests/build, and typechecks passed.
- 2026-09-24 [TOOL] Commit `02eebdd` adds tracked official integration regressions to regular server suite; 95/95 passed.
- 2026-09-24 [TOOL] Commit `fdda661` revokes Chain anchors on reverted receipts and binds receipts to their transaction hash; full server suite 61/61 and independent review passed.
- 2026-09-24 [TOOL] Commit `925654f` labels Citizen case/pair consent proof truthfully in the UI; rendered test, typecheck, and client build passed.
- 2026-09-24 [TOOL] Commit `759781e` covers Ticket04 HTTP authorization and provider-unavailable no-retry behavior; focused tests and typecheck passed.
- 2026-09-24 [TOOL] Commit `5070ee1` rejects arbitrary provider error text before SMS return/audit persistence; independent focused tests 7/7, typecheck, and security review passed.
- 2026-09-24 [TOOL] Commit `c8002e0` explicitly states production and controlled-live eGov use are unauthorized and closes Ticket07's documentation criterion.

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
- `client/src/context/AuthContext.tsx`
- `client/src/App.tsx`
- `client/tests/citizenRouting.test.tsx`
- `.scratch/official-egov-integrations/issues/01-official-egov-sso-citizen-login.md`
- `.scratch/official-egov-integrations/issues/08-official-web-widget-and-post-sso-journey.md`

## Receipts
- 2026-09-24 [TOOL] Ticket08 failed-logout regression reproduced a false success/route change, then passed after the fix: focused client tests 24/24, full client tests exit0, production build/typecheck exit0. No provider call or deployment ran.
- 2026-09-24 [TOOL] Obsolete Besu cleanup and truthful `/api/health`: server suite 95/95 and typecheck passed; client full tests and production build/typecheck passed. Independent static review found no material server issue. Follow-up reviewer request hit account usage limit; root checked the small client diff. No provider call ran.
- 2026-09-24 [TOOL] Tracked provider-boundary tests omitted from `npm test` passed 30/30 in isolation; after adding them, the full server suite passed 95/95. The stale `demo-mode.test.ts` was removed with the obsolete simulated Besu service.
- 2026-09-24 [TOOL] Antigravity CLI is unavailable in this sandbox: `agy models` exited 1 with profile access denied and “not logged in”; no new delegation occurred. Previous completed Antigravity results remain historical evidence only.
- 2026-09-24 [TOOL] Ticket03 reorg sweep/receipt hash binding: Antigravity worker `f01a1c5b-d7a3-4adb-b4f0-2b120190ea07` exited 0/SUCCESS; final focused tests 10/10, full server suite 61/61, and typecheck passed with Windows userInfo shim. Independent reviewer found both P2 issues closed. No real staging receipt or SQL integration was exercised.
- 2026-09-24 [TOOL] Ticket03 Citizen proof labels: rendered coordination test 10/10 and client production build/typecheck passed. Only server `verified` maps to anchored wording; pending/unavailable retain distinct wording. No real staging receipt was used.
- 2026-09-24 [TOOL] Ticket04 local HTTP consent/dispatch regressions: focused SMS tests 8/8 and server typecheck passed, then the 3 affected tests passed after a final audit-value assertion. Full authenticated workflow and credentialed staging checks remain open.
- 2026-09-24 [TOOL] Ticket04 redaction: Antigravity worker `8f2253a5-969e-4c51-ae16-4545ce844fa6` exited 0/JSON SUCCESS; reproduced short secret-like error leak test-first and fixed with a safe classification allowlist. Independent focused tests 7/7 and server typecheck passed; security review found no material issue. No provider call ran.
- 2026-09-24 [TOOL] Antigravity model/role discovery succeeded; read-only explorer `f9613dad-487c-4506-94af-ae7a2c50db8a` exited 0/JSON SUCCESS. Its broad no-local-work finding was superseded by a narrower Ticket04/Ticket07 audit that found and completed local work.
- 2026-09-24 [TOOL] Ticket07 startup config: focused runtime tests 9/9, server full suite 56/56, typecheck passed; independent review found a Chain whitespace mismatch and confirmed the fix. Local `.env` passed structural validation with SSO/SMS configured and Chain staging, without printing values. No provider call or deployment ran.
