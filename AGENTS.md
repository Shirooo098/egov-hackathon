# eBuhay project guidance

## Specifications

Read the relevant sections for the affected behavior, not every document.

Authority, highest first:
1. `tasks/prd-hospital-integrated-donation-platform.md`
2. `.scratch/official-egov-integrations/spec.md` for branded integrations
3. `.scratch/synthetic-hospital-demo/spec.md` for healthcare workflows

`PRODUCT.md`, `CONTEXT.md`, `README.md`, and `DESIGN.md` are summaries.
`DEMO_GUIDE.md`, older specifications, and
`.scratch/hospital-integrated-donation-platform/spec.md` are historical.
Resolve conflicts using the authority order above.

For ticket work, confirm the active ticket and its dependencies against the
applicable specification and roadmap. Record the current milestone and progress
in `CONTINUITY.md`; do not infer completion from ticket numbering.

## Runtime and data boundaries

- This is a server-backed synthetic demo, not a live healthcare service.
- All healthcare records and hospital, blood, transplant, appointment, and
  coordination workflows remain synthetic and live-disabled across intake,
  events, offers, UI, and APIs. This includes living- and deceased-donor kidneys.
- Make simulated behavior visibly synthetic. Attribute manual updates; never
  present them as automatic synchronization. Manual updates may record a
  simulated hospital-confirmed booking.
- No live hospital, blood-service, clinical, or production integrations,
  credentials, or records are authorized.
- Roadmap tickets and staging identity do not authorize partner sandbox,
  controlled-live, production deployment, or legal approval.

## Authentication and authorization

- Official eGov staging SSO is the only runtime Citizen login in every environment.
- Authentication invitations from foundation tickets 04 and 05 are superseded;
  case and pair workflow invitations remain.
- Provider doubles are automated test fixtures only, never runtime login modes
  or selectable fallbacks.
- Hospital Staff use separate named accounts with password and MFA.
  Citizen staging identity never grants Staff authority.
- Enforce persistence and authorization on the server.

## Product ownership

- One Citizen account may hold separate donor and recipient cases.
  Initial self-service is adult-only.
- Coordinators handle operations. Clinical leads assign Doctors.
  Doctors own clinical review in the hospital system.
- Hospital systems own authoritative clinical outcomes, appointment
  availability, and confirmed bookings.
- eBuhay stores coordination status, approved summaries, references,
  source/author/time, and reconciliation history.
- No automatic matching/ranking or Citizen clinical clearance.
- Citizen messaging is with the assigned coordination team, except for the
  explicitly specified synthetic anonymous pair-conversation workflow.

## Code placement

- Screens: `client/src/pages/`
- Feature modules: `client/src/features/`
- New shared UI: `client/src/components/ui/`
- Preserve existing `client/src/shared/ui/` during the user-owned migration.
- Express backend: `server/src/`

## Execution and validation

- Follow the global execution, modularity, and continuity policy.
- Scope changes and checks to the affected behavior, including relevant callers.
- Use affected-package scripts and documented test commands.
- Keep browser/demo validation separate from unit checks.
- Preserve unrelated worktree changes.
- Do not stage tests, commit, or push unless explicitly requested.
- Use `rtk` for supported repository inspection commands where available.