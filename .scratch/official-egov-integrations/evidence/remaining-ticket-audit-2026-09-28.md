# Remaining official integration requirements — 2026-09-28

[TOOL] Audited runtime revision: `c01cc6a` on `feature/official-egov-open-tickets`. The full goal remains incomplete. This is a requirements/evidence audit, not new provider or deployment verification. The current approved ticket working tree is the scope reference; existing documentation edits were preserved.

[TOOL] Antigravity read-only explorer conversation `508e5fe5-a572-4d90-9923-de7e21a99392` exited0 with outer `status: SUCCESS` and reported no additional actionable local gap in01/04/07/08. It inspected local SSO, widget, SMS, configuration callers and their fixture coverage. It did not execute tests, providers, databases or browser journeys.

| Ticket | Proven local work / retained evidence | Still required to finish |
| --- | --- | --- |
| 01 SSO | Server exchange, pending confirmation/cancellation, replay protection, stable-identity linking and secret-exclusion fixtures. Earlier standalone token/profile check200/200 did not create an app session. | Fresh unredeemed approved staging code; actual in-app callback, confirmation and session journey. Provider callback correlation remains unknown, with no inferred state/nonce guarantee. |
| 02 eVerify removal | Feature/API paths removed; current regression suite covers removal and deferred Face Liveness. | Complete under current scope. |
| 03 Chain | Read-only URL/token startup, four documented methods, strict response checks, no signer/broadcast/anchor worker, historical consent labels. | Authorized actual chain13371/zero-gas/public-block observation with UTC time and source revision. Configuration and fixtures are not provider evidence. |
| 04 SMS | SSO-mobile-only opt-in/revocation, authorized synthetic triggers, accepted/unconfirmed statuses and no automatic resend. Retained isolated PostgreSQL test passed; standalone SMS201 accepted and user confirmed receipt. | Approved SSO identity whose mobile matches the controlled destination, app opt-in, authorized workflow trigger, actual201 acceptance and persisted metadata audit. Previous SSO identity mobile mismatched ending4218; do not override it or repeat the standalone send. |
| 05 AI contract | Supplied token/inference schemas and documented unknowns recorded. | Complete as documentation only; no actual provider behavior inferred. |
| 06 public FAQ | Documented token/inference implementation, fixed public prompts, response validation, generic failures, server-only secrets/session identifiers, throttle and informational UI. | Authorized actual token plus one fixed public FAQ inference using the configured staging gateway. Error/quota/retention unknowns are recorded, not invented additional gates. |
| 07 deployment | Startup shape/pair validation, truthful health/UI, privacy safeguards, current server127/127/typecheck and client10/10/typecheck/build. | Deployment revision matching the intended tested source, plus complete staging observations for01/03/04/06/08. User supplied the URL and said deployed; no browser inspection authorized. |
| 08 widget/journey | Documented widget callback, restored/pending sessions, post-login case choice and local sign-out are implemented with retained fixtures. | Actual widget load/return on staging; both entry paths use the same stable-identity account, preserve Citizen/Staff separation, case choice and local revocation. |
| 09 optional liveness | Separate optional scope, currently unavailable. | Explicitly deferred; provider/privacy/session safeguards remain outside the core07 gate. |

## Evidence pointers

- [Current runtime verification](read-only-chain-and-ai-local-checks-2026-09-28.md): final normal server127/127, client provider UI10/10, typechecks/build and independent security review. These checks were not repeated for this audit.
- [Standalone SSO provider evidence](sso-provider-smoke-2026-09-27.json): source863e4d5, no account/session/DB creation, approved destination mismatch.
- [Standalone SMS provider evidence](emessage-provider-smoke-2026-09-27.json): one accepted request; subsequent human receipt confirmation is recorded in Ticket04.
- [Ticket04](../issues/04-official-opted-in-emessage-notifications.md): retained isolated PostgreSQL workflow evidence and remaining actual staging acceptance.
- Local audited paths: `server/src/routes/egov-auth.ts`, `server/src/auth/egov-citizen.ts`, `server/src/services/eMessageService.ts`, `server/src/services/notificationService.ts`, `server/src/runtime/config.ts`, `client/src/features/onboarding/EgovSsoForm.tsx`, `client/src/features/onboarding/RoleSelectionForm.tsx`; relevant SSO/SMS/widget fixtures are referenced by the tickets.
- [Staging runbook](../../../docs/OFFICIAL_EGOV_STAGING_SMOKE.md): approved inputs, operator actions and evidence requirements.

[USER/TOOL] The existing question for four read-only Chain requests and one AI token/FAQ check remains unanswered. No dependent operation proceeds without that authorization. Fresh identity/deployment/journey inputs remain separate requirements; optional Face Liveness is not substituted for completing the core goal. No new runtime gap was found to implement while these inputs remain missing.
