# Issue #015: Live Cross-Tab Match Sync via Storage Event

> **Labels:** `ready-for-agent`, `tracer-bullet`
> **Status:** Open
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/15
> **Parent:** [Issue #011: Persist Match State to localStorage with Live Cross-Tab Sync](./011-persist-match-localstorage-spec.md)

## What to build

Register a `window.addEventListener('storage', ...)` listener inside `MatchContext` on mount (cleaned up on unmount). When another tab writes to `ebuhay_match`, this event fires in the current tab with the new serialized value. The listener parses the value and calls `setMatch` to update React state, causing all consuming components to re-render live. When `resetMatch` fires in another tab (which removes the key), the listener receives `newValue: null` and resets to `INITIAL_DEMO_MATCH`.

The `storage` event does not fire in the tab that wrote — that tab already updated its own React state through the normal mutation path, so no special handling is needed.

Demoable: Hospital approves in Tab 1 → Donor's Tab 2 updates instantly without any refresh.

## Acceptance criteria

- [ ] A Match status change in one tab is reflected live in all other open tabs within one render cycle
- [ ] `resetMatch` in one tab causes all other open tabs to snap back to `pending_hospital_approval` live
- [ ] eMessage toasts do NOT re-fire in tabs that receive a `storage` event update — only the originating tab shows toasts
- [ ] The event listener is properly cleaned up when `MatchContext` unmounts
- [ ] Simulating a `storage` event with `newValue: null` resets the Match to `INITIAL_DEMO_MATCH` without throwing

## Blocked by

- [#014 — Persist Match to localStorage for refresh survival](./014-persist-match-localstorage.md)
