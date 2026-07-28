# Issue #018: Wire Donor and Recipient Profile Save Buttons to updateMatchFromProfile

> **Labels:** `ready-for-agent`, `tracer-bullet`
> **Status:** Open
> **GitHub:** https://github.com/Shirooo098/egov-hackathon/issues/18
> **Parent:** [Issue #012: Profile Field Changes Propagate Into the Live Match](./012-profile-to-match-propagation-spec.md)

## What to build

Connect the save buttons in the Donor Profile tab and Recipient Profile tab to the `updateMatchFromProfile` action from `MatchContext`. When a Citizen clicks save, the current profile field values are passed to `updateMatchFromProfile` with the appropriate role. If validation returns an error, a toast warning is shown and the profile fields remain at their pre-save values on screen. If validation passes, the Match updates and propagates cross-tab.

**Donor save** passes: `{ bloodType, organs, avail }`
**Recipient save** passes: `{ bloodTypeNeeded, organNeeded, urgencyLevel }`

Neither passes `isBlood` or `requestType` — those do not map to the current Match.

Demoable: Donor changes blood type from `O-` to `B+` and clicks Save → Hospital triage table in the other tab immediately shows `B+` in the donor blood type column.

## Acceptance criteria

- [ ] Donor clicks Save Profile → `match.donor.blood_type` updates and the Hospital triage table reflects the change live in another tab
- [ ] Recipient clicks Synchronize Medical Preferences → `match.recipient.blood_type_needed`, `match.recipient.organ_needed`, `match.urgencyLevel`, and `match.organ` update and propagate cross-tab
- [ ] If Donor removes all organs matching the Recipient's need, clicking Save shows a toast warning and leaves the Match and profile fields unchanged
- [ ] If Donor toggles availability off while a Match is in-flight, a toast warning appears and the toggle reverts
- [ ] `isBlood` and `requestType` changes have no effect on `match.matchType`
- [ ] A successful save shows a success toast confirming the profile was synchronized

## Blocked by

- [#017 — Add updateMatchFromProfile to MatchContext with validation guards](./017-update-match-from-profile.md)
