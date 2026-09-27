# Official eGov staging smoke checks

This is the execution and evidence checklist for official integration Ticket 07.
It is not a completed smoke result or authorization to deploy or contact providers.
Run separately from CI, against the approved Vercel staging deployment and
credential-issued official staging services. All healthcare workflows stay synthetic.

## Inputs required before execution

- Approved staging deployment URL, deployed Git revision, operator, and UTC time.
- Approved staging Citizen identity for each SSO entry path and a separate named
  Staff account with password/MFA and the required hospital/service authority.
- Server-side credentials configured by the deployment owner. Record only that
  configuration was checked; never paste values or credential-bearing URLs.
- A synthetic case and consent workflow owned by these test accounts.
- An explicitly approved SMS destination supplied by the staging Citizen's SSO
  profile, with opt-in. Confirm who controls the destination before sending.
- Partner evidence for callback correlation and acceptance of the implemented
  confirmation, minimal-profile, `uniqid`-only linking, and local sign-out behavior.
- Ticket 05's approved authenticated AI success/error/quota contract and applicable
  prompt/response privacy terms before enabling or calling eGovAI.

Credentials being present does not close the provider-contract gates. If an input
is missing, record the affected check as blocked; do not replace it with a fixture.
Optional Face Liveness remains unavailable until Ticket 09's separate gates pass.

## Procedure and required observations

| Check | Operator action | Evidence required to pass |
| --- | --- | --- |
| Deployment | Inspect the deployed revision, synthetic mode, enabled-feature configuration, and safe health response. Use existing startup tests for invalid configuration; do not break a shared deployment to test it. | Exact deployed revision and configuration-check result; distinguish configured from provider-verified. No guessed endpoint, eVerify feature, or runtime provider double. |
| In-app SSO | Open the service from the approved eGovPH staging journey with a fresh single-use exchange code. Confirm the pending identity explicitly. | Actual token/profile operation succeeded; no local session before confirmation and no silent account switch. Session created only after confirmation; Citizen has no Staff authority. No exchange code or token in the retained evidence. |
| Web-widget SSO | Use the pinned official widget with the approved staging identity. Complete the supported confirmation journey. | Official profile verification and the same `uniqid`-linked account across both entry paths; no name/email/mobile linking. Restored session, donor/recipient case choice, and local-only sign-out behave as specified. |
| Read-only Chain | Call documented eth_chainId, eth_gasPrice, eth_blockNumber and eth_getBlockByNumber through the server with issued URL/token. | Chain13371, gas price0 and valid public block fields; retain revision/time and sanitized results. No signer, consent submission, broadcast or anchor claim. Runtime alignment must pass before execution; no new RPC run is claimed here. |
| eMessage | Verify consent starts off, opt in explicitly, then perform one approved authorized Staff workflow trigger. | Current SSO mobile is the destination; generic simulated-demo body and approved purpose. Official HTTP `201` acknowledgement and attributed internal notification/audit references. UI says accepted with delivery unconfirmed; no delivery timestamp or delivery claim inferred from acceptance. |
| SMS revocation | Revoke consent before a subsequent approved workflow notification. | No further provider send for that notification. Retain the internal suppression result, without the destination or body. Do not resend an ambiguous previous attempt. |
| eGovAI | After Ticket 05 approval and implementation, select one fixed public FAQ. | Actual official response matches the approved contract; informational label, no free-text/personal/case data sent, and no local-answer fallback. Record FAQ ID and redacted outcome; omit tokens and provider session identifiers. |
| Failure and privacy | Inspect the affected automated failure/authorization/privacy checks for the deployed revision and the metadata from actual smoke operations. | Failures remain unavailable/pending as appropriate, with no fabricated result. Audit records contain only necessary actor, feature, internal request, purpose/status, time, and supplied correlation metadata; no secret, exchange code, SMS body, or unnecessary personal data. |
| Structural checks | Run server and client typechecks, affected provider-boundary tests, and the production client build for the deployed source revision. | Retain actual command, revision, time, and pass/fail output for every required check; prior-revision or fixture-only results cannot replace staging observations. |

Never treat a redirect parameter, configured health state, local test fixture, or
successful HTTP status alone as provider identity, chain finality, or SMS delivery.
Do not retry an ambiguous SMS submission; record it as unresolved until the
provider reconciliation contract or an approved manual-evidence workflow exists.

## Retained result

Create a redacted Markdown result in `.scratch/official-egov-integrations/evidence/`
only after an actual run. Use this compact shape; do not prefill passing results:

```text
Run time (UTC):
Operator and approval reference:
Staging deployment URL and deployed revision:
Synthetic fixture reference (no identity/contact/clinical content):
For each check: passed / failed / blocked / not run
For each executed check: time, observed result, redacted evidence reference
Chain: chain ID, gas price, public block hash/number, observation time, no-write check
SMS: internal request reference, purpose, HTTP status, accepted/unavailable state
Provider-contract approval references:
Source revision, server/client typechecks, provider-boundary tests, production client build:
Cleanup and unresolved operations:
Open gates and accountable owner:
```

Review artifacts before retention. Exclude secrets, bearer/session tokens, exchange
codes, raw profiles, mobiles, message bodies, consent documents, and raw HAR files.
Do not run a shared reset or delete consent/audit evidence as smoke cleanup.
Record any outstanding transaction or ambiguous notification for reconciliation.

Ticket 07 remains open until all its required checks have actual retained evidence.
Partial results do not establish deployment, partner, legal, clinical, or production
approval. Optional Face Liveness has a separate smoke record if its gates later pass.
