# Issue #012: Profile Field Changes Propagate Into the Live Match

> **Labels:** `ready-for-agent`, `spec`
> **Status:** Completed
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/12

## Problem Statement

When a Donor updates their blood type or organ pledges in the Profile tab, or a Recipient updates their blood type need or organ need, those changes have no effect on the live Match that the Hospital triage table and other dashboards display. The Match object is initialized once from hardcoded demo data and never updated by either party's profile actions.

## Solution

When a Donor or Recipient clicks their profile save button, the changed fields are written into the live Match object in `MatchContext`. Because `MatchContext` is already being migrated to `localStorage` with cross-tab sync (Issue #11), the update will immediately propagate to all open tabs.

## Tickets

- [#017 — Add updateMatchFromProfile to MatchContext with validation guards](./017-update-match-from-profile.md)
- [#018 — Wire Donor and Recipient profile save buttons to updateMatchFromProfile](./018-wire-profile-saves.md)

## Blocked by

- [#011 — Persist Match State to localStorage with Live Cross-Tab Sync](./011-persist-match-localstorage-spec.md)
