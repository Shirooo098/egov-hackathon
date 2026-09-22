# eBuhay agent guidance

## Source of truth

Authority is ordered: [canonical PRD](tasks/prd-hospital-integrated-donation-platform.md) > [official eGov staging integration specification](.scratch/official-egov-integrations/spec.md) for branded integrations > [active synthetic hospital demo specification](.scratch/synthetic-hospital-demo/spec.md) for healthcare workflows. `PRODUCT.md`, `CONTEXT.md`, `README.md`, and `DESIGN.md` are active summaries. `DEMO_GUIDE.md`, older PRDs/specs, and the earlier [synthetic specification](.scratch/hospital-integrated-donation-platform/spec.md) are historical provenance; when they conflict, the higher authority wins.

Tickets 01–24 are the existing synthetic foundation (tickets 04 and 05 are superseded for runtime Citizen login by official eGov staging SSO; case and pair workflow invitations remain). The implementation frontier is the synthetic-only replacement roadmap: ticket 25 Synthetic Hospital Foundation, ticket 26 Blood and Multi-Organ Simulation, and ticket 27 Synthetic Demo Ready. These tickets do not authorize partner sandbox, controlled-live, or production deployment; do not infer legal approval or launch authorization from documentation.

Official eGov staging SSO is the only runtime Citizen login in every environment; authentication invitations are superseded, while case and pair workflow invitations remain. Provider doubles are automated test fixtures only, never runtime modes or selectable login fallbacks. Healthcare records and hospital/blood/transplant/appointment/coordination workflows remain synthetic and live-disabled across intake, events, appointments, offers, UI, and APIs. Official eGov staging identity never grants Staff authority or production/live approval; Hospital Staff access remains separate (named accounts with password plus MFA). No live hospital, blood-service, clinical, or production integrations, credentials, or records are authorized.

Living- and deceased-donor kidney workflows stay synthetic-only and live-disabled across intake, events, appointments, offers, UI, and APIs. Synthetic bounded behavior must remain visibly synthetic.

## Repository shape

- Page-level screens live in `client/src/pages/`.
- Reusable feature modules live in `client/src/features/`.
- New shared UI lives in `client/src/components/ui/`; older `client/src/shared/ui/` files may remain during the user-owned migration and must be preserved.
- Express backend code lives in `server/src/`; persistence and authorization belong on the server as implementation advances.

Preserve unrelated dirty-worktree edits. Scope edits and tests to the requested files. Do not stage tests, commit, or push unless explicitly requested. Use the package-local scripts and test commands documented in each package; keep demo/browser validation separate from unit checks.

## Product boundaries

Citizens may hold separate donor and recipient cases under one account; adult self-service is the initial boundary. Coordinators handle operational work. A clinical lead assigns Doctors; Doctors own clinical review in the hospital system. Hospital systems own authoritative clinical outcomes, appointment availability, and confirmed bookings. eBuhay stores coordination status, approved summaries, references, source/author/time, and reconciliation history.

The current repository is a browser/demo app with server-backed synthetic workflows, not a live service. Never misrepresent simulated records as real or manual updates as automatically synchronized; an attributed manual update may record a simulated hospital-confirmed booking. There is no automatic matching/ranking or Citizen clinical clearance. Citizen messaging is with the assigned coordination team, with only the explicitly bounded synthetic anonymous pair-conversation exception. The roadmap does not authorize live use.

## Collaboration

Delegate substantial, separable work to the cheapest suitable specialized agent with explicit file ownership. Keep ownership non-overlapping, preserve concurrent edits, and report verification honestly. Use `rtk` for repository inspection where available.
