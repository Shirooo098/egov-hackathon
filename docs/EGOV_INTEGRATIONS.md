# eGov integrations

## Current boundary

Official eGov staging SSO is the only permitted runtime Citizen login in every environment. Healthcare records and workflows remain synthetic and live-disabled. Provider doubles belong only in automated tests; neither synthetic exchange codes nor authentication invitations are runtime login options. Case and pair workflow invitations remain separate.

Official SSO remains unavailable until authenticated callback-correlation evidence is verified. The required in-app flow is `exchange_code` to server-side provider token/profile handling, then a pending verified identity and explicit Citizen confirmation before an HttpOnly eBuhay session. The official web widget uses its separately verified provider contract. Neither path may silently switch accounts. Provider plus stable `uniqid` is the only account-linking key; provider secrets, tokens, and codes remain server-side and out of logs. Staff use separate named accounts with password and MFA.

eVerify is excluded from the product. Optional standalone Face Liveness remains unavailable until its authenticated contract, privacy notice, provider-retention terms, and safety gates pass. It never establishes identity, access, eligibility, or clinical clearance.

The supplied portal documentation confirms liveness session creation (`POST /v1/liveness/session`, HTTP 201) and backend result retrieval (`GET /v1/liveness/result/{sessionToken}`, HTTP 200), both authenticated with `x-api-key`. Only exact `SUCCEEDED` with `confidence_score >= 95` qualifies as completed. The credential-issued API base URL must not be inferred from the hosted page. [Ticket 09](../.scratch/official-egov-integrations/issues/09-optional-standalone-face-liveness.md) records the confirmed contract and remaining error/expiry, retention, and privacy gaps; no credentialed validation is claimed.

eGovChain, eMessage, and eGovAI retain the dependencies and evidence gates in the [official integration tickets](../.scratch/official-egov-integrations/spec.md). In particular, eMessage request acceptance is not delivery, and eGovAI cannot use an invented provider contract or local-answer fallback. Nothing here authorizes production deployment, live healthcare use, or government endorsement. The [canonical PRD](../tasks/prd-hospital-integrated-donation-platform.md) remains authoritative.
