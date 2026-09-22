# Product

eBuhay is a project-owned synthetic prototype and public showcase for blood-donation and hospital-coordinated donation journeys. Public Showcase, Private Synthetic Demo, and Synthetic Pilot Rehearsal are synthetic release profiles, not deployed healthcare services. It does not use real identities/data or live integrations, and does not claim clinical authority, government endorsement, or production readiness.

## Showcase modes

1. **Public showcase** — openly viewable product story and synthetic examples.
2. **Private Synthetic Demo** — guided walkthrough with isolated synthetic data and official eGov staging SSO for Citizen runtime login.
3. **Synthetic Pilot Rehearsal** — isolated rehearsal of server-authorized workflow and failure paths; not a live pilot.

Authority is ordered: [canonical PRD](tasks/prd-hospital-integrated-donation-platform.md) > [official eGov staging integration specification](.scratch/official-egov-integrations/spec.md) for branded integrations > [synthetic hospital demo specification](.scratch/synthetic-hospital-demo/spec.md) for healthcare workflows. The active roadmap is `.scratch/synthetic-hospital-demo/`: Synthetic Hospital Foundation, Blood and Multi-Organ Simulation, and Synthetic Demo Ready. Official eGov staging SSO is the only runtime Citizen login in every environment (provider doubles are automated test fixtures only). Healthcare records and hospital/blood/transplant workflows remain synthetic and live-disabled; no partner sandbox, live integration, or production deployment is authorized.

## Truth boundary

Citizens, Coordinators, clinical staff, and hospital administrators have distinct responsibilities. Hospital systems own clinical records, outcomes, availability, and confirmed bookings. eBuhay records coordination state, approved summaries, references, and attribution. It never auto-matches, ranks, declares compatibility, or provides clinical clearance. Kidney workflows are synthetic-only and live-disabled.

All healthcare environments, routes, sessions, adapters, and hospital provider integrations are synthetic or disabled. Citizen runtime login uses official eGov staging SSO only in every environment; authentication invitations are superseded, while case and pair workflow invitations remain. Provider doubles are automated test fixtures only. Official staging identity never grants Staff authority or live/production approval; Staff authentication remains separate (named accounts with password plus MFA).

## Evidence on hand

Evidence is revision- and environment-specific. Tickets 24 and 27 require measured checks and retained artifacts for the exact revision/environment; read current status from those artifacts rather than from this summary. No claim of production readiness follows. External staging and evidence blockers are identified honestly.

Use the [canonical PRD](tasks/prd-hospital-integrated-donation-platform.md), [official eGov staging integration specification](.scratch/official-egov-integrations/spec.md), [showcase release note](docs/SHOWCASE_RELEASE.md), and [integration boundary](docs/adr/0013-official-egov-staging-api-boundaries.md) for the current contract.
