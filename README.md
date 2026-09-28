# eBuhay

eBuhay is a project-owned synthetic prototype and public showcase for blood-donation and hospital-coordinated donation journeys. It is not a partner-hospital deployment, clinical system, live healthcare service, or production deployment.

## Approved/planned release profile

- **Public Showcase** — planned public presentation.
- **Private Synthetic Demo** — planned walkthrough using official eGov staging SSO and isolated synthetic data.
- **Synthetic Pilot Rehearsal** — planned isolated rehearsal of server-authorized flows.

These are synthetic release profiles, not deployed healthcare services. Current data is project-owned synthetic data. Never enter real identities or health records. No partner hospital, live integration, clinical decision, automatic matching, production approval, or government endorsement is claimed. Kidney and other multi-organ workflows remain synthetic-only.

## Project structure

- client/ — React + Vite frontend; pages, features, shared UI, and services
- server/ — Express/TypeScript API, routes, services, database, and workers

## Prerequisites and local start

Use Node.js 20.19+ or 22.13+ with npm 9+; Node.js 22.13+ is recommended for the installed Vite toolchain.

From a fresh checkout, create server/.env from server/.env.example using your platform's file-copy facility. Configure an isolated synthetic PostgreSQL/Neon URL (the placeholders in the example are not usable), and keep it separate from every other environment. Run the migration before starting the server:

    cd server
    npm install
    npm run migrate
    npm start

In another terminal:

    cd client
    npm install
    npm run dev

## Configuration

Local and deployed configuration uses server/.env.example: official eGov staging SSO is the only runtime Citizen login in every environment, while all healthcare workflow data remains synthetic and live-disabled. Provider doubles are automated tests only, never runtime modes or selectable login fallbacks. Staff authentication remains separate (named accounts with password plus MFA). Official staging identity never grants Staff authority. Production or controlled-live eGov use is not authorized. Authentication invitations are superseded, but case and pair workflow invitations remain. Keep secrets out of source control. Hospital and clinical adapters remain synthetic contract doubles only; never use real credentials or production identifiers.
