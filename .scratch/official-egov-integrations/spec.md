# Official eGov Staging Integrations

**Status:** ready-for-agent

## Problem Statement

eBuhay currently contains a mixture of official eGov staging integrations, locally generated eGov-like results, and disabled or incomplete provider paths. A Citizen can encounter synthetic invitation authentication, generated verification outcomes, simulated liveness results, locally reported message delivery, or fabricated AI responses. Those behaviors make it difficult to distinguish an official provider result from a project-owned demonstration.

Every user-facing eGov-branded capability must use the corresponding official eGov staging API. If an official service is unavailable, unconfigured, or not yet contractually understood, eBuhay must report that truthfully instead of generating a successful result. This official-provider requirement applies only to eGov integrations; donor, recipient, hospital, clinical, appointment, and coordination records remain synthetic under the project roadmap.

## Solution

Make official eGov staging services the only runtime providers for eGov-branded features. Citizen authentication will use official eGov SSO and link accounts by the provider's stable `uniqid`. eGovChain will anchor privacy-preserving consent commitments. eMessage will send a narrow set of consented transactional SMS messages through authenticated server-side workflows. eGovAI will provide public eBuhay process guidance only after its authenticated provider contract is verified.

Remove runtime-generated eGov outcomes and retain provider doubles only as redacted automated-test fixtures. Defer eVerify and Face Liveness until the team separately approves their use and obtains the exact authenticated contracts. Missing configuration will prevent an enabled feature from starting; provider outages will return clear unavailable responses with retry guidance. No provider credential, exchange code, or access token will be exposed to the browser or written to logs.

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
18. As a Citizen, I want message delivery status to reflect the official provider response, so that a failed send is not displayed as delivered.
19. As an authorized Staff member or system workflow, I want to trigger approved transactional messages, so that arbitrary public callers cannot use eBuhay as an SMS relay.
20. As an authorized Staff member, I want notification attempts attributed to an authenticated actor and internal request, so that the action can be audited without logging message content.
21. As a Citizen, I want eGovAI to answer public eBuhay process questions, so that I can understand the coordination journey.
22. As a Citizen, I want AI guidance visibly identified as informational, so that I do not mistake it for clinical or legal advice.
23. As a Citizen, I want the assistant to report unavailability when the official eGovAI service fails, so that a generated local answer is not represented as official.
24. As a Citizen, I want my identity and case information excluded from eGovAI requests, so that public guidance does not disclose personal or clinical data.
25. As a Doctor or Clinical Lead, I want eGovAI excluded from eligibility, clearance, matching, ranking, and treatment decisions, so that clinical authority remains with qualified people and hospital systems.
26. As a Citizen, I want eVerify and Face Liveness shown as unavailable or deferred, so that I never receive a fabricated PASS result, profile, session, or confidence score.
27. As a team member, I want enabled integrations to require complete official credentials at deployment, so that configuration mistakes are detected before users rely on a feature.
28. As a team member, I want provider base URLs to come from approved credentials, so that undocumented or guessed environments are never contacted.
29. As a team member, I want provider secrets stored only in the deployment environment, so that credentials are not committed or delivered to the browser.
30. As a team member, I want official access tokens retained only for the minimum server-side operation, so that a token is neither persisted unnecessarily nor exposed.
31. As a team member, I want provider mocks limited to automated tests, so that runtime code cannot silently switch to simulated success.
32. As a team member, I want audit logs to contain feature name, internal request ID, provider status, time, actor, and provider correlation ID when supplied, so that incidents can be investigated without collecting unnecessary personal data.
33. As a team member, I want credentials, tokens, exchange codes, message bodies, and unnecessary personal data excluded from logs, so that diagnostics do not create another sensitive-data store.
34. As a team member, I want the UI to distinguish unavailable, pending, sent, verified, and anchored states, so that every claim corresponds to confirmed provider evidence.
35. As a team member, I want contract tests based on redacted official schemas, so that undocumented provider changes fail visibly instead of being normalized into plausible output.
36. As a deployment owner, I want credentialed smoke checks isolated from CI, so that real provider calls and secrets are not used by ordinary automated test runs.
37. As a deployment owner, I want the Vercel staging deployment to fail closed when an enabled feature lacks credentials, so that no partially simulated deployment is published.
38. As a product stakeholder, I want every official integration clearly limited to provider staging, so that the demonstration is not represented as a live government or healthcare service.
39. As a product stakeholder, I want all healthcare workflow records to remain visibly synthetic, so that official identity or notification testing does not imply live clinical integration.
40. As an auditor, I want successful claims backed by an official response or confirmed chain receipt, so that the system never labels an operation verified, sent, or anchored without evidence.

## Implementation Decisions

- Official-provider-only behavior applies to every user-facing eGov-branded runtime capability. Generated provider outcomes and network-error success fallbacks are removed.
- Provider doubles remain permitted only as redacted fixtures inside automated tests. They cannot be selectable runtime modes.
- The supported integration environment is the official eGov staging environment issued through scoped partner credentials. No production or live deployment is authorized by this specification.
- Donor, recipient, hospital, clinical, appointment, and coordination records remain synthetic. An official staging identity does not convert synthetic healthcare data into live data.
- Citizen runtime authentication uses official eGov staging SSO only in every environment, superseding runtime invitation login. Authentication invitations are superseded; provider doubles are automated test fixtures only, never runtime modes. Case and pair workflow invitations remain.
- eGov SSO follows the provider callback flow: eGovPH supplies a short-lived, single-use `exchange_code`; the server exchanges it using the credential-issued base URL, partner code, partner secret, and `SSO_AUTHENTICATION` scope; the server then requests the official SSO profile with the returned bearer token.
- The callback route uses HTTPS in deployed environments. The application will not invent a provider login-launch URL that is absent from the verified contract.
- Exchange codes, partner secrets, and provider access tokens are server-only. They are never returned to the browser, persisted as Citizen identity data, or written to logs.
- SSO exchange replay is rejected. The application preserves its existing single-use exchange tracking and HttpOnly application-session cookie boundary.
- An official profile must include a stable `uniqid`. Missing or malformed `uniqid` fails authentication rather than creating an identity.
- Citizen accounts are created or linked only by provider plus `uniqid`. Names, email addresses, and mobile numbers are never automatic account-linking keys.
- No migration interface is added speculatively. If an exceptional account migration is later required, it must be an authenticated, explicitly authorized, and audited Staff action.
- Retained SSO identity data is minimized to `uniqid`, display name, provider, verification time, and optional consented contact information required by an approved eMessage workflow.
- eGov SSO proves Citizen identity only. Hospital Staff authentication and authorization remain project-owned and separate.
- eGovChain uses the official credential-issued staging JSON-RPC endpoint, chain ID `13371`, the project-controlled signer, zero-gas validation, and confirmed transaction receipts.
- eGovChain payloads contain commitments or hashes plus non-identifying metadata only. They never contain names, contact details, medical information, case content, or raw consent documents.
- A chain submission is pending until its receipt is confirmed. The UI may report anchored only after confirmed receipt evidence.
- eMessage uses the official SMS push contract through the server. Provider authentication is never sent to the browser.
- eMessage is reached only through an authenticated, authorized notification workflow. A direct arbitrary-number public SMS relay is not exposed.
- SMS consent defaults to off, is explicit, and may be revoked. A mobile number returned by SSO does not itself constitute notification consent.
- Approved SMS purposes are appointment changes, application-status updates, and document-action reminders. Message bodies remain generic and omit medical or sensitive case information.
- Official provider status determines message status. Failed or unavailable sends remain failed or unavailable and are never locally marked delivered.
- eGovAI is limited to public eBuhay process guidance and FAQs. It does not receive identity, case, clinical, donor, recipient, matching, or appointment data.
- eGovAI cannot make or influence eligibility, clearance, matching, ranking, treatment, legal, or other authoritative decisions.
- The official eGovAI implementation waits for the team to supply a redacted authenticated contract describing its exact token and inference request and response schemas. No private endpoint or field is guessed from public summaries.
- eVerify and its dependent Face Liveness workflow are deferred pending separate team assessment. Their runtime UI and APIs report unavailable or deferred and never produce generated verification or liveness outcomes.
- Each enabled integration validates its credential-issued HTTPS base URL and required secrets during deployment startup. Missing or malformed credentials are configuration failures, not provider outages.
- Once correctly configured, upstream timeouts, transport failures, invalid responses, and non-success responses fail closed with a clear unavailable error. Retry is offered only where it cannot duplicate or misstate a completed external action.
- Application-owned session, encryption, MFA, hospital-signing, and blockchain-signer keys remain required. These security controls are distinct from prohibited generated provider results.
- Audit events are metadata-minimized. They include feature name, internal request ID, provider status, timestamp, actor, and provider correlation ID when supplied; they exclude credentials, tokens, exchange codes, message bodies, and unnecessary personal data.
- User-facing labels are evidence-based. Verified, sent, or anchored labels require confirmed official responses or receipts; otherwise the UI shows unavailable, pending, or the exact known provider status.
- Existing application modules and authorization boundaries are reused. No new provider abstraction, test framework, or generalized integration platform is introduced unless a verified contract proves the existing seams insufficient.

## Testing Decisions

- Tests assert externally observable behavior rather than private helper calls or internal implementation structure.
- The primary automated seam is the server HTTP application. Tests call public application endpoints and replace only the outbound official-provider boundary with redacted, official-shaped fixtures.
- Official SSO HTTP tests cover successful callback completion, a missing `uniqid`, malformed provider responses, provider rejection, provider unavailability, exchange-code replay, application-session creation, account linking by provider identity, and the absence of provider secrets or tokens in responses.
- Authentication tests prove that matching names, emails, or mobile numbers do not merge Citizen accounts and that Citizen SSO never creates Hospital Staff authority.
- eGovChain HTTP tests cover privacy-preserving payload construction, pending status before confirmation, confirmed receipt status, upstream failure, chain mismatch, and absence of personal or medical data from submitted payloads and logs.
- eMessage HTTP tests cover default-off consent, explicit opt-in, revocation, authenticated and authorized triggers, rejected arbitrary public sends, approved purposes, generic message content, provider failure, and truthful delivery status.
- eGovAI HTTP tests will be added only after the authenticated provider contract is available. They will prove that public FAQ requests use the official schema, prohibited personal or case fields cannot cross the provider boundary, provider failures do not generate answers, and responses remain informational.
- Deferred eVerify and Face Liveness tests prove that runtime endpoints and UI return unavailable or deferred without fabricated profiles, PASS results, sessions, scores, or tokens.
- The existing partner SSO application test is the prior-art seam for callback exchange and session-cookie behavior. It should be extended instead of replaced by lower-level helper tests.
- The secondary automated seam is the user-visible client state. Existing client test facilities will verify callback handling, removal of invitation login, consent controls, and truthful unavailable, pending, sent, verified, and anchored labels.
- If the current client has no suitable UI test facility, implementation will prefer the smallest existing component or application seam and will not add a new testing framework solely for this work.
- Server and client typechecks plus the production client build remain mandatory structural checks after each vertical slice.
- Credentialed smoke checks run against the Vercel staging deployment and official staging services, separately from CI. They cover SSO callback completion, an eGovChain confirmed receipt, an opted-in eMessage send, and a public eGovAI FAQ after its contract is approved.
- Staging smoke checks use approved staging identities and synthetic healthcare records only. They never print secrets or persist provider tokens in test artifacts.
- CI does not call real provider services. Redacted fixtures must match verified contracts closely enough that incompatible provider responses fail tests rather than being broadly coerced.
- No success assertion is based solely on a local request ID. Provider confirmation or a confirmed chain receipt is required for sent, verified, or anchored assertions.

## Out of Scope

- Production or controlled-live eGov deployment.
- Live donor, recipient, hospital, blood-service, clinical, appointment, or coordination records.
- Citizen eGov identity granting Hospital Staff authority.
- eVerify or Face Liveness implementation before separate team assessment and contract approval.
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
- The independent implementation frontier is official SSO-only Citizen authentication, truthful eVerify and Face Liveness deferral, and authenticated eGovAI contract capture. eGovChain and eMessage depend on authenticated Citizen behavior where they act on Citizen consent or preferences.
- eGovAI implementation is blocked until the team supplies a redacted authenticated provider schema. Credentials themselves belong in Vercel environment variables and must not be pasted into tickets, documentation, chat, source control, or fixtures.
- Provider-issued base URLs are configuration values. Documentation examples are not authority to hardcode an environment URL.
- eMessage can use the existing consent, suppression, retry, and authenticated notification workflow if it satisfies this specification; a second notification pipeline is unnecessary.
- Retry behavior must respect operation semantics. Single-use SSO exchanges are not replayed, and message or chain retries must not produce duplicate external effects.
- This specification intentionally defers ticket publication. It may be decomposed into dependency-ordered tracer-bullet tickets after approval without changing these decisions.
