import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DEMO_MATCH,
  MATCH_STORAGE_KEY,
  getInitialMatch,
  saveMatchToStorage,
  clearMatchFromStorage,
  parseStorageEventValue,
} from '../src/context/matchHelpers.js';

describe('Ticket #013 - Fixed INITIAL_DEMO_MATCH.createdAt', () => {
  test('INITIAL_DEMO_MATCH.createdAt is a fixed sentinel string constant', () => {
    assert.equal(typeof INITIAL_DEMO_MATCH, 'object');
    assert.equal(INITIAL_DEMO_MATCH.id, 'demo-match-pgh-001');
    assert.equal(INITIAL_DEMO_MATCH.createdAt, '2026-07-01T00:00:00.000Z');
  });

  test('producing INITIAL_DEMO_MATCH in multiple instances yields bit-identical objects', () => {
    const copy1 = JSON.parse(JSON.stringify(INITIAL_DEMO_MATCH));
    const copy2 = JSON.parse(JSON.stringify(INITIAL_DEMO_MATCH));
    assert.deepEqual(copy1, copy2);
  });
});

describe('Ticket #014 & #015 - localStorage persistence & storage event parsing', () => {
  class MockStorage {
    constructor() { this.store = {}; }
    getItem(k) { return this.store[k] ?? null; }
    setItem(k, v) { this.store[k] = String(v); }
    removeItem(k) { delete this.store[k]; }
  }

  test('getInitialMatch returns INITIAL_DEMO_MATCH if storage key absent or unparseable', () => {
    const storage = new MockStorage();
    assert.deepEqual(getInitialMatch(storage), INITIAL_DEMO_MATCH);

    storage.setItem(MATCH_STORAGE_KEY, '{ invalid json: [ }');
    assert.deepEqual(getInitialMatch(storage), INITIAL_DEMO_MATCH);
  });

  test('getInitialMatch restores match from localStorage when valid', () => {
    const storage = new MockStorage();
    const testMatch = { ...INITIAL_DEMO_MATCH, status: 'approved' };
    storage.setItem(MATCH_STORAGE_KEY, JSON.stringify(testMatch));
    assert.deepEqual(getInitialMatch(storage), testMatch);
  });

  test('saveMatchToStorage and clearMatchFromStorage manage localStorage correctly', () => {
    const storage = new MockStorage();
    const testMatch = { ...INITIAL_DEMO_MATCH, status: 'scheduled' };
    saveMatchToStorage(testMatch, storage);
    assert.equal(storage.getItem(MATCH_STORAGE_KEY), JSON.stringify(testMatch));

    clearMatchFromStorage(storage);
    assert.equal(storage.getItem(MATCH_STORAGE_KEY), null);
  });

  test('parseStorageEventValue parses string or falls back to INITIAL_DEMO_MATCH on null/invalid', () => {
    assert.deepEqual(parseStorageEventValue(null), INITIAL_DEMO_MATCH);
    assert.deepEqual(parseStorageEventValue('{bad'), INITIAL_DEMO_MATCH);

    const testMatch = { ...INITIAL_DEMO_MATCH, status: 'ready_for_transplant' };
    assert.deepEqual(parseStorageEventValue(JSON.stringify(testMatch)), testMatch);
  });
});

describe('Ticket #016 - Static match queue localStorage helpers', () => {
  class MockStorage {
    constructor() { this.store = {}; }
    getItem(k) { return this.store[k] ?? null; }
    setItem(k, v) { this.store[k] = String(v); }
    removeItem(k) { delete this.store[k]; }
  }
  const mockStatic = [{ id: 'test-001', status: 'pending_hospital_approval' }];

  test('getInitialStaticMatches returns fallback if absent or unparseable', async () => {
    const { getInitialStaticMatches, STATIC_MATCHES_STORAGE_KEY } = await import('../src/context/matchHelpers.js');
    const storage = new MockStorage();
    assert.deepEqual(getInitialStaticMatches(mockStatic, storage), mockStatic);

    storage.setItem(STATIC_MATCHES_STORAGE_KEY, 'not an array JSON [}');
    assert.deepEqual(getInitialStaticMatches(mockStatic, storage), mockStatic);
  });

  test('getInitialStaticMatches returns parsed array when present and valid', async () => {
    const { getInitialStaticMatches, STATIC_MATCHES_STORAGE_KEY } = await import('../src/context/matchHelpers.js');
    const storage = new MockStorage();
    const updated = [{ id: 'test-001', status: 'approved' }];
    storage.setItem(STATIC_MATCHES_STORAGE_KEY, JSON.stringify(updated));
    assert.deepEqual(getInitialStaticMatches(mockStatic, storage), updated);
  });

  test('saveStaticMatchesToStorage and clearStaticMatchesFromStorage work correctly', async () => {
    const { saveStaticMatchesToStorage, clearStaticMatchesFromStorage, STATIC_MATCHES_STORAGE_KEY } = await import('../src/context/matchHelpers.js');
    const storage = new MockStorage();
    const updated = [{ id: 'test-001', status: 'rejected' }];
    saveStaticMatchesToStorage(updated, storage);
    assert.equal(storage.getItem(STATIC_MATCHES_STORAGE_KEY), JSON.stringify(updated));

    clearStaticMatchesFromStorage(storage, false); // false = do not dispatch window event in node test
    assert.equal(storage.getItem(STATIC_MATCHES_STORAGE_KEY), null);
  });

  test('parseStaticMatchesStorageEvent parses string or falls back on null/invalid', async () => {
    const { parseStaticMatchesStorageEvent } = await import('../src/context/matchHelpers.js');
    assert.deepEqual(parseStaticMatchesStorageEvent(null, mockStatic), mockStatic);
    assert.deepEqual(parseStaticMatchesStorageEvent('{bad', mockStatic), mockStatic);

    const updated = [{ id: 'test-001', status: 'approved' }];
    assert.deepEqual(parseStaticMatchesStorageEvent(JSON.stringify(updated), mockStatic), updated);
  });
});

describe('Ticket #017 & #018 - Profile to Match propagation and validation guards', () => {
  test('calculateUpdatedMatchFromProfile rejects donor update if matching organ removed', async () => {
    const { calculateUpdatedMatchFromProfile, INITIAL_DEMO_MATCH } = await import('../src/context/matchHelpers.js');
    const match = JSON.parse(JSON.stringify(INITIAL_DEMO_MATCH)); // recipient organ_needed: 'Kidney'
    const res = calculateUpdatedMatchFromProfile(match, 'donor', {
      bloodType: 'O+',
      organs: ['cornea', 'liver'], // No kidney!
      avail: true
    });
    assert.equal(res.success, false);
    assert.match(res.error, /does not match recipient anatomical need/i);
  });

  test('calculateUpdatedMatchFromProfile rejects donor avail off while in-flight', async () => {
    const { calculateUpdatedMatchFromProfile, INITIAL_DEMO_MATCH } = await import('../src/context/matchHelpers.js');
    const match = { ...INITIAL_DEMO_MATCH, status: 'pending_hospital_approval' };
    const res = calculateUpdatedMatchFromProfile(match, 'donor', {
      bloodType: 'O-',
      organs: ['Kidney', 'cornea'],
      avail: false
    });
    assert.equal(res.success, false);
    assert.match(res.error, /cannot set availability to offline while clinical evaluation/i);
  });

  test('calculateUpdatedMatchFromProfile allows donor update when guards pass', async () => {
    const { calculateUpdatedMatchFromProfile, INITIAL_DEMO_MATCH } = await import('../src/context/matchHelpers.js');
    const match = JSON.parse(JSON.stringify(INITIAL_DEMO_MATCH));
    const res = calculateUpdatedMatchFromProfile(match, 'donor', {
      bloodType: 'O+',
      organs: ['kidney', 'cornea'],
      avail: true
    });
    assert.equal(res.success, true);
    assert.equal(res.updatedMatch.donor.blood_type, 'O+');
    assert.deepEqual(res.updatedMatch.donor.organ_pledged, ['kidney', 'cornea']);
    assert.equal(res.updatedMatch.organ, 'kidney'); // matched organ from array
  });

  test('calculateUpdatedMatchFromProfile allows donor avail off when status rejected or ready_for_transplant', async () => {
    const { calculateUpdatedMatchFromProfile, INITIAL_DEMO_MATCH } = await import('../src/context/matchHelpers.js');
    const match = { ...INITIAL_DEMO_MATCH, status: 'rejected' };
    const res = calculateUpdatedMatchFromProfile(match, 'donor', {
      bloodType: 'O-',
      organs: ['Kidney'],
      avail: false
    });
    assert.equal(res.success, true);
  });

  test('calculateUpdatedMatchFromProfile correctly propagates recipient preference changes', async () => {
    const { calculateUpdatedMatchFromProfile, INITIAL_DEMO_MATCH } = await import('../src/context/matchHelpers.js');
    const match = JSON.parse(JSON.stringify(INITIAL_DEMO_MATCH));
    const res = calculateUpdatedMatchFromProfile(match, 'recipient', {
      bloodTypeNeeded: 'B+',
      organNeeded: 'Liver',
      urgencyLevel: 'critical'
    });
    assert.equal(res.success, true);
    assert.equal(res.updatedMatch.recipient.blood_type_needed, 'B+');
    assert.equal(res.updatedMatch.recipient.organ_needed, 'Liver');
    assert.equal(res.updatedMatch.organ, 'Liver');
    assert.equal(res.updatedMatch.recipient.urgency, 'critical');
    assert.equal(res.updatedMatch.urgencyLevel, 'critical');
  });
});
