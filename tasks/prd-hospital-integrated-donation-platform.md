# eBuhay Hospital-Integrated Donation Platform PRD

**Status:** Approved synthetic-hospital demo direction. This document describes a project-owned synthetic prototype and does **not** claim production readiness, regulatory approval, clinical approval, or a live hospital integration.

**Current implementation truth:** Authority is ordered: canonical PRD > [official eGov staging integration specification](../.scratch/official-egov-integrations/spec.md) for branded integrations > [active synthetic hospital demo specification](../.scratch/synthetic-hospital-demo/spec.md) for healthcare workflows. Official eGov staging SSO is the only runtime Citizen login in every environment, while all healthcare workflow data remains synthetic and live-disabled. Provider doubles are automated test fixtures only. The repository contains a browser/demo surface and server-backed synthetic workflows; no synthetic result or focused test is evidence of production readiness.

The earlier synthetic implementation specification is historical provenance. It does not authorize live use.

## Synthetic roadmap checkpoint

This checkpoint measures synthetic-demo progress, not launch readiness.

| Tickets | Current classification | Evidence and remaining gate |
|---|---|---|
| 01–24 | Existing synthetic foundation | Existing client/server behavior remains synthetic and must retain visible labels, attribution, resetability, and server boundaries where implemented. |
| 25 | Synthetic Hospital Foundation | Establish the console foundation; separate Citizen official eGov staging SSO and Staff named-password/MFA roles with environment-scoped secrets (authentication invitations superseded; case/pair workflow invitations remain; provider doubles are tests only); blood/transplant services; and shared signer plus CLI cleanup. |
| 26 | Blood and Multi-Organ Simulation | Exercise exact living kidney/liver and deceased kidney/liver/heart/lung/pancreas journeys with representative deterministic fixtures and signed events, without matching, allocation, or clearance. |
| 27 | Synthetic Demo Ready | Verify admin-only console reset, measured checks, rejection/reconciliation behavior, current landing disclosure, and the existing showcase walkthrough; no reset CLI. |

The next engineering checkpoint is Synthetic Hospital Foundation, followed by Blood and Multi-Organ Simulation and Synthetic Demo Ready. These tickets do not authorize controlled-live or production deployment; runtime Citizen login is official eGov staging SSO only in every environment, and healthcare workflows remain synthetic-only.

## Product direction

eBuhay coordinates synthetic blood and living- and deceased-donor organ workflows. It records synthetic operational status, approved summaries, references, source, author, time, and reconciliation history. It does not make clinical or allocation decisions. The demonstration uses one simulated hospital and synthetic data; real use is outside this roadmap and would require a new separately approved specification.

One adult may hold separate donor and recipient cases and multiple service episodes. Coordinators own operational follow-up. Citizens see only their own or explicitly shared coordination milestones. Hospital systems and authorized clinicians remain authoritative for clinical records, eligibility, outcomes, availability, and confirmed bookings.

## Identity, admission, and staff boundaries

Official eGov staging SSO is the only runtime Citizen login in every environment, superseding the prior local synthetic invitation-login boundary. Provider doubles are automated test fixtures only, never runtime modes or selectable login fallbacks. Healthcare records (donor, recipient, hospital, clinical, appointment, and coordination) remain synthetic and live-disabled. Seeded personas, simulated staff, and the hospital contract double are demo mechanisms only; they do not establish Staff authority, a hospital relationship, or a clinical decision. Authentication invitations are superseded, while case and pair workflow invitations remain.

### Official eGov staging SSO Citizen login in all environments (2026-09-21)

Official eGov staging SSO is the sole runtime Citizen authentication across all environments when provider-issued credentials exist. The flow is `exchange_code` → server-side provider token/profile handling → HttpOnly eBuhay session; partner secrets and tokens remain server-only. Upstream timeouts, exchange failures, or missing credentials fail closed with clear unavailable error reporting and retry guidance, without synthetic-success fallback. Provider staging/test identities and synthetic eBuhay business records are the only permitted data. Hospital Staff authentication remains separate (named accounts with password plus MFA), and eGov Citizen identity never grants Staff authority or production/live approval. This does not authorize production/live deployment, real clinical or hospital records, or inferred government endorsement.

## Immutable authority boundaries

| Authority | Owns | eBuhay may do |
|---|---|---|
| Hospital and authorized clinicians | Identity verification as accepted by the hospital; clinical eligibility, testing, compatibility, review, consent, outcomes, and clinical sign-off | Store attributable references, approved summaries, coordination status, and next action |
| Hospital scheduling system/staff | Appointment availability and confirmed, changed, or cancelled bookings | Request, display, and reconcile scheduling facts |
| Authorized external deceased-donor process | Allocation, offers, urgency decisions, and response channels | Track source references, deadlines, acknowledgements, responses, and outcomes |
| Licensed blood/organ facilities and practitioners | Collection, testing, transplant/removal, safety, consent, and statutory governance | Coordinate participation and record attributed hospital updates |
| eBuhay coordination team | Intake, case ownership, follow-up, pairing workflow, exception routing, and safe communication | Maintain projections and audit history |

There is no automated matching, ranking, compatibility calculation, clinical clearance, citizen clinical approval, organ allocation, or blood-safety authority. A deterministic, unranked queue used in the synthetic build is coordination-only and must never be presented as a recommendation. Manual updates are explicitly attributed and may record a hospital-confirmed fact; they are not automatic synchronization.

## Scope and workflows

- **Blood:** coordinators draft requests; an authorized blood-service approver publishes them. Donors request or choose supported hospital appointments. The hospital confirms, declines, or reports a closing outcome. Public requests contain no patient-identifying information.
- **Living donor:** each person has an independent hospital case and evaluation. Pair proposals require the defined invitations, participant responses, and coordinator verification. A pair is not a compatibility or eligibility decision.
- **Deceased donor:** an authorized hospital team handles external allocation and urgent channels. eBuhay is a secondary coordination record and is never the sole urgent-response dependency.
- **Communication:** citizens communicate with the assigned synthetic coordination team. The only exception is the explicitly bounded synthetic anonymous pair conversation, which exposes no names, contacts, clinical findings, or withdrawal reasons. Notifications remain generic synthetic projections.
- **Pause/withdrawal/history:** pause blocks new progression pending review; withdrawal stops new invitations without silently cancelling bookings or deleting history. New episodes preserve prior outcomes.

## Synthetic-only roadmap

Progression is evidence-based; a ticket may not be treated as live approval. Exit evidence must be attributable to an accountable owner and retained with the demo record.

### Ticket 25 — Synthetic Hospital Foundation

**Entry:** synthetic-only environment, approved build contract, seeded/reset data, visible simulation disclosures, named test owner, and no real personal or hospital records.

**Exit:** the console foundation is usable with existing Staff roles `hospital_admin`, `coordinator`, `clinical_lead`, `doctor`, `scheduler`, `supervisor`, and `blood_approver`, each scoped to blood/transplant workflows. Citizen official eGov staging SSO (authentication invitations superseded; case/pair workflow invitations remain; provider doubles are tests only) and Staff named-password/MFA roles remain separate; environment-scoped secrets protect synthetic credentials; blood and transplant services are represented; signing lives in shared server code; the `hospital:sign` command and CLI file are removed; and `seed:synthetic` remains the fixture-bootstrap path. Demo credentials are environment-supplied seed inputs, never committed to the repository. This exit authorizes no live data.

### Ticket 26 — Blood and Multi-Organ Simulation

**Entry:** Ticket 25 foundation evidence, approved synthetic personas, visible service labels, and no real identities, records, or provider credentials.

**Scope:** living kidney and liver; deceased kidney, liver, heart, lung, and pancreas. Use representative deterministic fixtures and signed hospital-contract-double events.

**Exit:** bounded synthetic journeys, failed/pending states, source attribution, rejection/reconciliation behavior, and explicit absence of matching, allocation, and clinical clearance are demonstrated. No production identifiers or unapproved clinical decisions are introduced.

### Ticket 27 — Synthetic Demo Ready

**Entry:** Tickets 25–26 evidence, reproducible admin-only console reset, disclosure copy, walkthrough instructions, and affected client/server checks.

**Exit:** measured checks pass; rejection and reconciliation behavior is evidenced; the current landing disclosure and existing [showcase walkthrough](../docs/SHOWCASE_RELEASE.md) are accurate; reset is admin-only through the console with no reset CLI; and the demo is free of claims about real identities, clinical decisions, live integrations, or production deployment.

## Explicitly prohibited by this roadmap

This roadmap does not authorize production/live eGov or hospital/blood-service integrations, real clinical or hospital records, clinical diagnosis/eligibility/compatibility/clearance/allocation decisions, production deployment, or claims of partner/government endorsement. Official eGov staging SSO is the sole runtime Citizen login in all environments (provider doubles are tests only); synthetic healthcare records cannot be promoted, imported, or joined to live data. Kidney workflows and other multi-organ workflows remain synthetic-only.

Any future live product would require a new, separately approved specification and evidence; it is not an extension of this roadmap.

### Approved eGovChain staging exception (2026-09-18)

The user-approved exception permits actual eGovChain STAGING transactions for synthetic donor/recipient cases only. Proofs are zero-fee, hash-only transactions on chain ID 13371, submitted with a server-side RPC token and signer; synthetic identities, cases, and hospital records remain the only business data. PostgreSQL remains authoritative for versioned, per-purpose case and pairing consent, with asynchronous proof retries and an explicit pending state; no successful receipt may be fabricated. This does not authorize production, legal or clinical consent, live-hospital integration, live eGov identity authorization, or launch. Runtime signed-write and receipt verification remain pending. [ADR 0012](../docs/adr/0012-record-egovchain-staging-and-case-consent-boundaries.md) records the accepted boundaries; the [draft eGovChain consent specification](spec-egovchain-consent-staging.md) is for review before further implementation.

## Safety and data boundary

Use fictional, resettable personas and isolated synthetic storage. Never enter or import real clinical or hospital records, production identifiers, or unapproved personal/health data. Provider credentials for official eGov staging APIs must remain server-only; provider doubles are automated test fixtures only, never runtime modes or selectable login fallbacks. Hospital, blood-service, and other healthcare integrations remain disabled or represented by synthetic contract doubles. eMessage remains disabled until a bounded authenticated notification workflow exists. The product must not make clinical, eligibility, compatibility, clearance, allocation, treatment, transplant, or urgent-response decisions. Synthetic records must never be promoted, joined, or migrated into a live environment. Production deployment is out of scope.

## Synthetic build boundary and acceptance

Runtime Citizen login requires official eGov staging SSO across all environments (authentication invitations are superseded; provider doubles are tests only). Healthcare workflows remain synthetic-only, including separate donor/recipient episodes, case and pair workflow invitations and pair-response privacy, coordinator ownership and reviewer assignment, simulated Doctor review projections, hospital scheduling proposals and booking responses, approved blood requests, deceased-donor offer tracking, pause/withdrawal/history, generic in-app notifications, source attribution, idempotency/reconciliation behavior, and visible simulator disclosures. This behavior cannot authorize live use.

Synthetic acceptance must show that no UI/API labels simulated outcomes as live, clinical clearance, delivered notification, official partner activity, compatibility, or eligibility; hospital references, source, author, and time are preserved; and role boundaries are server-enforced when persistence is implemented. The synthetic spec’s proposed test manifests and commands are verification guidance, not evidence that unimplemented tests have run.

Do not infer implementation, legal approval, clinical approval, partner approval, or launch authorization from this PRD alone.
