# Showcase Release Rebaseline

## Approved/planned profile

The release profile is synthetic-only: Public Showcase, Private Synthetic Demo, and isolated Synthetic Pilot Rehearsal. Current data is project-owned synthetic data. Citizen runtime login uses official eGov staging SSO in every environment (authentication invitations are superseded; case and pair workflow invitations remain; provider doubles are tests only). The profile makes no partner-hospital, live-healthcare, clinical-clearance, government-endorsement, or production-deployment claim. Tickets 25–27 are Synthetic Hospital Foundation, Blood and Multi-Organ Simulation, and Synthetic Demo Ready.

## Environment and evidence

| Concern | Public Showcase | Private Synthetic Demo | Synthetic Pilot Rehearsal |
|---|---|---|---|
| Access | planned public | planned official eGov staging SSO | planned named rehearsal access |
| Database | isolated public-safe data | isolated synthetic database | isolated synthetic rehearsal database |
| Data | project-owned synthetic | project-owned synthetic personas | project-owned synthetic personas |
| Integrations | official eGov staging SSO; healthcare doubles | official eGov staging SSO; healthcare doubles | official eGov staging SSO; synthetic contract doubles |
| Disclosure | public synthetic label | private synthetic label | rehearsal-only label |

Local or hosted previews use isolated synthetic storage and require official eGov staging SSO for Citizen runtime login. Provider doubles are confined to automated tests. Evidence is revision- and environment-specific: Tickets 24 and 27 require measured checks and retained artifacts for the exact revision/environment. Read current status from those artifacts, not this summary.

### Ticket 24 evidence run

On a host with isolated PostgreSQL access, use a separate setup shell that temporarily binds `DATABASE_URL` and `DATABASE_DIRECT_URL` (or `MIGRATION_DATABASE_URL` for migrations) to the isolated synthetic test database; migrate and run `seed:synthetic` there, never against the runtime database. Restore the runtime values before setting `TEST_DATABASE_URL` and `TEST_DATABASE_DIRECT_URL`, and verify each test target is distinct from both runtime targets. With `EBUHAY_MODE=synthetic` and `SYNTHETIC_MODE=true`, set `SYNTHETIC_DEMO_REVIEWER` to the accountable reviewer and supply `SYNTHETIC_DEMO_MANUAL_CHECKS_JSON` with actual entries for `keyboard`, `screen_reader`, `contrast`, `responsive`, and `walkthrough`. Each entry must include `command`, `status`, `durationMs`, `timestamp`, and `details` identifying the tested source and environment. Run `cd server; npm run release:evidence`, retain raw command output and the generated artifact, and record results as measured: no status is assumed passed. Keep all data, credentials, integrations, and evidence within the synthetic-only boundary.

The `Synthetic baseline` GitHub Actions workflow supplies automated-only PostgreSQL evidence after a push or manual dispatch, using disposable isolated databases and retaining raw logs. Full Ticket 24 signoff still requires actual manual checks and an accountable reviewer; the workflow does not declare Demo Ready.

## Reusable disclosure copy

“This is a synthetic prototype using project-owned synthetic data and a simulated hospital. All records, hospital, blood, and transplant workflows are synthetic. It is not a live healthcare service, clinical clearance, hospital booking, or government-endorsed integration. Do not enter real personal or health information.”

## Synthetic-persona rules

Use fictional names, identifiers, contacts, health attributes, and event history. Never use a real person's likeness, contact, record, or inferred clinical status. Keep personas resettable, visibly synthetic, and isolated by environment. Citizen runtime authentication uses official eGov staging SSO; authentication invitations are superseded, while case and pair workflow invitations remain.

## Demo Runbook

### Support Owner
- **Accountable Owner:** eBuhay Synthetic Demo Governance Team (`demo-governance@ebuhay.synthetic.local`).
- **Escalation Path:** Demo Operations Lead (`ops-lead@ebuhay.synthetic.local`).

### Known Limitations
- **Coordination Only:** eBuhay is a coordination record, not a clinical authority. It never performs automated matching, ranking, compatibility scoring, or clinical clearance.
- **Contract Doubles:** Provider doubles for eGov services are automated tests only; official eGov staging SSO is the only runtime Citizen login in every environment. All hospital, blood bank, and transplant healthcare integrations operate as synthetic contract doubles.
- **Adult Self-Service:** Intake and session flows are bounded to adult self-service synthetic personas.
- **Live-Disabled Workflows:** Organ donation workflows (kidney, liver, heart, lung, pancreas) fail closed outside synthetic mode.

### No-Live-Use Boundary
This demonstration platform is strictly synthetic for healthcare workflows. No record, credential, fixture, contract double, workflow, UI, API, or evidence generated within this environment may be promoted, imported, or joined to an external, hospital, blood-service, partner-sandbox, or live production system. Official staging identity never grants Staff authority or live approval.

### Fixture Reset (Admin Only)
- **Mechanism:** Web console reset available exclusively to authenticated `hospital_admin` accounts via `POST /api/v1/operations/reset`.
- **Safeguards:** Enforces active session validation, same-origin check, CSRF double-submit token, explicit confirmation payload (`confirmation: 'RESET_SYNTHETIC_DATA'`), and immutable audit logging.
- **Boundary:** Fails closed if `EBUHAY_MODE !== 'synthetic'` or `SYNTHETIC_MODE !== 'true'`. There is no reset CLI.

### Rejection-Plus-Reconciliation Scenario Walkthrough
1. **Initiation:** Coordinator initiates a scheduling proposal or linkage verification for an active episode.
2. **Rejection Trigger:** Simulated hospital event delivery encounters an intentional conflict (e.g., slot already committed or sequence version mismatch).
3. **Dead-Letter / Conflict Evidence:** The failure is recorded immediately in `hospital_event_conflicts` with source ID, timestamp, sequence number, payload hash, and rejection error code. Status remains unconfirmed.
4. **Staff Investigation:** Coordinator or Supervisor accesses `/reconciliation` to inspect the conflicted event, retaining source evidence and payload provenance.
5. **Attributed Resolution:** Authorized staff records an attributable manual update referencing hospital evidence, resolving the conflict while immutably preserving the reconciliation history.

## End-to-end demo journey

1. Open the public showcase and read the disclosure (confirming all records, hospital, blood, and transplant workflows are synthetic).
2. Enter the Private Synthetic Demo using official eGov staging SSO (Citizen runtime login in all environments; authentication invitations are superseded; provider doubles are tests only).
3. Select a seeded synthetic Citizen persona and show donor/recipient intake across living (kidney, liver) and deceased (kidney, liver, heart, lung, pancreas) pathways.
4. Show the eBuhay Simulated Hospital Coordinator queue; describe Demo candidates as coordination-only and explicitly unranked, never compatibility or ranking.
5. Demonstrate a bounded proposal, assigned review, anonymous synthetic conversation, and schedule request.
6. Show that booking requires hospital evidence; demonstrate a failed/pending integration state, rejection event, and reconciliation attribution.
7. As an administrator (`hospital_admin`), reset the dataset from the console and verify the disclosure, audit log, and history boundary remain intact. There is no reset CLI.

## Seed, reset, rollback

Seed only approved project-owned synthetic personas. Reset is admin-only through the console; it removes rehearsal projections and restores the known fixture baseline without copying between environments. There is no reset CLI. Rollback means disabling the profile or adapter and preserving audit/evidence; it never promotes synthetic data or silently deletes history.

## Release gates

### Synthetic preview gate

The synthetic preview may proceed without developer credentials or partner approvals. It requires isolated project-owned synthetic data, visible disclosure, reproducible seed/reset, the affected client/server checks, and an explicit record of the unresolved PostgreSQL HTTP acceptance blocker. It must remain clearly synthetic and live-disabled.

### Synthetic Demo Ready gate

Ticket 27 requires the current landing disclosure, the existing walkthrough, admin-only console reset, measured checks, rejection/reconciliation evidence, and proof that real identities/data, live integrations, clinical decisions, and production deployment remain prohibited.

## eGov submission package

Provide the running build URL, source revision, mode/access instructions, disclosure text, synthetic adapter contract, test/build evidence, fixture provenance, failure receipts, reset demonstration, safety boundary, accountable owners, and explicit open blockers.

See [canonical PRD](../tasks/prd-hospital-integrated-donation-platform.md), [eGov matrix](EGOV_INTEGRATIONS.md), and [Neon/Drizzle note](NEON_DRIZZLE.md).
