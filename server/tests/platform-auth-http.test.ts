import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const runtimeDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabaseDirectUrl = process.env.TEST_DATABASE_DIRECT_URL;

if (!testDatabaseUrl || !testDatabaseDirectUrl) {
  throw new Error('TEST_DATABASE_URL and TEST_DATABASE_DIRECT_URL are required for HTTP integration tests');
}
if (testDatabaseUrl === runtimeDatabaseUrl || testDatabaseDirectUrl === runtimeDatabaseUrl) {
  throw new Error('Test database URLs must not equal runtime DATABASE_URL');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.DATABASE_DIRECT_URL = testDatabaseDirectUrl;
process.env.NODE_ENV = 'test';
process.env.SYNTHETIC_MODE = 'true';
process.env.EBUHAY_MODE = 'synthetic';
process.env.SYNTHETIC_BOOTSTRAP_SECRET ||= `test-bootstrap-${crypto.randomBytes(12).toString('hex')}`;
process.env.COOKIE_SECURE = 'false';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
delete process.env.TEST_DATABASE_URL;
const bootstrapSecret = process.env.SYNTHETIC_BOOTSTRAP_SECRET ?? '';

import { createApp } from '../src/app.js';
const app = createApp();
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
const db = new Pool({ connectionString: testDatabaseUrl, max: 2, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });

const originHeaders = { origin: 'http://localhost:3000', 'content-type': 'application/json' };
const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
const contact = `http-${unique}@example.test`;
let server: Server;
let baseUrl = '';
let accountId = '';
let firstCookie = '';
let secondCookie = '';
let staffAccountId = '';

function jsonRequest(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...originHeaders, ...(options.headers || {}) }
  });
}

interface TestRecord {
  [key: string]: unknown;
  id: string; token: string; role: string; displayName: string; serviceScope: string[]; hospitalId: string | null;
  episodeId: string; requestType: string; declaredBloodGroup: string; bloodDonor: boolean; pledgedOrgans: string[];
  data: TestRecord; account: TestRecord; length: number;
}
async function readJson(response: Response): Promise<TestRecord> {
  const body = await response.json();
  return body;
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(async () => {
  if (accountId) {
    await db.query("DELETE FROM episodes WHERE case_id IN (SELECT id FROM citizen_cases WHERE account_id = $1)", [accountId]);
    await db.query("DELETE FROM citizen_cases WHERE account_id = $1", [accountId]);
    await db.query("DELETE FROM sessions WHERE account_id = $1", [accountId]);
    await db.query("DELETE FROM accounts WHERE id = $1", [accountId]);
  }
  if (staffAccountId) {
    await db.query("DELETE FROM sessions WHERE account_id = $1", [staffAccountId]);
    await db.query("DELETE FROM accounts WHERE id = $1", [staffAccountId]);
  }
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await db.end();
});

test('covers removed auth invitation endpoints, direct session fixture, and dual-role citizen intake over HTTP', async () => {
  // Removed admission-requests endpoint returns 404
  const request = await jsonRequest('/api/auth/admission-requests', {
    method: 'POST', body: JSON.stringify({ contact })
  });
  assert.equal(request.status, 404);

  // Removed invitations endpoint returns 404 even with bootstrap secret
  const invitationResponse = await jsonRequest('/api/auth/invitations', {
    method: 'POST',
    headers: { 'x-bootstrap-secret': bootstrapSecret },
    body: JSON.stringify({ purpose: 'admission', role: 'citizen', intendedContact: contact, serviceScope: ['blood'] })
  });
  assert.equal(invitationResponse.status, 404);

  // Removed redeem endpoints return 404
  const redeem = await jsonRequest('/api/auth/redeem', {
    method: 'POST', body: JSON.stringify({ token: 'obsolete-token' })
  });
  assert.equal(redeem.status, 404);

  const repeatedRedeem = await jsonRequest('/api/auth/redeem', {
    method: 'POST', body: JSON.stringify({ token: 'obsolete-token' })
  });
  assert.equal(repeatedRedeem.status, 404);

  // Set up direct isolated test fixture account and session in the test database
  const accountResult = await db.query(
    `INSERT INTO accounts (login_identity, display_name, role, service_scope, status)
     VALUES ($1, $2, 'citizen', $3, 'active') RETURNING id`,
    [`citizen:${unique}`, `Test Citizen ${unique}`, ['blood']]
  );
  accountId = accountResult.rows[0].id;

  const firstToken = crypto.randomBytes(32).toString('base64url');
  const firstHash = crypto.createHash('sha256').update(firstToken).digest();
  await db.query(
    `INSERT INTO sessions (account_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '8 hours')`,
    [accountId, firstHash]
  );
  firstCookie = `ebuhay_session=${encodeURIComponent(firstToken)}`;

  // Retain current session assertions
  const session = await jsonRequest('/api/auth/session', { headers: { cookie: firstCookie } });
  assert.equal(session.status, 200);
  assert.equal((await readJson(session)).account.id, accountId);

  // Retain citizen case creation and dual-role intake assertions
  const service = await db.query("SELECT id FROM services WHERE code='blood' ORDER BY id LIMIT 1");
  assert.equal(service.rowCount, 1);
  const caseResponse = await jsonRequest('/api/cases', {
    method: 'POST', headers: { cookie: firstCookie },
    body: JSON.stringify({ serviceId: service.rows[0].id, role: 'recipient', participationIntent: 'blood' })
  });
  assert.equal(caseResponse.status, 201);
  const caseData = (await readJson(caseResponse)).data;
  assert.equal(caseData.role, 'recipient');

  const intakePayload = { requestType: 'blood', declaredBloodGroup: 'O+', requestedOrgan: null, urgency: 'urgent', state: 'draft' };
  const intakeResponse = await jsonRequest(`/api/episodes/${caseData.episodeId}/intake`, {
    method: 'PUT', headers: { cookie: firstCookie }, body: JSON.stringify(intakePayload)
  });
  assert.equal(intakeResponse.status, 200);
  assert.equal((await readJson(intakeResponse)).data.requestType, 'blood');
  const intakeRead = await jsonRequest(`/api/episodes/${caseData.episodeId}/intake`, { headers: { cookie: firstCookie } });
  assert.equal(intakeRead.status, 200);
  assert.equal((await readJson(intakeRead)).data.declaredBloodGroup, 'O+');

  const invalidIntake = await jsonRequest(`/api/episodes/${caseData.episodeId}/intake`, {
    method: 'PUT', headers: { cookie: firstCookie }, body: JSON.stringify({ ...intakePayload, conditions: 'must not persist' })
  });
  assert.equal(invalidIntake.status, 422);

  const donorCaseResponse = await jsonRequest('/api/cases', {
    method: 'POST', headers: { cookie: firstCookie },
    body: JSON.stringify({ serviceId: service.rows[0].id, role: 'donor', participationIntent: 'blood' })
  });
  assert.equal(donorCaseResponse.status, 201);
  const donorCase = (await readJson(donorCaseResponse)).data;
  assert.equal(donorCase.role, 'donor');

  const donorIntakeResponse = await jsonRequest(`/api/episodes/${donorCase.episodeId}/intake`, {
    method: 'PUT', headers: { cookie: firstCookie },
    body: JSON.stringify({ declaredBloodGroup: 'A+', pledgedOrgans: [], bloodDonor: true, availability: 'available', state: 'active' })
  });
  assert.equal(donorIntakeResponse.status, 200);
  const donorIntake = (await readJson(donorIntakeResponse)).data;
  assert.equal(donorIntake.bloodDonor, true);
  assert.deepEqual(donorIntake.pledgedOrgans, []);

  // Obsolete login invitation endpoints return 404
  const loginInviteResponse = await jsonRequest('/api/auth/invitations', {
    method: 'POST',
    headers: { 'x-bootstrap-secret': bootstrapSecret },
    body: JSON.stringify({ purpose: 'login', intendedAccountId: accountId })
  });
  assert.equal(loginInviteResponse.status, 404);

  const loginRedeem = await jsonRequest('/api/auth/invitations/redeem', {
    method: 'POST', body: JSON.stringify({ token: 'obsolete-token' })
  });
  assert.equal(loginRedeem.status, 404);

  // Set up second session directly in test database
  const secondToken = crypto.randomBytes(32).toString('base64url');
  const secondHash = crypto.createHash('sha256').update(secondToken).digest();
  await db.query(
    `INSERT INTO sessions (account_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '8 hours')`,
    [accountId, secondHash]
  );
  secondCookie = `ebuhay_session=${encodeURIComponent(secondToken)}`;
  assert.equal(secondCookie === firstCookie, false);

  // Retain session verification, logout, and revocation assertions
  const restored = await jsonRequest('/api/auth/current', { headers: { cookie: secondCookie } });
  assert.equal(restored.status, 200);
  assert.equal((await readJson(restored)).account.id, accountId);
  const firstSessionStillValid = await jsonRequest('/api/auth/current', { headers: { cookie: firstCookie } });
  assert.equal(firstSessionStillValid.status, 200);

  const logout = await jsonRequest('/api/auth/logout', { method: 'POST', headers: { cookie: secondCookie } });
  assert.equal(logout.status, 204);
  const revoked = await jsonRequest('/api/auth/current', { headers: { cookie: secondCookie } });
  assert.equal(revoked.status, 401);
  const originalSessionRestored = await jsonRequest('/api/auth/current', { headers: { cookie: firstCookie } });
  assert.equal(originalSessionRestored.status, 200);
});

test('handles named hospital staff session with role and scope, then revokes its session; invitation endpoints return 404', async () => {
  const staffContact = `scheduler-${unique}@hospital.example.test`;
  const hospital = await db.query("SELECT id FROM hospitals WHERE synthetic = true ORDER BY id LIMIT 1");
  assert.equal(hospital.rowCount, 1);
  const hospitalId = hospital.rows[0].id;

  // Invitation creation endpoint is removed and returns 404
  const invitationResponse = await jsonRequest('/api/auth/invitations', {
    method: 'POST',
    headers: { 'x-bootstrap-secret': bootstrapSecret },
    body: JSON.stringify({ purpose: 'admission', role: 'scheduler', intendedContact: staffContact, serviceScope: ['blood'], hospitalId })
  });
  assert.equal(invitationResponse.status, 404);

  // Invitation redemption endpoint is removed and returns 404
  const redeem = await jsonRequest('/api/auth/invitations/redeem', {
    method: 'POST', body: JSON.stringify({ token: 'obsolete' })
  });
  assert.equal(redeem.status, 404);

  // Set up staff account and session directly in DB
  const staffResult = await db.query(
    `INSERT INTO accounts (login_identity, display_name, role, service_scope, hospital_id, status)
     VALUES ($1, $2, 'scheduler', $3, $4, 'active') RETURNING id`,
    [`staff:${unique}`, staffContact, ['blood'], hospitalId]
  );
  staffAccountId = staffResult.rows[0].id;
  const staffToken = crypto.randomBytes(32).toString('base64url');
  const staffHash = crypto.createHash('sha256').update(staffToken).digest();
  await db.query(
    `INSERT INTO sessions (account_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '8 hours')`,
    [staffAccountId, staffHash]
  );
  const cookie = `ebuhay_session=${encodeURIComponent(staffToken)}`;

  // Verify staff session access
  const session = await jsonRequest('/api/auth/session', { headers: { cookie } });
  assert.equal(session.status, 200);
  const restored = (await readJson(session)).account;
  assert.equal(restored.id, staffAccountId);
  assert.equal(restored.displayName, staffContact);
  assert.equal(restored.role, 'scheduler');
  assert.deepEqual(restored.serviceScope, ['blood']);
  assert.equal(restored.hospitalId, hospitalId);

  // Verify logout revokes session
  const logout = await jsonRequest('/api/auth/logout', { method: 'POST', headers: { cookie } });
  assert.equal(logout.status, 204);
  const revoked = await jsonRequest('/api/auth/session', { headers: { cookie } });
  assert.equal(revoked.status, 401);

  // Removed invitation endpoints return 404
  const citizenWithHospital = await jsonRequest('/api/auth/invitations', {
    method: 'POST', headers: { 'x-bootstrap-secret': bootstrapSecret },
    body: JSON.stringify({ purpose: 'admission', role: 'citizen', intendedContact: `citizen-${unique}@example.test`, serviceScope: ['blood'], hospitalId })
  });
  assert.equal(citizenWithHospital.status, 404);
  const staffWithoutHospital = await jsonRequest('/api/auth/invitations', {
    method: 'POST', headers: { 'x-bootstrap-secret': bootstrapSecret },
    body: JSON.stringify({ purpose: 'admission', role: 'scheduler', intendedContact: `missing-${unique}@example.test`, serviceScope: ['blood'] })
  });
  assert.equal(staffWithoutHospital.status, 404);
});
