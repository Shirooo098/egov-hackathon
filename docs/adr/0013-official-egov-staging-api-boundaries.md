---
status: accepted
date: 2026-09-21
---

# Use official eGov staging APIs for branded features

Every user-facing eGov-branded feature must use the official eGov staging API for that feature. There is no generated or synthetic success path and no fallback that fabricates provider output. If the service is unavailable, eBuhay returns a clear error and may offer a retry.

Runtime simulated eGov implementations are removed; provider mocks are test-only. A successful official staging SSO identity may create or link a Citizen only when it includes a stable `uniqid`; identities must never be invented. Retain only `uniqid`, display name, provider, verification time, and optional consented contact needed for eMessage. Never retain an access token or exchange code. All donor, recipient, hospital, clinical, and appointment business records remain synthetic. eGov SSO authenticates Citizens only and never grants Hospital Staff authority; staff access remains separate.

Citizen runtime login is official eGov SSO only in every environment; invitation identities are test fixtures only. Authentication invitations are superseded, while case and pair workflow invitations remain. This decision explicitly supersedes the Citizen-authentication clauses of ADR 0002 (which specified invitation-token based Citizen authentication) and ADR 0010 (which retained active Citizen invitation-token authentication). Hospital staff password authentication, MFA, and credential separation established in ADR 0002 and ADR 0010 remain fully in force. Existing Citizen accounts link only by official `uniqid`; names, email addresses, and mobile numbers never auto-merge accounts. Exceptional migration requires an authenticated, audited staff action.

The first scope is official eGov SSO, official eGovChain consent commitments, official eMessage transactional notifications triggered by consent and authenticated actions, and official eGovAI informational-only responses. eGovAI never makes clinical or legal decisions. The approved 2026-09-23 integration scope removes eVerify entirely. Optional standalone Face Liveness is independent and remains unavailable until its separate provider/privacy gates pass.

Official eMessage is limited to appointment changes, status updates, and document-action reminders. Each notification requires explicit opt-in and an authenticated server trigger; SMS content is generic and non-medical. Official eGovAI provides public process guidance and FAQs only and receives no identity, case, clinical, donor, recipient, or appointment data.

eMessage opt-in defaults off and can be revoked; a provider mobile number does not auto-enroll a Citizen. eGovChain stores commitments or hashes and non-identifying metadata only, never PII, medical data, case data, or raw consent content.

Project-owned security secrets and keys remain required and are distinct from generated provider outputs. This ADR does not speculate about undocumented endpoints. Production and live use are not authorized.

Any enabled feature missing required credentials blocks deployment. Runtime provider outages return a clear `503` with retry. Implementation of private provider contracts waits for authenticated schemas and never guesses.

Audit logs include the feature, internal request ID, provider status, time, actor, and correlation ID when supplied, but never credentials, tokens, exchange codes, message bodies, or unneeded PII. The UI never reports verified, sent, or anchored without a confirmed official response or receipt; otherwise it shows unavailable, pending, or the exact returned status. This completes the decision set.
