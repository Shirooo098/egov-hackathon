# eBuhay Domain Context

eBuhay is a project-owned synthetic coordination prototype for blood and multi-organ donation journeys. It uses a simulated hospital and contract doubles; it is not a live healthcare service or clinical authority. Authority is ordered: [canonical PRD](tasks/prd-hospital-integrated-donation-platform.md) > [official eGov staging integration specification](.scratch/official-egov-integrations/spec.md) for branded integrations > [synthetic hospital demo specification](.scratch/synthetic-hospital-demo/spec.md) for healthcare workflows.

## Language

**Citizen account:** One adult synthetic account that may own separate donor and recipient cases.

**eBuhay Simulated Hospital:** The project-owned synthetic hospital used to demonstrate coordination workflows. It is not a real hospital or clinical authority.
_Avoid_: Partner hospital

**Hospital contract double:** An executable synthetic adapter standing in for hospital events and booking evidence. It is not a live integration.
_Avoid_: Live integration

**Transplant service:** A synthetic multi-organ workflow label. It does not provide transplant eligibility, allocation, or clinical decisions.

**Demo candidate:** A seeded, unranked synthetic participant used for coordination rehearsal. It is not a match, recommendation, or eligibility result.
_Avoid_: Match

**Experimental compatibility suggestion:** A Hospital Staff-only, read-only, visibly unvalidated eBuhay research mockup made from static synthetic donor/recipient fixtures for kidney, liver, heart, lung, and pancreas. It is separate from eGovAI, unordered, has no percentage, and cannot establish compatibility, rank authoritative candidates, change workflow, create a pair, send an offer, or allocate an organ.
_Avoid_: AI match, verified match, clinical recommendation, allocation

**Synthetic Demo Ready:** The state in which the synthetic showcase walkthrough, disclosures, reset behavior, and checks are repeatable. It is not production readiness.
_Avoid_: Production ready

**Hosted synthetic showcase:** A deployed, stable demonstration surface that uses fictional data, synthetic access, staging-only eGovChain anchoring, and visible disclosures. A hosting platform may label its deployment slot “Production,” but the showcase is not a live healthcare production service.
_Avoid_: Production deployment

**Official eGov staging API:** The official staging API for the named eGov-branded feature. Every user-facing eGov-branded feature uses its official staging API; service unavailability is shown as a clear error and may be retried, never replaced with generated or synthetic success output.

**Official eGov staging identity:** An identity supplied by the official staging provider for testing authentication or notifications. It does not make donor, recipient, hospital, clinical, or appointment records non-synthetic.

Runtime simulated eGov implementations are removed; provider mocks are test-only. A successful official staging SSO identity may create or link a Citizen only when it includes a stable `uniqid`; eBuhay never invents identities. Retain only `uniqid`, display name, provider, verification time, and optional consented contact needed for eMessage. Never retain an access token or exchange code.

Citizen runtime login is official eGov SSO only in every environment; invitation identities are test fixtures only. Authentication invitations are superseded, while case and pair workflow invitations remain. Provider doubles are automated test fixtures only. Existing Citizen accounts link only by official `uniqid`. Names, email addresses, and mobile numbers never auto-merge accounts; exceptional migration requires an authenticated, audited staff action.

**eGov SSO:** Citizen authentication only. eGov SSO never grants Hospital Staff authority; staff access remains a separate project-owned boundary (named accounts with password plus MFA). Official staging identity never grants production or live approval.

**Official eGov scope:** The first scope is official eGov SSO, official eGovChain consent commitments, official eMessage transactional notifications triggered by consent and authenticated actions, and official eGovAI informational-only responses. eGovAI never makes clinical or legal decisions. eVerify and dependent Face Liveness are deferred pending team assessment.

**eMessage boundary:** Official eMessage is limited to appointment changes, status updates, and document-action reminders. Each notification requires explicit opt-in and an authenticated server trigger; SMS content is generic and non-medical.

eMessage opt-in defaults off and can be revoked. A provider mobile number does not auto-enroll a Citizen.

**eGovAI boundary:** Official eGovAI provides public process guidance and FAQs only. It receives no identity, case, clinical, donor, recipient, or appointment data.

**Project-owned security secrets and keys:** Required eBuhay-controlled secrets and signing keys remain distinct from generated provider outputs. Production or live use is not authorized.

Any enabled feature missing required credentials blocks deployment. Runtime provider outages return a clear `503` and retry option. Private provider-contract implementation waits for authenticated schemas and never guesses.

**eGovChain privacy:** eGovChain stores commitments or hashes and non-identifying metadata only; it never stores PII, medical data, case data, or raw consent content.

**eGov audit and status:** Audit logs include the feature, internal request ID, provider status, time, actor, and correlation ID when supplied, but never credentials, tokens, exchange codes, message bodies, or unneeded PII. The UI never reports verified, sent, or anchored without a confirmed official response or receipt; otherwise it shows unavailable, pending, or the exact returned status. This completes the decision set.

**Ticket completion:** The state in which the current implementation satisfies every binding acceptance criterion and retains the required evidence. Implemented code without that evidence is not ticket completion.
_Avoid_: Code complete

**Hospital:** The institutional system and staff boundary. In this prototype, the eBuhay Simulated Hospital owns only synthetic records and simulated booking evidence.

**Coordinator:** The synthetic operational role responsible for intake, case follow-up, proposals, appointment requests, and escalation.

**Confirmed booking:** A booking projection backed by separately recorded synthetic hospital evidence. It is not automatic synchronization.

**eGovChain commitment:** Tamper-evident cryptographic evidence for an approved grant or withdrawal, anchored with the exact consent version and scope in synthetic staging. The planned anchor is a salted SHA-256 commitment in transaction calldata; it is distinct from clinical consent and current authorization, and does not guarantee legal validity.

**eGovChain provider:** The DICT-operated hosted Hyperledger Besu network and JSON-RPC gateway. It issues the RPC base URL and access token; eBuhay connects to it and does not operate blockchain nodes or validators.

**eGovChain credential:** The provider-issued RPC base URL and token that permit eBuhay to call the hosted gateway. It is separate from the eBuhay-controlled signer private key.

**Case consent:** Versioned citizen coordination and information-sharing consent attached to one donor or recipient case, with separate unchecked controls for each explicit purpose. Each feature requires its applicable consent; donor withdrawal does not change recipient consent.

**Pairing consent:** Separate versioned consent for a particular donor-recipient pairing. Each citizen's grants and withdrawals are independently recorded with their exact version and scope.

**Consent scope:** The exact case, pairing, purpose, terms, assigned hospital, or proposed pairing covered by a consent grant. Changes require fresh consent for the affected scope while retaining prior evidence.

**eGovChain receipt:** Evidence of an actual eGovChain staging transaction anchoring synthetic consent, clearly labeled with its environment. It is shown only after successful anchoring; pending or failed retries never become a fabricated receipt.

**eGovChain signer:** A project-controlled blockchain identity dedicated to one synthetic staging environment. Its private key authorizes transactions and remains server-side; only its public address may be shared for verification or provider allowlisting. Local and hosted Preview environments use different signers.
_Avoid_: Personal wallet

**Current consent:** The newest applicable grant or withdrawal for one actor, purpose, and exact current scope in eBuhay. An eGovChain receipt proves an event was anchored; it does not decide current permission.
