# 06 — Official eGovAI public guidance

**What to build:** Provide a fixed, curated set of public eBuhay-process FAQ choices through the verified official eGovAI staging contract while excluding free text and personal, case, clinical, matching, and appointment information.

**Open verification:** The supplied success contract is documented in Ticket 05. Actual provider staging verification remains open.

**Status:** open — the fixed public FAQ provider flow, server allowlist, failure handling, and UI guidance are implemented locally (`c01cc6a`). Actual staging verification remains open.

On 2026-09-25, the obsolete Staff-facing free-text "PH Health Laws AI" prototype and its synthetic-only `/api/egovai/laws` and `/api/v1/egovai/laws` routes were removed. Both legacy paths now return 404 in the synthetic runtime. The fixed-choice Citizen FAQ endpoint uses the documented provider token/inference flow. [Local verification](../evidence/read-only-chain-and-ai-local-checks-2026-09-28.md) covers fixtures, not an actual provider response.

- [ ] The assistant uses only the supplied and then verified official staging contract and has no generated or local-answer fallback.
- [x] Only fixed public FAQ selections can be submitted; free-text prompts and identity, case, donor, recipient, clinical, matching, and appointment data cannot cross the provider boundary.
- [ ] Responses are visibly informational and are never presented as clinical, legal, eligibility, clearance, matching, ranking, treatment, or scheduling decisions.
- [x] Timeout, non-2xx, and malformed provider responses return a clear unavailable state with retry guidance instead of a fabricated answer in local checks.
- [x] Credentials and provider tokens remain server-side and are excluded from persistence and logs in the implemented flow.
- [x] HTTP-level tests use redacted official-shaped fixtures to cover allowed FAQ choices, rejected arbitrary text/prohibited data, provider errors, and the absence of fallback answers.
- [x] User-visible tests verify the informational label and truthful unavailable state.
