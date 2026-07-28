# Issue #017: Add updateMatchFromProfile to MatchContext with Validation Guards

> **Labels:** `ready-for-agent`, `tracer-bullet`
> **Status:** Open
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/17
> **Parent:** [Issue #012: Profile Field Changes Propagate Into the Live Match](./012-profile-to-match-propagation-spec.md)

## What to build

Add a new `updateMatchFromProfile(role, profileFields)` action to `MatchContext`. It receives `role` (`'donor'` or `'recipient'`) and a partial profile object, applies the correct field mapping, runs validation guards, and writes the merged Match to localStorage (propagating cross-tab via the existing storage event listener from #015).

**Donor field mapping:**
- `bloodType` → `match.donor.blood_type`
- `organs` (array) → `match.donor.organ_pledged` (full array); `match.organ` is set to the organ in the array that case-insensitively matches `match.recipient.organ_needed`

**Recipient field mapping:**
- `bloodTypeNeeded` → `match.recipient.blood_type_needed`
- `organNeeded` → `match.recipient.organ_needed` and `match.organ`
- `urgencyLevel` → `match.urgencyLevel` and `match.recipient.urgency`

**Fields that do NOT map to the Match:** `isBlood`, `requestType` (`matchType` is immutable post-pairing), `avail` (guarded separately).

**Validation guards (run before any write):**
1. Organ removal guard (Donor): if `organs` contains no organ matching `match.recipient.organ_needed` (case-insensitive), return an error and abort the write.
2. Availability guard (Donor): if `avail` is `false` and `match.status` is not `rejected` or `ready_for_transplant`, return an error and abort the write.

`compatibilityScore` is never recalculated — raw fields only.

## Acceptance criteria

- [ ] `updateMatchFromProfile('donor', { bloodType: 'B+' })` updates `match.donor.blood_type` to `'B+'` and writes to localStorage
- [ ] `updateMatchFromProfile('recipient', { urgencyLevel: 'critical' })` updates both `match.urgencyLevel` and `match.recipient.urgency`
- [ ] `updateMatchFromProfile('donor', { organs: ['cornea'] })` when Recipient needs `'Kidney'` returns a validation error and leaves the Match unchanged
- [ ] `updateMatchFromProfile('donor', { avail: false })` when `match.status` is `'approved'` returns a validation error and leaves the Match unchanged
- [ ] `match.matchType` is never modified by any profile save
- [ ] `match.compatibilityScore` is never modified by any profile save
- [ ] `updateMatchFromProfile` is exported from `useMatch()` and available to all consuming components

## Blocked by

- [#015 — Live cross-tab Match sync via storage event](./015-cross-tab-match-sync.md)
