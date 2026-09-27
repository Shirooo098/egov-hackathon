# 03 — Documented read-only eGovChain staging integration

**What to build:** Validate official staging JSON-RPC with the credential-issued base URL/token: read chain ID, gas price and a block. Report connection results without claiming consent was anchored.

**Status:** open — runtime aligned with the revised read-only scope on 2026-09-28; local checks pass and actual revision-specific staging evidence remains. Non-identifying network metadata does not depend on Citizen SSO; existing application authorization stays intact.

## Scope and documentation basis

The supplied `egov-api-documentation.md` issues `base_url` and `token`, documents POST JSON-RPC at `base_url/token`, chain `13371` (`0x343b`), zero gas price (`0x0`), `eth_blockNumber` and `eth_getBlockByNumber`. It does not issue a signer private key.

The user rejected a project-generated signer and approved read-only integration. [ADR0016](../../../docs/adr/0016-limit-egovchain-to-documented-read-only-staging.md) supersedes signed consent anchoring and wallet provisioning. This is a scope reduction, not a claim that the network prohibits signed transactions.

Consent signing/submission, smart-contract deployment and anchoring are deferred. Read-only results are not consent proof. Preserve local consent recording, access controls and historical evidence.

## Remaining work

- [x] Base URL/token suffice for read-only startup and requests; no signer key required.
- [x] Prevent runtime consent signing/broadcast and anchor-queue processing; preserve local consent without misleading pending anchors.
- [x] Use documented `eth_chainId`, `eth_gasPrice`, `eth_blockNumber` and `eth_getBlockByNumber`.
- [x] Require chain13371 and zero gas price; validate JSON-RPC envelopes/block fields. Wrong chain, malformed results, authentication failure and outages fail visibly.
- [x] Keep credential-bearing RPC URLs/tokens server-side; no personal, consent or healthcare content in requests/logs.
- [x] Labels distinguish configured, verified read-only connection and unavailable; no connectivity-as-anchor or legal/clinical proof claim.
- [x] Focused checks verify no signer requirement, no signing/broadcast, failure handling and privacy.
- [ ] Retain authorized actual read-only staging observations with UTC time, source revision, chain ID, gas price and public block reference. No new provider call is claimed by this revision.

## Historical work

Previous receipt/delayed-mining/reorg/Citizen-state fixture checks passed focused24/24, typecheck and review on 2026-09-27. They do not prove the revised read-only runtime or an actual anchor. The 2026-09-28 runtime removes signing, broadcasting and anchor queue processing. Existing stored evidence is preserved and displayed as historical; obsolete signed-runtime tests remain available in Git history. These local implementation changes do not establish an actual staging observation.

## Local verification � 2026-09-28

Runtime plus regression fixtures based on `07de449`: normal server suite127/127, server typecheck, client focused UI10/10 and client typecheck/production build passed. Independent security review found an old-status omission in consent replay/export responses; both callers were repaired and the regression fixture passed. [Verification record](../evidence/read-only-chain-and-ai-local-checks-2026-09-28.md). No actual provider, database or browser operation was performed.
