# Issue #009: Government-Styled Donation Agreement & Silent Blockchain Anchoring

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Completed  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Once an appointment schedule is finalized, unlock an official government-styled HTML clinical Donation Agreement within both citizen portals. This clinical document must automatically render pre-filled with verified citizen demographic names, anatomical kidney criteria, scheduled dates, and the assigned Philippine General Hospital facility. Citizens review the form, digitally attach encrypted e-signatures using embedded signature canvas tools, and click a plain "Submit Agreement" button—completely concealed from technical web3 terminology, gas, or blockchain transaction hashes. In the background, the application silently calculates the SHA-256 agreement hash and anchors it onto the DICT Hyperledger Besu blockchain, exposing the immutable cryptographic verification proof exclusively inside the Hospital Dashboard's Match Review tab.

## Acceptance criteria

- [x] Reaching `scheduled` status unlocks an *Agreement* tab across both Donor and Recipient citizen portals.
- [x] The Agreement tab renders a formal government-styled HTML document formatted like an official Philippine medical consent form, populated with dynamic match attributes and signature upload controls.
- [x] Replacing former web3 jargon, the action button is labeled simply "Submit Agreement" and returns a user-friendly checkmark confirmation upon dual signing, advancing status to `contract_signed` / `ready_for_transplant`.
- [x] No raw blockchain transaction hashes, block numbers, chain IDs, or explorer URLs are ever displayed to citizens on the `/` portal route.
- [x] Upon agreement submission, a background service silently records the cryptographic anchor to Besu (`Chain ID 13371`).
- [x] Visiting `/hospital-dashboard` and viewing the finalized match card on the *Match Review* tab displays explicit verification of dual signatures alongside the immutable Besu transaction hash, block number, and audit explorer links.

## Blocked by

- [Issue #008: Interactive Schedule Handshake & Rejection Fallback](./008-interactive-schedule-handshake-rejection.md)
