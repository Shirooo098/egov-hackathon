# 04 — Synthetic invitation login

**What to build:** Let an invited Citizen complete server-owned synthetic invitation login and receive an authoritative session linked to the invitation identity.

**Blocked by:** 03 — Additive /api/v1 security boundary

**Status:** superseded — Runtime Citizen invitation login is superseded by official eGov staging SSO in all environments (see ADR 0013, canonical PRD, and .scratch/official-egov-integrations/spec.md). Provider doubles are automated test fixtures only, not runtime login endpoints. Authentication invitations are superseded; case and pair workflow invitations remain.

- [ ] (Superseded) Invitation tokens are processed server-side and cannot be replayed or used as client tokens (runtime Citizen invitation login superseded by official eGov staging SSO; provider doubles are test fixtures only; case/pair workflow invitations remain).
- [ ] (Superseded) An end-to-end invited first-login demonstration passes through the executable synthetic path (superseded for runtime login by official eGov staging SSO).
- [ ] (Superseded) Only a valid demo invitation creates a Citizen session (superseded for runtime login; official eGov staging SSO is the sole runtime Citizen authentication).
