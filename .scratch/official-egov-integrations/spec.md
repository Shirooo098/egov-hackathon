# Official eGov Staging Integrations

**Status:** approved scope and ticket contract (2026-09-23); available-ticket implementation resumed, with provider evidence gates unchanged

## Problem Statement

eBuhay currently contains a mixture of official eGov staging integrations, locally generated eGov-like results, and disabled or incomplete provider paths. A Citizen can encounter synthetic invitation authentication, generated verification outcomes, simulated liveness results, locally reported message delivery, or fabricated AI responses. Those behaviors make it difficult to distinguish an official provider result from a project-owned demonstration.

Every user-facing eGov-branded capability must use the corresponding official eGov staging API. If an official service is unavailable, unconfigured, or not yet contractually understood, eBuhay must report that truthfully instead of generating a successful result. This official-provider requirement applies only to eGov integrations; donor, recipient, hospital, clinical, appointment, and coordination records remain synthetic under the project roadmap.

## Solution

Make official eGov staging services the only runtime providers for eGov-branded features. Citizen authentication will use official eGov SSO and link accounts by the provider's stable `uniqid`. eGovChain will anchor privacy-preserving synthetic consent commitments on the actual official staging chain. eMessage will submit a narrow set of consented transactional SMS requests through authenticated server-side workflows and label accepted requests without implying delivery. eGovAI will answer only curated public eBuhay-process FAQs after its authenticated provider contract is verified. Optional standalone Face Liveness may provide a post-SSO presence check after its contract and privacy gates are approved. eVerify is excluded entirely.

Remove runtime-generated eGov outcomes and retain provider doubles only as redacted automated-test fixtures. Missing configuration will prevent an enabled feature from starting; provider outages will return clear unavailable responses with retry guidance. No provider credential, exchange code, or access token will be exposed to the browser or written to logs. Healthcare workflows and records remain synthetic and live-disabled.

## User Stories

1. As a Citizen, I want to authenticate through official eGov SSO, so that eBuhay does not invent or independently assert my government identity.
2. As a Citizen, I want the SSO callback to complete securely, so that my provider exchange code and token remain confidential.
3. As a Citizen, I want a clear error when eGov SSO is unavailable, so that I do not mistake a local fallback for successful government authentication.
4. As a Citizen, I want a retriable authentication failure, so that a temporary provider outage does not create a duplicate or synthetic identity.
5. As a Citizen, I want my account linked only by the official stable `uniqid`, so that another person's matching name, email address, or mobile number cannot merge with my account.
6. As a Citizen, I want only necessary SSO profile information retained, so that eBuhay minimizes my personal data.
7. As a Citizen, I want invitation-based demonstration login removed from runtime, so that the login experience cannot be confused with official eGov SSO.
8. As a Hospital Staff member, I want my access to remain separate from Citizen SSO, so that a government identity never grants clinical or operational authority.
9. As a Coordinator, I want Citizen and Staff identities to remain distinct, so that actions are attributed to the correct authority boundary.
10. As a Citizen, I want a consent commitment anchored through official eGovChain staging, so that the displayed proof corresponds to a confirmed provider receipt.
11. As a Citizen, I want eBuhay to show an anchoring operation as pending until a receipt is confirmed, so that a submitted transaction is not misrepresented as final.
12. As a Citizen, I want only a privacy-preserving commitment written on-chain, so that my name, contact information, medical information, case content, and raw consent document are never published.
13. As a Citizen, I want the anchoring status to say unavailable when the chain cannot be reached, so that no local identifier is presented as a blockchain receipt.
14. As a Citizen, I want to choose whether to receive eMessage SMS notifications, so that receiving a mobile number from SSO does not silently enroll me.
15. As a Citizen, I want to revoke SMS consent, so that later transactional messages are suppressed.
16. As a Citizen, I want eMessage notifications limited to appointment changes, application-status updates, and document-action reminders, so that the channel remains predictable.
17. As a Citizen, I want SMS content to omit medical and sensitive case details, so that information is not exposed on a shared or locked-screen device.
18. As a Citizen, I want SMS request status to reflect the official provider response, so that an accepted request is not displayed as delivered.
19. As an authorized Staff member or system workflow, I want to trigger approved transactional messages, so that arbitrary public callers cannot use eBuhay as an SMS relay.
20. As an authorized Staff member, I want notification attempts attributed to an authenticated actor and internal request, so that the action can be audited without logging message content.
21. As a Citizen, I want eGovAI to answer public eBuhay process questions, so that I can understand the coordination journey.
22. As a Citizen, I want AI guidance visibly identified as informational, so that I do not mistake it for clinical or legal advice.
23. As a Citizen, I want the assistant to report unavailability when the official eGovAI service fails, so that a generated local answer is not represented as official.
24. As a Citizen, I want my identity and case information excluded from eGovAI requests, so that public guidance does not disclose personal or clinical data.
25. As a Doctor or Clinical Lead, I want eGovAI excluded from eligibility, clearance, matching, ranking, and treatment decisions, so that clinical authority remains with qualified people and hospital systems.
26. As a Citizen, I want no eVerify feature or placeholder and Face Liveness shown as unavailable until its separate gates pass, so that an excluded service is not presented to me and I never receive a fabricated result.
27. As a team member, I want enabled integrations to require complete official credentials at deployment, so that configuration mistakes are detected before users rely on a feature.
28. As a team member, I want provider base URLs to come from approved credentials, so that undocumented or guessed environments are never contacted.
29. As a team member, I want provider secrets stored only in the deployment environment, so that credentials are not committed or delivered to the browser.
30. As a team member, I want official access tokens retained only for the minimum server-side operation, so that a token is neither persisted unnecessarily nor exposed.
31. As a team member, I want provider mocks limited to automated tests, so that runtime code cannot silently switch to simulated success.
32. As a team member, I want audit logs to contain feature name, internal request ID, provider status, time, actor, and provider correlation ID when supplied, so that incidents can be investigated without collecting unnecessary personal data.
33. As a team member, I want credentials, tokens, exchange codes, message bodies, and unnecessary personal data excluded from logs, so that diagnostics do not create another sensitive-data store.
34. As a team member, I want the UI to distinguish unavailable, pending, accepted, completed presence check, and anchored states, so that every claim corresponds to confirmed provider evidence.
35. As a team member, I want contract tests based on redacted official schemas, so that undocumented provider changes fail visibly instead of being normalized into plausible output.
36. As a deployment owner, I want credentialed smoke checks isolated from CI, so that real provider calls and secrets are not used by ordinary automated test runs.
37. As a deployment owner, I want the Vercel staging deployment to fail closed when an enabled feature lacks credentials, so that no partially simulated deployment is published.
38. As a product stakeholder, I want every official integration clearly limited to provider staging, so that the demonstration is not represented as a live government or healthcare service.
39. As a product stakeholder, I want all healthcare workflow records to remain visibly synthetic, so that official identity or notification testing does not imply live clinical integration.
40. As an auditor, I want successful claims backed by an official response or confirmed chain receipt, so that the system never labels an operation accepted, presence-checked, or anchored without evidence.
41. As a Citizen, I want to enter through either the official eGovPH in-app handoff or web widget, so that both supported staging journeys lead to one secure eBuhay sign-in.
42. As a Citizen, I want to confirm the verified identity from an in-app code handoff before an eBuhay session is created, so that a stray or uncorrelated code cannot silently switch my account.
43. As a Citizen, I want to choose donor or recipient case intent after authentication, so that one account can hold separate cases without choosing an account type at login.
44. As a Citizen, I want eBuhay sign-out to end my local session only, so that the product does not claim to sign me out of eGovPH.
45. As a Citizen, I want an eMessage `201 Created` result labeled accepted with delivery unconfirmed, so that request creation is not confused with handset delivery.
46. As a Citizen, I want transactional SMS sent only to my opted-in SSO-supplied mobile number, so that an unverified manually entered number is not used.
47. As a Citizen, I want to select from fixed public eGovAI FAQs, so that no free-text identity, case, or clinical details can be sent to the provider.
48. As a Citizen, I want to opt in to an optional post-SSO Face Liveness session, so that I can demonstrate presence without it controlling my identity, case, or care.
49. As a Citizen, I want a completed presence check shown only for an official `SUCCEEDED` result with confidence at least 95, so that a weaker or failed result is not represented as complete.
50. As a Citizen, I want a hosted liveness return verified by eBuhay against my pending session, so that redirect claims alone cannot establish the result.
51. As a Citizen, I want no image, raw score, token, or outcome persistently retained for this check while retention approval is unresolved, so that this optional demonstration does not create an unapproved biometric-data store.

## Implementation Decisions

- Official-provider-only behavior applies to every user-facing eGov-branded runtime capability. Generated provider outcomes and network-error success fallbacks are removed.
- Provider doubles remain permitted only as redacted fixtures inside automated tests. They cannot be selectable runtime modes.
- The supported integration environment is the official eGov staging environment issued through scoped partner credentials. No production or live deployment is authorized by this specification.
- Donor, recipient, hospital, clinical, appointment, and coordination records remain synthetic. An official staging identity does not convert synthetic healthcare data into live data.
- Citizen runtime authentication uses official eGov staging SSO only in every environment, superseding runtime invitation login. Authentication invitations are superseded; provider doubles are automated test fixtures only, never runtime modes. Case and pair workflow invitations remain.
- Both official eGovPH in-app `exchange_code` handoff and official web widget are supported; eBuhay supplies no independent OTP/PIN or synthetic Citizen login. The in-app handoff cannot establish a local session from an uncorrelated code alone: after official token/profile verification, eBuhay presents a pending verified identity and requires explicit Citizen confirmation. It cannot silently replace an existing session. Where the provider guide omits state/nonce or callback correlation, the partner contract must be clarified rather than invented.
- eGov SSO follows the provider callback flow: eGovPH supplies a short-lived, single-use `exchange_code`; the server exchanges it using the credential-issued base URL, partner code, partner secret, and `SSO_AUTHENTICATION` scope; the server then requests the official SSO profile with the returned bearer token.
- The callback route uses HTTPS in deployed environments. The application will not invent a provider login-launch URL that is absent from the verified contract.
- Exchange codes, partner secrets, and provider access tokens are server-only. They are never returned to the browser, persisted as Citizen identity data, or written to logs.
- SSO exchange replay is rejected. The application preserves its existing single-use exchange tracking and HttpOnly application-session cookie boundary.
- An official profile must include a stable `uniqid`. Missing or malformed `uniqid` fails authentication rather than creating an identity.
- Citizen accounts are created or linked only by provider plus `uniqid`. Names, email addresses, and mobile numbers are never automatic account-linking keys.
- No migration interface is added speculatively. If an exceptional account migration is later required, it must be an authenticated, explicitly authorized, and audited Staff action.
- Retained SSO identity data is minimized to `uniqid`, display name, provider, verification time, and optional consented contact information required by an approved eMessage workflow.
- Once signed in, a Citizen chooses donor or recipient case intent; this does not create separate account types. eBuhay sign-out revokes only the local eBuhay session and does not claim to end the eGovPH session.
- eGov SSO proves Citizen identity only. Hospital Staff authentication and authorization remain project-owned and separate.
- eGovChain uses the official credential-issued staging JSON-RPC endpoint, chain ID `13371`, the project-controlled signer, zero-gas validation, and confirmed transaction receipts.
- eGovChain payloads contain commitments or hashes plus non-identifying metadata only. They never contain names, contact details, medical information, case content, or raw consent documents.
- A chain submission is pending until a successful canonical staging receipt is validated for the submitted transaction and expected chain. The UI may report anchored only after that evidence; neither a local request ID nor a simulated transaction is a receipt. On-chain consent data is synthetic and is not legal or clinical consent.
- eMessage uses the official SMS push contract through the server. Provider authentication is never sent to the browser.
- eMessage is reached only through an authenticated, authorized notification workflow. A direct arbitrary-number public SMS relay is not exposed.
- SMS consent defaults to off, is explicit, and may be revoked. Only a mobile number supplied by official SSO and covered by the opt-in is a destination; an unverified manually entered number is not. A mobile number returned by SSO does not itself constitute notification consent.
- Approved SMS purposes are appointment changes, application-status updates, and document-action reminders. Message bodies remain generic and omit medical or sensitive case information.
- The documented eMessage SMS push `201 Created` response means the request was accepted by eMessage, not sent by a carrier or delivered to a handset. Display “Accepted by eMessage” with delivery unconfirmed. Failed or unavailable requests remain failed or unavailable; undocumented message IDs and `sent`/`delivered` fields are not required to recognize the documented acceptance response. Ambiguous submissions require reconciliation, not automatic duplicate retries.
- eGovAI is limited to fixed, curated public eBuhay-process FAQs. Users do not submit free-text prompts, and requests do not include identity, case, clinical, donor, recipient, matching, or appointment data.
- eGovAI cannot make or influence eligibility, clearance, matching, ranking, treatment, legal, or other authoritative decisions.
- The official eGovAI implementation waits for the team to supply a redacted authenticated contract describing its exact token and inference request and response schemas. No private endpoint or field is guessed from public summaries.
- eVerify is not a product feature: remove its user-facing entry points and runtime API/provider paths rather than displaying a deferred placeholder. No eVerify credentials, calls, profile, PCN, PASS result, or fallback are used. Face Liveness is a separate, optional Citizen-initiated proof-of-presence demonstration after SSO, never an identity, authentication, case-eligibility, or clinical gate. Each session needs explicit opt-in; there is no eBuhay selfie or reference-image display or retention.
- Face Liveness creates one pending session bound to the authenticated Citizen. The hosted `redirect` return triggers server-to-server result retrieval; redirect parameters cannot assert success. Show “Presence check completed” only when the official result is `SUCCEEDED` with `confidence_score >= 95`; otherwise show “Not completed—retry.” Never show or persist the raw score.
- Until a liveness-specific retention basis is approved, no outcome, score, session token, or image is persistently retained; only transient pending-session state is permitted. Runtime remains unavailable until the authenticated provider error/status contract, safe session binding, provider retention terms, privacy notice, and safety checks are approved. The existing generic audit retention class is not assumed to cover liveness outcomes.
- Each enabled integration validates its credential-issued HTTPS base URL and required secrets during deployment startup. Missing or malformed credentials are configuration failures, not provider outages.
- Once correctly configured, upstream timeouts, transport failures, invalid responses, and non-success responses fail closed with a clear unavailable error. Retry is offered only where it cannot duplicate or misstate a completed external action.
- Application-owned session, encryption, MFA, hospital-signing, and blockchain-signer keys remain required. These security controls are distinct from prohibited generated provider results.
- Audit events are metadata-minimized. They include feature name, internal request ID, provider status, timestamp, actor, and provider correlation ID when supplied; they exclude credentials, tokens, exchange codes, message bodies, and unnecessary personal data.
- User-facing labels are evidence-based. SSO verified identity, SMS request acceptance, completed presence check, and chain anchoring require their respective official evidence; otherwise the UI shows unavailable, pending, or the exact known provider status. SMS acceptance never implies delivery.
- Existing application modules and authorization boundaries are reused. No new provider abstraction, test framework, or generalized integration platform is introduced unless a verified contract proves the existing seams insufficient.

## Testing Decisions

- Tests assert externally observable behavior rather than private helper calls or internal implementation structure.
- The primary automated seam is the server HTTP application. Tests call public application endpoints and replace only the outbound official-provider boundary with redacted, official-shaped fixtures.
- Official SSO HTTP tests cover both official entry paths, in-app pending identity before explicit confirmation, no silent session replacement, missing `uniqid`, malformed provider responses, provider rejection/unavailability, exchange-code replay, in-app application-session creation only after confirmation, account linking by provider identity, and the absence of provider secrets or tokens in responses. The provider's callback-correlation behavior requires authenticated partner evidence before credentialed completion is claimed.
- Authentication tests prove that matching names, emails, or mobile numbers do not merge Citizen accounts and that Citizen SSO never creates Hospital Staff authority.
- eGovChain HTTP tests cover privacy-preserving payload construction, pending status before confirmation, confirmed receipt status, upstream failure, chain mismatch, and absence of personal or medical data from submitted payloads and logs.
- eMessage HTTP tests cover default-off consent, SSO-mobile-only destination, explicit opt-in, revocation, authenticated and authorized triggers, rejected arbitrary public sends, approved purposes, generic message content, documented `201 Created` request acceptance without delivery claim, ambiguous failure handling, and provider failure.
- eGovAI HTTP tests will be added only after the authenticated provider contract is available. They will prove that only fixed public FAQ selections use the official schema, arbitrary text and prohibited personal or case fields cannot cross the provider boundary, provider failures do not generate answers, and responses remain informational.
- UI and HTTP tests prove there is no eVerify entry point or operational endpoint; legacy eVerify requests fail closed without provider calls or generated profiles/PASS results. Until Face Liveness gates pass, its runtime endpoints and UI remain unavailable without fabricated sessions, scores, or tokens. Once enabled, HTTP and client tests cover per-session opt-in, authenticated session binding, untrusted redirect parameters, server-side result retrieval, the `SUCCEEDED`/95 threshold, failure and expiry, no raw-score/image display, no persistent liveness-specific result, and no effect on sign-in or case access.
- The existing partner SSO application test is the prior-art seam for callback exchange and session-cookie behavior. It should be extended instead of replaced by lower-level helper tests.
- The secondary automated seam is the user-visible client state. Existing client test facilities will verify callback confirmation, post-authentication case intent, local-only sign-out, removal of invitation login, consent controls, curated FAQs, and truthful unavailable, pending, accepted, completed-presence-check, and anchored labels.
- If the current client has no suitable UI test facility, implementation will prefer the smallest existing component or application seam and will not add a new testing framework solely for this work.
- Server and client typechecks plus the production client build remain mandatory structural checks after each vertical slice.
- Credentialed smoke checks run against the Vercel staging deployment and official staging services, separately from CI. They cover both SSO entry paths and confirmation, an actual eGovChain confirmed receipt, an opted-in eMessage request accepted without delivery claim, and a curated public eGovAI FAQ after its contract is approved. Optional Face Liveness smoke is required only once its separate provider/privacy gates approve enabling it.
- Staging smoke checks use approved staging identities and synthetic healthcare records only. They never print secrets or persist provider tokens in test artifacts.
- CI does not call real provider services. Redacted fixtures must match verified contracts closely enough that incompatible provider responses fail tests rather than being broadly coerced.
- No success assertion is based solely on a local request ID or redirect parameter. Official profile evidence, documented SMS request acceptance, a verified liveness result when enabled, or a validated chain receipt is required for the respective claim.

## Out of Scope

- Production or controlled-live eGov deployment.
- Live donor, recipient, hospital, blood-service, clinical, appointment, or coordination records.
- Citizen eGov identity granting Hospital Staff authority.
- Any eVerify feature, placeholder, credential, provider call, or runtime API. Face Liveness as an authentication, identity-verification, eligibility, or clinical gate; Face Liveness runtime before its authenticated contract, provider retention terms, privacy notice, and safety approval.
- Persistent liveness-specific outcome, raw score, token, selfie, or reference image before a separately approved retention basis.
- Free-text eGovAI chat or any transfer of Citizen, case, or clinical data to eGovAI.
- SMS delivery claims based only on eMessage `201 Created`.
- Email, in-app messaging, or other eMessage channels whose official public schemas have not been verified.
- Case-specific, clinical, legal, eligibility, matching, ranking, scheduling, or treatment advice from eGovAI.
- Sending Citizen identity, medical information, or case content to eGovAI.
- Automatic account merging by name, email address, mobile number, or demographic similarity.
- A speculative Staff migration console for exceptional Citizen account linking.
- Inventing undocumented provider URLs, request fields, response fields, scopes, callbacks, or environment names.
- Replacing application-owned security secrets with provider credentials.
- Legal, privacy, security, or operational approval for a live launch.
- General refactoring unrelated to the official eGov integration boundaries.

## Further Notes

- Authority is ordered: [canonical PRD](../../tasks/prd-hospital-integrated-donation-platform.md) > this specification for branded integrations > [synthetic hospital demo specification](../synthetic-hospital-demo/spec.md) for healthcare workflows. Accepted ADR 0013 and the project context glossary align with this hierarchy.
- The implementation order is official SSO first, then its dependent eGovChain and eMessage flows. eGovAI authenticated contract capture is independently blocked on provider evidence; eVerify is removed from the product. Optional Face Liveness has a separate provider/privacy gate and does not block SSO, consent, messaging, or AI progress.
- eGovAI implementation is blocked until the team supplies a redacted authenticated provider schema and documented privacy/error behavior. Optional Face Liveness needs authenticated error/status and provider-retention contracts plus privacy approval. Credentials themselves belong in deployment environment variables and must not be pasted into tickets, documentation, chat, source control, or fixtures.
- Provider-issued base URLs are configuration values. Documentation examples are not authority to hardcode an environment URL.
- eMessage can use the existing consent, suppression, retry, and authenticated notification workflow if it satisfies this specification; a second notification pipeline is unnecessary.
- Retry behavior must respect operation semantics. Single-use SSO exchanges are not replayed, and message or chain retries must not produce duplicate external effects.
- The revised dependency DAG and ticket acceptance checklists are approved. This approval does not authorize implementation while the user-requested execution pause remains in effect, and it does not waive provider contracts, credentialed smoke evidence, or privacy approval.
