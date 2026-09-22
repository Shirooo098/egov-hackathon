# 05 — Returning synthetic Citizen sessions

**What to build:** Restore returning Citizens by invitation identity and manage session expiry and revocation safely.

**Blocked by:** 04 — Synthetic invitation login

**Status:** superseded — Runtime Citizen authentication by invitation identity is superseded by official eGov staging SSO in all environments (see ADR 0013, canonical PRD, and .scratch/official-egov-integrations/spec.md). Returning Citizens are recognized exclusively by stable official `uniqid`, not invitation identity; session lifecycle and revocation apply to official SSO sessions. Authentication invitations are superseded; case and pair workflow invitations remain.

- [ ] (Superseded) Returning invitation identities are found without contact- or name-based account merging (superseded for runtime identity by official eGov staging SSO `uniqid` account linking).
- [ ] (Superseded) Verification history, 30-minute inactivity expiry, 8-hour absolute expiry, session listing, and remote revocation work authoritatively (session lifecycle applies to official SSO sessions; authentication invitations superseded).
- [ ] (Superseded) Existing synthetic sessions survive an identity-service outage while new synthetic logins fail closed (superseded; official staging SSO fails closed on provider outage).
