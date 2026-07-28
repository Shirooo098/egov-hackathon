# Issue #004: Core Navigation Seam (`react-router-dom` & Conditional Navbar)

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Completed  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Establish client-side URL routing supporting exactly two authoritative boundaries: the Citizen Portal (`/`) and the institutional Hospital Dashboard (`/hospital-dashboard`). The Hospital Dashboard must be accessible directly via URL without requiring citizen Single Sign-On (SSO) authentication. The global navigation bar must conditionally adapt its presentation based on the active route context—displaying citizen eVerify status and role exit controls exclusively on citizen routes, while presenting institutional hospital branding and simple return links when viewing the hospital route. This ticket absorbs and supersedes exploratory Issue #001.

## Acceptance criteria

- [x] `react-router-dom` is installed and configured in the client application with two top-level routes: `/` and `/hospital-dashboard`.
- [x] Visiting `/hospital-dashboard` renders the institutional view directly without redirecting to citizen liveness onboarding or SSO login prompts.
- [x] On the `/` route, the navigation bar renders citizen attributes (eVerify PhilSys badge, portal role badge, user greeting, and "Exit Role" button).
- [x] On the `/hospital-dashboard` route, the navigation bar renders institutional branding ("🏥 Philippine General Hospital"), conceals citizen-specific eVerify badges and greetings, and replaces the "Exit Role" button with a "← Back to Citizen Portal" navigation link.
- [x] Automated or manual browser verification confirms seamless route transitions back and forth between citizen and hospital views without full page reloads.

## Blocked by

- None — can start immediately.
