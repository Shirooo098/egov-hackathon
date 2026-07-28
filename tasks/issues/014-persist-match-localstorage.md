# Issue #014: Persist Match to localStorage for Refresh Survival

> **Labels:** `ready-for-agent`, `tracer-bullet`
> **Status:** Open
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/14
> **Parent:** [Issue #011: Persist Match State to localStorage with Live Cross-Tab Sync](./011-persist-match-localstorage-spec.md)

## What to build

`MatchContext` should read the live Match from `localStorage` on mount (key: `ebuhay_match`) and fall back to `INITIAL_DEMO_MATCH` if the key is absent or unparseable. Every action that mutates the Match (`advanceStatus`, `proposeSchedule`, `setScheduledDate`, `signAgreement`, `anchorToBlockchain`, `resetMatch`) must also write the updated Match to `localStorage` immediately after updating React state. `resetMatch` must additionally remove the key so the next mount falls back to `INITIAL_DEMO_MATCH`.

Demoable: Hospital approves the Match in Tab 1 → Donor refreshes Tab 2 → Donor still sees `approved` status, not `pending_hospital_approval`.

## Acceptance criteria

- [ ] Refreshing any dashboard tab restores the Match to its last known lifecycle stage
- [ ] `resetMatch` clears `ebuhay_match` from localStorage and all tabs that subsequently refresh start from `pending_hospital_approval`
- [ ] If `localStorage` contains an unparseable value for `ebuhay_match`, the context silently falls back to `INITIAL_DEMO_MATCH` without throwing
- [ ] No eMessage toast is re-fired on page load when restoring from localStorage
- [ ] All existing Match mutation actions (approve, reject, schedule, sign, anchor) continue to work correctly

## Blocked by

- [#013 — Fix INITIAL_DEMO_MATCH.createdAt to a fixed constant](./013-fix-createdAt-constant.md)
