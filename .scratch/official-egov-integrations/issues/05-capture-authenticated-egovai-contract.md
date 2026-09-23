# 05 — Capture the authenticated eGovAI contract

**What to build:** Produce a redacted, credential-free contract fixture from the authenticated official portal so eBuhay can integrate eGovAI without guessing private endpoints, request fields, or response fields.

**Blocked by:** None — requires the team's redacted authenticated portal schema before completion.

**Status:** blocked-external — local documentation exists, but authenticated error/privacy behavior and validated staging contract are not yet evidenced

- [ ] The team supplies the official token and inference request and response schemas with every credential and personal value removed.
- [ ] The contract records credential-issued base URL semantics, HTTP methods, authentication placement, required fields, response states, and documented error behavior.
- [ ] The team records documented provider privacy/retention behavior for public FAQ prompts without storing or publishing credentials.
- [ ] No access code, bearer token, provider secret, live identity, or healthcare record appears in the fixture or documentation.
- [ ] Contract assertions reject undocumented success shapes instead of broadly coercing them into plausible answers.
- [ ] Public summaries are not used to invent authenticated endpoints or fields.
- [ ] The contract is reviewed as staging-only and does not imply production authorization.
