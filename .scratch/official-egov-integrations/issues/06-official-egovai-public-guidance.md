# 06 — Official eGovAI public guidance

**What to build:** Provide a fixed, curated set of public eBuhay-process FAQ choices through the verified official eGovAI staging contract while excluding free text and personal, case, clinical, matching, and appointment information.

**Blocked by:** 05 — Capture the authenticated eGovAI contract.

**Status:** in progress — fixed public FAQ choices and server allowlist implemented (`fbb3f2d`); the local HTTP boundary rejects extra request data and invalid categories, and UI tests confirm informational and retry guidance. Provider answers remain blocked by Ticket 05's authenticated contract.

- [ ] The assistant uses only the verified official staging contract and has no generated or local-answer fallback.
- [x] Only fixed public FAQ selections can be submitted; free-text prompts and identity, case, donor, recipient, clinical, matching, and appointment data cannot cross the provider boundary.
- [ ] Responses are visibly informational and are never presented as clinical, legal, eligibility, clearance, matching, ranking, treatment, or scheduling decisions.
- [ ] Provider failures return a clear unavailable state with retry guidance instead of a fabricated answer.
- [ ] Credentials and provider tokens remain server-side and are excluded from persistence and logs.
- [ ] HTTP-level tests use redacted official-shaped fixtures to cover allowed FAQ choices, rejected arbitrary text/prohibited data, provider errors, and the absence of fallback answers.
- [x] User-visible tests verify the informational label and truthful unavailable state.
