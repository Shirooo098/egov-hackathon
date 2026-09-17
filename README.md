# eBuhay

eBuhay is a project-owned synthetic prototype and public showcase for blood-donation and hospital-coordinated donation journeys. It is not a partner-hospital deployment, clinical system, live healthcare service, or production deployment.

## Approved/planned release profile

- **Public Showcase** — planned public presentation.
- **Private Synthetic Demo** — planned invitation-only walkthrough.
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

Local configuration uses server/.env.example: EBUHAY_MODE=synthetic, PORT=5000, provider doubles, and isolated DATABASE_URL/TEST_DATABASE_URL values. Keep secrets out of source control. eGov and hospital adapters are disabled or contract doubles only; never use real credentials or production identifiers.
