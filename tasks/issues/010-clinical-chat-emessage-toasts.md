# Issue #010: Direct Clinical Chat & Reactive `eMessage` Push SMS Toast Alerts

> **Labels:** `ready-for-agent`, `ticket`, `tracer-bullet`  
> **Status:** Completed  
> **Parent:** [Issue #003: eBuhay Clinical Workflow & Platform Redesign](./003-ebuhay-workflow-redesign-spec.md)

## What to build

Unlock unmasked, real-name peer chat messaging between Donor and Recipient once their clinical Donation Agreement is officially signed and submitted, fostering direct pre-admission coordination without legacy anonymous masking. Throughout the user journey, supplement silent backend eMessage SMS service triggers by rendering animated high-visibility mobile push notification toast banners directly in the browser viewport whenever critical workflow milestones occur (e.g., Hospital approval granted, procedure schedule proposed/accepted, and agreement completion). This turns background government infrastructure integrations into visually demonstrable feature highlights during live evaluation presentations.

## Acceptance criteria

- [x] Reaching agreement submission unlocks a *Chat* tab across both Donor and Recipient portals, removing all legacy anonymous name masking so parties converse using verified identities.
- [x] A dedicated Toast Notification component simulating a mobile phone SMS push alert is incorporated into the client application UI layout.
- [x] When `MatchContext` advances status to `approved`, an animated toast banner appears displaying: *"📱 DICT eMessage SMS Sent to Recipient: PGH has formally approved your Kidney transplant match..."*.
- [x] When schedule proposals or schedule confirmations occur, corresponding realistic eMessage SMS alert toasts render in the viewport.
- [x] Sending a direct chat message between verified peers similarly demonstrates SMS alert dispatch without blocking conversational interaction.

## Blocked by

- [Issue #009: Government-Styled Donation Agreement & Silent Blockchain Anchoring](./009-donation-agreement-silent-blockchain.md)
