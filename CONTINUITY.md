# Continuity

## Snapshot
- 2026-09-23 [USER] Goal: finish official eGov tickets first, then unblock synthetic hospital demo; confirmed SSO, Chain, Message, AI, and optional standalone Face Liveness; eVerify is explicitly absent from the product.
- 2026-09-23 [USER] Work on a `{feature}` branch, commit each accomplishment, never push, and never use a `codex/*` branch.
- 2026-09-23 [CODE] Current branch: `feature/official-egov-open-tickets`.
- 2026-09-24 [TOOL] Latest scoped commit `2616de9` covers Ticket01 HTTP failure/cancellation checks. Antigravity model discovery and a read-only explorer delegation now succeed. Unrelated staged synthetic specs and user-owned `AGENTS.md` remain untouched.
- 2026-09-24 [USER] Supplied the SSO guide again and confirmed the credential-issued URL, partner code, and secret are configured in `server/.env`; do not expose their values. The guide does not define `state`/nonce.
- 2026-09-23 [USER] Resumed available-ticket work; include `.scratch/official-egov-integrations/issues`. Current implementation covers safe Ticket 01 work and Ticket 02; preserve external gates and all ticket scope.
- 2026-09-23 [TOOL] Astra Ticket01 safe slice and Ticket02 correction completed; conversation `2f06993a-41e4-48d5-9038-b20b7ee11785` terminal (exit0/SUCCESS). Codex verification/review complete. No active agent or process.
- 2026-09-23 [USER] Commit each verified accomplishment on the existing feature branch; do not push. Preserve unrelated staged specification work. This supersedes this turn's no-commit default.
- 2026-09-24 [CODE] Now: Tickets 01/08 SSO, Ticket04 eMessage mobile consent, Ticket03 truthful chain status, and Ticket07 enabled-provider startup validation are committed. Nothing pushed.
- 2026-09-24 [CODE] Open: eGovPH callback correlation and partner acceptance need authenticated clarification; no provider smoke ran. Ticket 24 baseline remains unrun; isolated test DB is currently inaccessible (EACCES) in this sandbox.
- 2026-09-24 [CODE] Open: Ticket03 signed official-staging receipt, Ticket04 provider SMS acknowledgement, Ticket05/06 authenticated AI contract, Ticket07 deployment smoke, and optional Ticket09 privacy/error terms require external evidence or credentials/approval. No live provider calls ran.

## Done
- 2026-09-24 [TOOL] Commit `2616de9` adds HTTP SSO provider-failure/cancellation regressions; focused tests 10/10 passed.
- 2026-09-24 [TOOL] Commit `26313f8` rejects malformed enabled SMS/Chain startup configuration; server suite 56/56 and typecheck passed.
- 2026-09-24 [TOOL] Commit `f9dd815` maps unavailable/pending/verified consent proof reads without leaking outbox errors; 55/55 server suite and independent review passed.
- 2026-09-24 [TOOL] Commit `a6390d5` removes the legacy simulated chain-info response and adds an HTTP regression check; Ticket03 still needs signed staging evidence.
- 2026-09-24 [TOOL] Commit `56ac6b7` records SSO-mobile-only SMS opt-in, revocation, narrow generic purposes, and truthfully masked preference UX; independent review issue fixed.
- 2026-09-24 [TOOL] Commit `b7b3315` records official SSO handoff and widget with explicit identity confirmation; Ticket01/08 staging/callback-correlation gates remain open.
- 2026-09-24 [TOOL] Commit `038f73b` records eMessage accepted-only progress and eGovAI success-shape documentation; external gates remain open.

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

## Working set
- `server/tests/egov-official-handoff.test.ts`
- `server/src/routes/egovAuth.ts`
- `.scratch/official-egov-integrations/issues/01-official-egov-sso-citizen-login.md`
- `.scratch/official-egov-integrations/issues/03-official-egovchain-consent-proof.md`
- `.scratch/official-egov-integrations/issues/04-official-opted-in-emessage-notifications.md`

## Receipts
- 2026-09-24 [TOOL] `agy models` now lists `gemini-3.8-flash-high`; `agy agents` lists explorer/researcher/worker. Read-only explorer conversation `f9613dad-487c-4506-94af-ae7a2c50db8a` exited 0 with JSON `status: SUCCESS`; it found no clearly safe local eGov feature edit beyond external partner/staging gates. No files changed or provider calls made.
- 2026-09-24 [TOOL] Ticket07 startup config: focused runtime tests 9/9, server full suite 56/56, typecheck passed; independent review found a Chain whitespace mismatch and confirmed the fix. Local `.env` passed structural validation with SSO/SMS configured and Chain staging, without printing values. No provider call or deployment ran.
- 2026-09-24 [TOOL] Ticket03 read-state mapping: focused 5/5, server full suite 55/55, typecheck passed; independent review had no actionable findings. Database-backed joins and official-chain behavior were not exercised.
- 2026-09-24 [TOOL] Ticket03 route removal: focused chain tests 3/3, server full suite 53/53, and server typecheck passed. No real staging transaction or isolated DB test ran.
- 2026-09-24 [TOOL] Independent Ticket04 review found revoke-response masked-mobile UI bug; fixed, and server/client regression checks passed. Reviewer also identified stale ignored/untracked `server/tests/notifications.test.ts`; new scoped HTTP test covers current contract, while that legacy DB test remains unrun/untracked.
- 2026-09-24 [TOOL] Ticket04: focused server SSO/SMS tests 10/10, client preference/trust tests 9/9, server full test 52/52, server typecheck passed. Server lint exit0 with pre-existing warnings. Database migration and credentialed provider smoke remain unrun (sandbox DB EACCES/no live call).
- 2026-09-24 [TOOL] Prior SSO package verification at `b7b3315`: server 52/52, client full suite and build, both typechecks passed; no provider or isolated DB call.
- 2026-09-24 [TOOL] SSO provider/HTTP fixture tests 7/7, client focused SSO/onboarding tests 43/43, server/client typechecks, and isolated config assertion passed; no real provider call.
- 2026-09-24 [TOOL] Independent SSO security review found pending-cookie identity swap, callback rate-limit bypass, and concurrent first-login race; code now binds confirmation to pending ID, throttles callback, and serializes first provisioning. Second review could not run due agent usage limit.
- 2026-09-24 [USER][CODE] Supplied liveness portal excerpts match egov-api-documentation.md success endpoints and threshold; Ticket09 now records HTTP201 session/HTTP200 result contract. Error/expiry, provider retention/privacy approval and credentialed validation remain open. No provider call ran.
