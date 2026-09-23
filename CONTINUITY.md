# Continuity

## Snapshot
- 2026-09-23 [USER] Goal: finish official eGov tickets first, then unblock synthetic hospital demo; confirmed SSO, Chain, Message, AI, and optional standalone Face Liveness; eVerify is explicitly absent from the product.
- 2026-09-23 [USER] Work on a `{feature}` branch, commit each accomplishment, never push, and never use a `codex/*` branch.
- 2026-09-23 [CODE] Current branch: `feature/official-egov-open-tickets`.
- 2026-09-23 [TOOL] Implementation baseline was `1761d4e5`; current code HEAD `b51b67a` follows auth cleanup `b83601c`. No source changes remain uncommitted.
- 2026-09-23 [TOOL] User-attached eGov SSO guide confirms in-app `exchange_code` callback, token/profile calls, and official web widget; it does not define `state`/nonce or provide the credential-issued gateway URL.
- 2026-09-23 [USER] Resumed available-ticket work; include `.scratch/official-egov-integrations/issues`. Current implementation covers safe Ticket 01 work and Ticket 02; preserve external gates and all ticket scope.
- 2026-09-23 [TOOL] Astra Ticket01 safe slice and Ticket02 correction completed; conversation `2f06993a-41e4-48d5-9038-b20b7ee11785` terminal (exit0/SUCCESS). Codex verification/review complete. No active agent or process.
- 2026-09-23 [USER] Commit each verified accomplishment on the existing feature branch; do not push. Preserve unrelated staged specification work. This supersedes this turn's no-commit default.
- 2026-09-23 [CODE] Now: Ticket02 complete at `b51b67a`; Ticket01 safe cleanup committed at `b83601c`, official SSO incomplete. Next: reassess remaining official external dependencies; synthetic baseline still available after official work. No active agents/processes and nothing pushed.
- 2026-09-23 [CODE] Open: eGovPH callback correlation and partner acceptance need authenticated clarification. Ticket 24 baseline remains unrun, but current isolated-DB connectivity now passes; eMessage contract/env mismatch remains.
- 2026-09-23 [CODE] Open: Tickets 03, 05, 06, and credentialed Ticket 07 checks retain documented external dependencies.

## Done
- 2026-09-23 [TOOL] Commit `b51b67a` completely deletes eVerify provider/controller/routes, UI/fixture claims and credentials; removes liveness onboarding gate. Reviewed and verified; no compatibility stubs remain.
- 2026-09-23 [TOOL] Commit `b83601c` removes synthetic Citizen and authentication-invitation runtime login, preserves sessions/Staff; 10 focused tests plus 22 Staff tests passed and both reviews found no material issue. Nothing pushed.
- 2026-09-23 [CODE] Commit `3ec8524` added read-only compatibility suggestions.
- 2026-09-23 [CODE] Commit `94ba011` made official eGov SSO the runtime authority in documentation.
- 2026-09-23 [CODE] Commit `3d89aea` enforces truthful unavailable eGov boundaries and removes runtime Citizen invitation fallback.
- 2026-09-23 [CODE] Commit `877c4c6` enforces consented, audited, truthful eMessage delivery.
- 2026-09-23 [CODE] Commit `c80058e` restores reproducible package checks.

## Decisions
- D1 2026-09-23 [CODE] Official SSO remains unavailable until the provider callback-correlation contract is verified; do not invent state/nonce behavior.
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

## Working set
- `client/src/App.tsx`
- `client/src/features/onboarding/`
- `client/src/components/ui/FloatingAIChat.tsx`
- `server/src/routes/egov.ts`
- `.scratch/official-egov-integrations/issues/09-optional-standalone-face-liveness.md`
- `server/src/services/eGovAIService.ts`
- `server/src/services/eMessageService.ts`
- `server/src/services/notificationService.ts`
- `server/src/routes/rebaseline.ts`
- `server/src/worker.ts`
- `client/package.json`
- `server/package.json`

## Receipts
- 2026-09-24 [USER][CODE] Supplied liveness portal excerpts match egov-api-documentation.md success endpoints and threshold; Ticket09 now records HTTP201 session/HTTP200 result contract. Error/expiry, provider retention/privacy approval and credentialed validation remain open. No provider call ran.
- 2026-09-23 [TOOL] Ticket02 final: 4/4 removal HTTP, 4/4 official deferral, 12/12 API security, 4/4 SSO boundary tests and server typecheck passed after generic auth 404 fix. Independent review resolved stale onboarding copy; no remaining findings.
- 2026-09-23 [TOOL] Package verification before final auth fallback: server 52/52; client 11 Vitest files and 15 TAP tests passed; both typecheck/lint and client build passed. Lint warnings: server9/client10. No provider smoke ran. Focused followup above covers final server edit.
- 2026-09-23 [TOOL] Ticket 01 worker: server typecheck/lint and 10 focused auth/session/isolated-DB HTTP tests passed. Root subsequently removed its unreferenced empty auth/egov.ts module; final integration verification pending.
- 2026-09-23 [TOOL] Current read-only baseline preflight: canonical test/runtime DB isolation validator passed; pooled/direct test PostgreSQL probes and direct schema_migrations query passed (exit 0). Historical EACCES is not a current connectivity blocker; no baseline suite or migrations ran.
- 2026-09-23 [TOOL] Client targeted validation: 51/51 passed; default package entrypoint: 77/77 Vitest plus 15/15 node:test; typecheck and production build passed.
- 2026-09-23 [TOOL] Server package tests: 52/52 passed; typecheck and lint passed (13 existing warnings).
- 2026-09-23 [TOOL] Ticket-specific server checks via Node loader: official deferrals 5/5, eMessage service 2/2, legacy no-outbound 1/1.
- 2026-09-23 [TOOL] Security/migration review returned no remaining P0-P2 findings after legacy pending rows were made fail-closed.
- 2026-09-23 [TOOL] `git diff --check` passed at committed HEAD `c80058e`.
