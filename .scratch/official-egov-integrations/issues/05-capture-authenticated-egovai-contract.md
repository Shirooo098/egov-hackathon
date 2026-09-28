# 05 — Document the supplied eGovAI contract

**What to build:** Produce a redacted, credential-free contract record from the supplied official eGovAI documentation so eBuhay can integrate without guessing private endpoints, request fields, or response fields.

**Runtime verification (outside this documentation-only ticket):** The supplied success contract is documented below. Authenticated staging validation and provider error/quota/retention details remain unknowns; they are not inferred from public summaries.

**Status:** complete — documentation-only acceptance met for the supplied success contract and its documented unknowns. Provider implementation, authenticated staging calls, error/quota behavior, and exact prompt/response retention remain unverified and are outside this documentation-only ticket.

## Supplied documentation evidence — 2026-09-24

The user-provided [`egov-api-documentation.md`](../../../egov-api-documentation.md) supplies success examples for the credential-issued `{{base}}` API. These are documentation samples, not an authenticated staging capture or a tested provider call. The access code and token belong on the backend.

- `POST /api/v1/egov/integration/token` sends JSON `access_code` (source lines 331–345); the example response contains `access_token`, `expires_in_seconds`, `credits_total`, and `credits_remaining` (lines 366–374).
- `POST /api/v1/egov/integration/ai_assistant/generate` sends a bearer token and JSON `prompt` plus `category: "PH"` (lines 386–412); the example response contains text `data` and `session_id` (lines 435–441).
- The document does not establish the authenticated error shapes, quota behavior, provider prompt or response retention, or a validated credential-issued base URL. These remain documented unknowns for provider implementation and staging verification.

## Public privacy evidence and unknowns — 2026-09-25

The official [eGovAI Privacy Policy](https://egov-ai.e.gov.ph/privacy-policy) (updated 2026-09-19) says its scope includes integration APIs. It identifies prompts, responses, session identifiers, usage counts, and technical logs as processed data; prompts and relevant context may reach a selected AI provider. Retention depends on service, security, audit, records, legal, and agency needs, with no fixed period stated. This supports keeping eBuhay requests limited to fixed public FAQ text. It does not establish whether the credential-issued hackathon gateway uses the same processing and retention terms, nor the exact retention or deletion behavior for its prompts and responses.

The separate [eGov API Developer Portal Privacy Policy](https://platforms.e.gov.ph/privacy-policy) addresses developer accounts, credentials, sandbox activity, and audit logs. Its account/access-record retention statement does not resolve eGovAI inference-content retention. The public [eGov AI catalog](https://platforms.e.gov.ph/api-catalogs/egov-ai) still does not document authenticated inference error and quota shapes. No provider call was made for this review.

On 2026-09-25 the user confirmed that eGovAI configuration is present in the local environment; a key-name-only check found `EGOV_AI_BASE_URL` and `EGOV_ACCESS_CODE` without reading or disclosing their values. Configuration alone does not supply the missing error, quota, or privacy/retention contract, and no provider call has been authorized or run.

- [x] The supplied token and inference success request/response schemas are recorded with credentials and personal values removed.
- [x] The contract records documented base URL placeholder semantics, HTTP methods, authentication placement, and required success fields; provider error behavior remains unknown.
- [x] Documented provider privacy/retention behavior is recorded as unknown for the authenticated gateway; no local prompt/response retention is assumed.
- [x] No access code, bearer token, provider secret, live identity, or healthcare record appears in this fixture or documentation.
- [x] Runtime validation requirements are recorded for Ticket 06: reject undocumented success shapes and treat timeout, non-2xx, or malformed responses as unavailable.
- [x] Public summaries are not used to invent authenticated endpoints or fields.
- [x] The contract is reviewed as staging-only and does not imply production authorization.
