# Issue #013: Fix INITIAL_DEMO_MATCH.createdAt to a Fixed Constant

> **Labels:** `ready-for-agent`, `tracer-bullet`
> **Status:** Open
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/13
> **Parent:** [Issue #011: Persist Match State to localStorage with Live Cross-Tab Sync](./011-persist-match-localstorage-spec.md)

## What to build

Replace the runtime `new Date().toISOString()` call in `INITIAL_DEMO_MATCH` with a hardcoded sentinel date string. This ensures all tabs produce a bit-identical initial Match object when `resetMatch` fires or when the module is first loaded in different tabs at different times. Without this fix, cross-tab resets produce slightly different objects due to different load timestamps, which causes spurious state diffs.

## Acceptance criteria

- [ ] `INITIAL_DEMO_MATCH.createdAt` is a fixed string constant, not a runtime `new Date()` call
- [ ] Calling `resetMatch` in any tab produces an object that deep-equals the `INITIAL_DEMO_MATCH` produced by every other tab
- [ ] No other behaviour is changed

## Blocked by

None — can start immediately.
