# Read-only Chain and public FAQ implementation — 2026-09-28

Scope: local runtime implementation and automated fixtures, based on `07de449` on `feature/official-egov-open-tickets`. This record is committed with the tested source changes. No actual provider, database, browser, deployment or push operation was performed.

## Implemented behavior

- eGovChain accepts issued HTTPS URL/token settings without a signer. Only documented chain ID, gas price and block reads are allowed. Requests reject extra/private parameters, redirects, wrong chain, nonzero gas, malformed responses and stalled response bodies.
- Consent writes retain existing authorization, idempotency, audit and withdrawal behavior, record deferred anchoring, and enqueue no chain work. The worker performs no anchor processing. Existing stored history is preserved; views, replay responses and privacy exports distinguish historical records from current proof.
- Public FAQ uses the supplied token and inference endpoints with fixed public prompts only. Credentials and session identifiers remain server-side. Malformed results, failures and timeouts produce unavailable/retry guidance. No generated/local fallback, token cache or answer persistence was added. Legacy FAQ requests use the existing throttle.
- Health reports configuration rather than provider verification; UI labels reflect request outcomes and retain informational limits.

## Verification

Independent Codex tester checked the final runtime/fixture working tree:

| Check | Result |
| --- | --- |
| Server `npm run test` | 127/127 passed; normal fixture manifest, no PostgreSQL suite |
| Server `npm run typecheck` | Passed after fixture repairs |
| Client Vitest, `officialEgovDeferred.test.tsx` + `egovAiResponse.test.ts` | 2 files, 10/10 passed |
| Client `npm run build` | Typecheck passed; Vite production build passed, 87 modules |
| Owned diff whitespace and new-file size checks | Passed; each new code/test file under300 code lines |

AI environment keys were empty at test process launch; provider calls were intercepted fixtures and database pools were injected fakes. HTTP tests used local loopback. No temporary shim/file was needed.

The first focused run exposed fixture authentication/Drizzle setup errors and stale unavailable-code expectations. These were repaired; the final normal server run and both client files passed.

Independent Codex security review found a historical-status omission in replay/export responses; root repaired both callers and review confirmed resolution. Antigravity exploration and implementation completed successfully before root integration.

## Remaining evidence

Tickets03 and06 remain open for authorized actual staging observations at the committed revision. Fixture checks establish local behavior, not provider availability, deployed journeys, SMS delivery or clinical/identity proof. Existing unrelated staged and unstaged documentation changes are excluded from this runtime milestone commit.
