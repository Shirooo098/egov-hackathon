---
status: accepted
date: 2026-09-23
---

# Separate optional Face Liveness from eVerify

The original official-integration scope deferred Face Liveness together with eVerify. For the synthetic showcase, Face Liveness may instead be an optional Citizen-initiated check after SSO, using the official staging service without claiming identity verification, authenticating a Citizen, gating case activity, or influencing clinical decisions. Each session requires explicit opt-in; eBuhay retains or displays no selfie or reference image and keeps only minimal outcome audit metadata.

This supersedes ADR 0013's blanket Face Liveness deferral as a scope decision, while eVerify stays deferred. Face Liveness runtime remains disabled until the authenticated provider contract, callback/session binding, provider retention terms, and safety checks are resolved.
