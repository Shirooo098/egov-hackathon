# Issue #016: Persist Hospital Static Match Queue via usePersistedStaticMatches Hook

> **Labels:** `ready-for-agent`, `tracer-bullet`
> **Status:** Completed
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/16
> **Parent:** [Issue #011: Persist Match State to localStorage with Live Cross-Tab Sync](./011-persist-match-localstorage-spec.md)

## What to build

Extract the Hospital dashboard's static match queue state into a custom hook `usePersistedStaticMatches`. The hook reads the static matches from `localStorage` on init (key: `ebuhay_static_matches`), falling back to `STATIC_MATCHES` if absent or unparseable. Every approve/reject mutation writes the updated array back to `localStorage`. A `storage` event listener on the same key updates the hook's state live when another tab mutates the queue. When `resetMatch` fires (which clears `ebuhay_static_matches`), the hook resets to `STATIC_MATCHES`.

Demoable: Hospital approves a static match → refreshes the page → the approved status is still shown in the triage table.

## Acceptance criteria

- [x] Hospital approve/reject decisions on the static match queue survive a browser refresh
- [x] Static match queue changes sync live to any other open Hospital tab
- [x] `resetMatch` clears `ebuhay_static_matches` and all tabs revert the static queue to its initial state
- [x] The hook falls back to `STATIC_MATCHES` cleanly if the localStorage key is absent or unparseable
- [x] The live Match (from `MatchContext`) continues to appear correctly alongside the static queue in the triage table

## Blocked by

- [#014 — Persist Match to localStorage for refresh survival](./014-persist-match-localstorage.md)
