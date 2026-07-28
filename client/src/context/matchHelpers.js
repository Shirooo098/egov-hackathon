export const INITIAL_DEMO_MATCH = {
  id: 'demo-match-pgh-001',
  matchType: 'organ',
  organ: 'Kidney',
  compatibilityScore: 98,
  urgencyLevel: 'urgent',
  status: 'pending_hospital_approval', // starting state
  hospital: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Philippine General Hospital (PGH)',
    facility: 'National Kidney Institute & PGH Organ Transplant Center',
    location: 'Manila, Metro Manila',
    email: 'triage@pgh.gov.ph',
    verified: true,
  },
  donor: {
    id: '22222222-2222-2222-2222-222222222222',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    blood_type: 'O-',
    organ_pledged: 'Kidney',
    location_city: 'Quezon City',
    location_province: 'Metro Manila',
    age: 32,
    everify_status: 'verified',
    everify_tier: 'Tier I',
    philsys_pcn: 'PH-9823-1122-3344',
  },
  recipient: {
    id: '33333333-3333-3333-3333-333333333333',
    first_name: 'Ana',
    last_name: 'Reyes',
    blood_type_needed: 'A+',
    organ_needed: 'Kidney',
    location_city: 'Makati City',
    location_province: 'Metro Manila',
    urgency: 'urgent',
    description: 'Urgent kidney transplant required following stage IV chronic renal disease.',
    everify_status: 'verified',
    everify_tier: 'Tier I',
    philsys_pcn: 'PH-8844-5566-7788',
  },
  proposedSchedule: null, // { date, time, location, proposedBy }
  scheduledDate: null,
  scheduledTime: null,
  scheduledLocation: null,
  donorSigned: false,
  recipientSigned: false,
  blockchainAnchor: null,
  createdAt: '2026-07-01T00:00:00.000Z',
};

export const MATCH_STORAGE_KEY = 'ebuhay_match';

export function getInitialMatch(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return INITIAL_DEMO_MATCH;
  try {
    const raw = storage.getItem(MATCH_STORAGE_KEY);
    if (!raw) return INITIAL_DEMO_MATCH;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return INITIAL_DEMO_MATCH;
    return parsed;
  } catch {
    return INITIAL_DEMO_MATCH;
  }
}

export function saveMatchToStorage(match, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage || !match) return;
  try {
    storage.setItem(MATCH_STORAGE_KEY, JSON.stringify(match));
  } catch (err) {
    console.error('Failed to save match to localStorage:', err);
  }
}

export function clearMatchFromStorage(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return;
  try {
    storage.removeItem(MATCH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear match from localStorage:', err);
  }
}

export function parseStorageEventValue(newValue) {
  if (!newValue) return INITIAL_DEMO_MATCH;
  try {
    const parsed = JSON.parse(newValue);
    if (!parsed || typeof parsed !== 'object') return INITIAL_DEMO_MATCH;
    return parsed;
  } catch {
    return INITIAL_DEMO_MATCH;
  }
}

export const STATIC_MATCHES_STORAGE_KEY = 'ebuhay_static_matches';

export function getInitialStaticMatches(fallback, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(STATIC_MATCHES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveStaticMatchesToStorage(matches, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage || !matches) return;
  try {
    storage.setItem(STATIC_MATCHES_STORAGE_KEY, JSON.stringify(matches));
  } catch (err) {
    console.error('Failed to save static matches to localStorage:', err);
  }
}

export function clearStaticMatchesFromStorage(storage = typeof window !== 'undefined' ? window.localStorage : null, dispatchEvent = true) {
  if (!storage) return;
  try {
    storage.removeItem(STATIC_MATCHES_STORAGE_KEY);
    if (dispatchEvent && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ebuhay_reset_static_matches'));
    }
  } catch (err) {
    console.error('Failed to clear static matches from localStorage:', err);
  }
}

export function parseStaticMatchesStorageEvent(newValue, fallback) {
  if (!newValue) return fallback;
  try {
    const parsed = JSON.parse(newValue);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function calculateUpdatedMatchFromProfile(match, role, profileFields) {
  if (!match || !role || !profileFields) {
    return { success: false, error: 'Invalid parameters provided for match update.' };
  }
  const updatedMatch = JSON.parse(JSON.stringify(match));

  if (role === 'donor') {
    const { bloodType, organs, avail } = profileFields;

    // Guard 1: Organ removal guard
    if (organs !== undefined) {
      const recipientOrgan = updatedMatch.recipient?.organ_needed || '';
      const hasMatching = Array.isArray(organs) && organs.some(o => o.toLowerCase() === recipientOrgan.toLowerCase());
      if (!hasMatching) {
        return { success: false, error: 'Validation Error: Organ pledged does not match recipient anatomical need.' };
      }
    }

    // Guard 2: Availability guard
    if (avail === false && !['rejected', 'ready_for_transplant'].includes(updatedMatch.status)) {
      return {
        success: false,
        error: 'Cannot set availability to offline while clinical evaluation or procedure coordination is in-flight.'
      };
    }

    // Apply updates
    if (bloodType !== undefined) {
      updatedMatch.donor.blood_type = bloodType;
    }
    if (organs !== undefined) {
      updatedMatch.donor.organ_pledged = organs;
      const matched = organs.find(o => o.toLowerCase() === (updatedMatch.recipient?.organ_needed || '').toLowerCase());
      if (matched) {
        updatedMatch.organ = updatedMatch.recipient.organ_needed || matched;
      }
    }
    return { success: true, updatedMatch };
  } else if (role === 'recipient') {
    const { bloodTypeNeeded, organNeeded, urgencyLevel } = profileFields;
    if (bloodTypeNeeded !== undefined) {
      updatedMatch.recipient.blood_type_needed = bloodTypeNeeded;
    }
    if (organNeeded !== undefined) {
      updatedMatch.recipient.organ_needed = organNeeded;
      updatedMatch.organ = organNeeded;
    }
    if (urgencyLevel !== undefined) {
      updatedMatch.recipient.urgency = urgencyLevel;
      updatedMatch.urgencyLevel = urgencyLevel;
    }
    return { success: true, updatedMatch };
  }

  return { success: false, error: 'Unknown role specified.' };
}
