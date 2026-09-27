# 03 — Documented read-only eGovChain staging integration

**What to build:** Validate official staging JSON-RPC with the credential-issued base URL/token: read chain ID, gas price and a block. Report connection results without claiming consent was anchored.

**Status:** open — user revised scope on 2026-09-27; runtime alignment and revision-specific read-only evidence remain. Non-identifying network metadata does not depend on Citizen SSO; existing application authorization stays intact.

## Scope and documentation basis

The supplied `egov-api-documentation.md` issues `base_url` and `token`, documents POST JSON-RPC at `base_url/token`, chain `13371` (`0x343b`), zero gas price (`0x0`), `eth_blockNumber` and `eth_getBlockByNumber`. It does not issue a signer private key.

The user rejected a project-generated signer and approved read-only integration. [ADR0016](../../../docs/adr/0016-limit-egovchain-to-documented-read-only-staging.md) supersedes signed consent anchoring and wallet provisioning. This is a scope reduction, not a claim that the network prohibits signed transactions.

Consent signing/submission, smart-contract deployment and anchoring are deferred. Read-only results are not consent proof. Preserve local consent recording, access controls and historical evidence.

## Remaining work

- [ ] Base URL/token suffice for read-only startup and requests; no signer key required.
- [ ] Prevent runtime consent signing/broadcast and anchor-queue processing; preserve local consent without misleading pending anchors.
- [ ] Use documented `eth_chainId`, `eth_gasPrice`, `eth_blockNumber` and `eth_getBlockByNumber`.
- [ ] Require chain13371 and zero gas price; validate JSON-RPC envelopes/block fields. Wrong chain, malformed results, authentication failure and outages fail visibly.
- [ ] Keep credential-bearing RPC URLs/tokens server-side; no personal, consent or healthcare content in requests/logs.
- [ ] Labels distinguish configured, verified read-only connection and unavailable; no connectivity-as-anchor or legal/clinical proof claim.
- [ ] Focused checks verify no signer requirement, no signing/broadcast, failure handling and privacy.
- [ ] Retain authorized actual read-only staging observations with UTC time, source revision, chain ID, gas price and public block reference. No new provider call is claimed by this revision.

## Historical work

Previous receipt/delayed-mining/reorg/Citizen-state fixture checks passed focused24/24, typecheck and review on 2026-09-27. They do not prove the revised read-only runtime or an actual anchor. Existing signing/configuration/worker code still needs alignment; this ticket edit does not remove it.
