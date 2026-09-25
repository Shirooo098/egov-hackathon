# 03 — Official eGovChain consent proof

**What to build:** Let an authenticated Citizen anchor a privacy-preserving consent commitment through official eGovChain staging and see truthful pending, confirmed, or unavailable status.

**Blocked by:** 01 — Official eGov SSO-only Citizen login.

**Status:** in progress — the obsolete simulated Besu service and automatic demo anchor trigger are removed; consent reads and Citizen UI distinguish pending, unavailable, and verified evidence. Local HTTP tests cover all three Citizen proof states and recorded transaction/block fields without exposing outbox errors or raw consent evidence. The worker retains a signed transaction through delayed mining without rebroadcasting a transaction visible to the node, rejects invalid receipts, and the verified-proof sweep rejects reverted receipts. An actual signed staging write and validated receipt remain unproven.

The verified-proof sweep now advances the check order after a valid receipt. A local two-batch regression shows that proofs beyond the batch limit are reached instead of repeatedly checking the oldest proof.

- [ ] Consent anchoring uses the credential-issued official staging endpoint, chain ID `13371`, the project-controlled signer, and zero-gas validation.
- [ ] On-chain payloads contain commitments or hashes and non-identifying metadata only; they exclude names, contact information, medical information, case content, and raw consent documents.
- [ ] A real signed transaction anchors only synthetic consent data on the actual official staging chain; no simulated-success runtime is used.
- [ ] Submission remains pending until a successful canonical receipt for the expected transaction and chain is validated and retained as staging evidence.
- [ ] The UI displays anchored only after that receipt validation and otherwise shows pending or unavailable truthfully; a local request ID is never called a receipt.
- [ ] Chain mismatch, provider rejection, malformed responses, and outages fail closed without a locally fabricated receipt.
- [ ] HTTP-level tests cover privacy boundaries, pending and confirmed states, chain validation, upstream failure, receipt evidence, and no legal or clinical consent claim.
