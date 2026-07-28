# Issue #011: Persist Match State to localStorage with Live Cross-Tab Sync

> **Labels:** `ready-for-agent`, `spec`
> **Status:** Open
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/11

## Problem Statement

When a Citizen (Donor or Recipient) refreshes their browser tab, the entire Match lifecycle is reset back to `pending_hospital_approval`, losing all progress made during the demo. Additionally, because each role (Hospital, Donor, Recipient) is demoed in a separate browser tab, state changes made by one role are invisible to the other two unless the page is manually reloaded — and even then, the tabs have independent in-memory state so the states are different.

This breaks the core demo flow: the presenter cannot show Hospital approving a Match in Tab 1 and immediately show Donor's tab reacting live in Tab 2.

## Solution

Persist the live Match state and the Hospital's static match queue to `localStorage`, and synchronize changes across all open tabs in real-time using the browser's native `storage` event. When `resetMatch` is triggered, both localStorage keys are cleared and all tabs simultaneously revert to the initial `pending_hospital_approval` state.

## Tickets

- [#013 — Fix INITIAL_DEMO_MATCH.createdAt to a fixed constant](./013-fix-createdAt-constant.md)
- [#014 — Persist Match to localStorage for refresh survival](./014-persist-match-localstorage.md)
- [#015 — Live cross-tab Match sync via storage event](./015-cross-tab-match-sync.md)
- [#016 — Persist Hospital static match queue via usePersistedStaticMatches hook](./016-persist-static-matches-hook.md)
