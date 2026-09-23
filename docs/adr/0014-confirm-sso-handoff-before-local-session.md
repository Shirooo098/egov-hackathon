---
status: accepted
date: 2026-09-23
---

# Confirm SSO handoff before a local session

The eGovPH guide supports an in-app code handoff and an official web widget, but documents no state or signed-launch correlation for an unsolicited in-app callback. eBuhay supports both official entry paths without its own OTP/PIN flow; an in-app handoff may create an eBuhay session only after the Citizen explicitly confirms the verified identity, and it must never silently switch an existing session. A Citizen may revoke the local eBuhay session without signing out of eGovPH.

This favors protection against login-session substitution over the guide's automatic-login and no-local-logout wording. The team must clarify that discrepancy with eGovPH before claiming partner-checklist approval.
