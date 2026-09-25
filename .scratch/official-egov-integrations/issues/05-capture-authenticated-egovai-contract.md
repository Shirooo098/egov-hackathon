# 05 — Capture the authenticated eGovAI contract

**What to build:** Produce a redacted, credential-free contract fixture from the authenticated official portal so eBuhay can integrate eGovAI without guessing private endpoints, request fields, or response fields.

**Blocked by:** None — requires the team's redacted authenticated portal schema before completion.

**Status:** blocked-external — local documentation exists, but authenticated error/privacy behavior and validated staging contract are not yet evidenced

## Available documentation evidence — 2026-09-24

The user-provided `egov-api-documentation.md` supplies success examples for the credential-issued `{{base}}` API. These are documentation samples, not an authenticated staging capture or a tested provider call. The access code and token belong on the backend.

- `POST /api/v1/egov/integration/token` sends JSON `access_code`; the example response contains `access_token`, `expires_in_seconds`, `credits_total`, and `credits_remaining`.
- `POST /api/v1/egov/integration/ai_assistant/generate` sends a bearer token and JSON `prompt` plus `category: "PH"`; the example response contains text `data` and `session_id`.
- The document does not establish the authenticated error shapes, quota behavior, provider prompt or response retention, or a validated credential-issued base URL. These remain required before completing this ticket or enabling Ticket 06.

## Public privacy evidence — 2026-09-25

The official [eGovAI Privacy Policy](https://egov-ai.e.gov.ph/privacy-policy) (updated 2026-09-19) says its scope includes integration APIs. It identifies prompts, responses, session identifiers, usage counts, and technical logs as processed data; prompts and relevant context may reach a selected AI provider. Retention depends on service, security, audit, records, legal, and agency needs, with no fixed period stated. This supports keeping eBuhay requests limited to fixed public FAQ text. It does not establish whether the credential-issued hackathon gateway uses the same processing and retention terms, nor the exact retention or deletion behavior for its prompts and responses.

The separate [eGov API Developer Portal Privacy Policy](https://platforms.e.gov.ph/privacy-policy) addresses developer accounts, credentials, sandbox activity, and audit logs. Its account/access-record retention statement does not resolve eGovAI inference-content retention. The public [eGov AI catalog](https://platforms.e.gov.ph/api-catalogs/egov-ai) still does not document the authenticated inference error and quota shapes needed here. No provider call was made for this review.

On 2026-09-25 the user confirmed that eGovAI configuration is present in the local environment; a key-name-only check found `EGOV_AI_BASE_URL` and `EGOV_ACCESS_CODE` without reading or disclosing their values. Configuration alone does not supply the missing error, quota, or privacy/retention contract, and no provider call has been authorized or run.

- [ ] The team supplies the official token and inference request and response schemas with every credential and personal value removed.
- [ ] The contract records credential-issued base URL semantics, HTTP methods, authentication placement, required fields, response states, and documented error behavior.
- [ ] The team records documented provider privacy/retention behavior for public FAQ prompts without storing or publishing credentials.
- [ ] No access code, bearer token, provider secret, live identity, or healthcare record appears in the fixture or documentation.
- [ ] Contract assertions reject undocumented success shapes instead of broadly coercing them into plausible answers.
- [ ] Public summaries are not used to invent authenticated endpoints or fields.
- [ ] The contract is reviewed as staging-only and does not imply production authorization.
