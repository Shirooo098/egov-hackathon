# eBuhay

eBuhay is a project-owned synthetic prototype and public showcase for blood-donation and hospital-coordinated donation journeys. It is not a partner-hospital deployment, clinical system, or live healthcare service.

## Approved/planned release profile

- **Public Showcase** — planned public presentation.
- **Private Synthetic Demo** — planned invitation-only walkthrough.
- **Synthetic Pilot Rehearsal** — planned isolated rehearsal of server-authorized flows.

These are release profiles, not three currently deployed surfaces. Current local data is project-owned synthetic data. Only DICT-provided fixtures may be used for real staging calls. No partner hospital, real patient record, clinical clearance, automatic matching, production approval, or government endorsement is claimed. Kidney workflows remain live-disabled.

## Project structure

- client/ — React + Vite frontend; pages, features, shared UI, services, and tests
- server/ — Express/TypeScript API, routes, services, database, workers, and tests
- docs/ — showcase, integration, and persistence notes
- tasks/ — canonical PRD and issue planning
- .scratch/production-capable-mvp/ — active implementation specification

## Prerequisites and local start

Use Node.js 20.19+ or 22.13+ with npm 9+; Node.js 22.13+ is recommended because the installed Vite/jsdom toolchain requires a current Node runtime.

From a fresh checkout, create server/.env from server/.env.example using your platform's file-copy facility. Configure an isolated synthetic PostgreSQL/Neon URL (the placeholders in the example are not usable), and keep it separate from every other environment. Run the migration before starting the server:

    cd server
    npm install
    npm run migrate
    npm start

In another terminal:

    cd client
    npm install
    npm run dev

## Current checks

    cd client
    npm test
    npm run build
    npm run typecheck
    npm run lint

    cd server
    npm test
    npm run typecheck
    npm run lint

The recorded evidence is: 68 client tests passed and client build passed; 31 server contract tests passed; server typecheck and lint passed. PostgreSQL HTTP acceptance remains unresolved after a 503 response and missing appointment_request_history.

## Configuration and links

Local configuration uses server/.env.example: EBUHAY_MODE=synthetic, PORT=5000, provider doubles, and isolated DATABASE_URL/TEST_DATABASE_URL values. Keep secrets out of source control. Planned Vercel partner-sandbox use of an operator-pasted official eGovPH test exchange code, server-only credentials, isolated Neon branches, routes, environment variables, eGov/hospital adapters, and provider integrations must be labelled planned until access and contract evidence exist. See [EGOV_INTEGRATIONS.md](docs/EGOV_INTEGRATIONS.md) for the bounded plan.

See [SHOWCASE_RELEASE.md](docs/SHOWCASE_RELEASE.md), [EGOV_INTEGRATIONS.md](docs/EGOV_INTEGRATIONS.md), [NEON_DRIZZLE.md](docs/NEON_DRIZZLE.md), the [canonical PRD](tasks/prd-hospital-integrated-donation-platform.md), and the [active production specification](.scratch/production-capable-mvp/spec.md).

eGov portal qualification requires a running demo and actual staging traffic. Official references: [DICT eGov Hackathon 2026 criteria](https://platforms.e.gov.ph/egov-hackathon-2026-criteria) and [DICT eGov SSO API catalog](https://platforms.e.gov.ph/api-catalogs/egov-sso).
