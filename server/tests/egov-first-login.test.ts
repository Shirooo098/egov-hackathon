import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createV1Router } from '../src/routes/v1.js';
import type { RuntimeConfig, RuntimeMode } from '../src/runtime/config.js';
import { createCsrfProtection, v1Cors } from '../src/middleware/v1-security.js';
import { currentSession } from '../src/auth/service.js';

const config = (mode: RuntimeMode): RuntimeConfig => ({
  mode,
  databaseUrl: 'postgresql://localhost/test',
  port: 1,
  shutdownTimeoutMs: 1000,
  allowedOrigins: ['https://client.test'],
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
});

const createTestServer = (mode: RuntimeMode) => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', v1Cors(config(mode)));
  app.use('/api/v1', createCsrfProtection());
  app.use('/api/v1', createV1Router(config(mode)));
  return app.listen(0);
};

const base = (server: ReturnType<typeof createTestServer>) =>
  `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const close = (server: ReturnType<typeof createTestServer>) =>
  new Promise<void>((resolve) => server.close(() => resolve()));

test('in synthetic mode, eGov exchange and callback fail closed with 503 egov_unavailable and exclude secrets/cookies', async () => {
  process.env.SYNTHETIC_BOOTSTRAP_SECRET = 'bootstrap-secret';
  const server = createTestServer('synthetic');
  try {
    const sentinel = 'SECRET-CODE-OR-TOKEN-12345';
    for (const endpoint of ['/api/v1/auth/egov/exchange', '/api/v1/auth/egov/callback']) {
      const response = await fetch(`${base(server)}${endpoint}`, {
        method: 'POST',
        headers: {
          origin: 'https://client.test',
          cookie: 'ebuhay_csrf=test-csrf',
          'x-csrf-token': 'test-csrf',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ exchange_code: sentinel, invitation_token: sentinel }),
      });
      assert.equal(response.status, 503, endpoint);
      const text = await response.text();
      assert.doesNotMatch(text, new RegExp(sentinel));
      assert.match(text, /egov_unavailable/);
      assert.equal(response.headers.get('set-cookie'), null);
    }

    // CSRF and same-origin protections remain active on disabled endpoints
    const noCsrf = await fetch(`${base(server)}/api/v1/auth/egov/exchange`, {
      method: 'POST',
      headers: { origin: 'https://client.test', 'content-type': 'application/json' },
      body: JSON.stringify({ exchange_code: sentinel }),
    });
    assert.equal(noCsrf.status, 403);

    const noOrigin = await fetch(`${base(server)}/api/v1/auth/egov/exchange`, {
      method: 'POST',
      headers: { cookie: 'ebuhay_csrf=csrf', 'x-csrf-token': 'csrf', 'content-type': 'application/json' },
      body: JSON.stringify({ exchange_code: sentinel }),
    });
    assert.equal(noOrigin.status, 403);
  } finally {
    await close(server);
  }
});

test('obsolete synthetic issuance and auth invitation endpoints return 404 even with bootstrap secret', async () => {
  process.env.SYNTHETIC_BOOTSTRAP_SECRET = 'bootstrap-secret';
  const server = createTestServer('synthetic');
  try {
    const obsoletePaths = [
      '/api/v1/auth/egov/synthetic/exchange-code',
      '/api/v1/auth/invitations',
      '/api/v1/auth/admission-requests',
      '/api/v1/auth/redeem',
      '/api/v1/auth/redeem-invitation',
      '/api/v1/auth/invitations/redeem',
    ];
    for (const path of obsoletePaths) {
      const response = await fetch(`${base(server)}${path}`, {
        method: 'POST',
        headers: {
          origin: 'https://client.test',
          cookie: 'ebuhay_csrf=csrf',
          'x-csrf-token': 'csrf',
          'x-bootstrap-secret': 'bootstrap-secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ purpose: 'admission', role: 'citizen', contact: 'citizen@example.test' }),
      });
      assert.equal(response.status, 404, path);
    }
  } finally {
    await close(server);
  }
});

test('all eGov exchange and removed invitation endpoints return 404 in partner-sandbox, controlled-live, and production', async () => {
  const modes: RuntimeMode[] = ['partner-sandbox', 'controlled-live', 'production'];
  for (const mode of modes) {
    const server = createTestServer(mode);
    try {
      const endpoints = [
        '/api/v1/auth/egov/exchange',
        '/api/v1/auth/egov/callback',
        '/api/v1/auth/egov/synthetic/exchange-code',
        '/api/v1/auth/invitations',
        '/api/v1/auth/admission-requests',
        '/api/v1/auth/redeem',
        '/api/v1/auth/redeem-invitation',
        '/api/v1/auth/invitations/redeem',
      ];
      for (const endpoint of endpoints) {
        const sentinel = 'SECRET-PAYLOAD';
        const response = await fetch(`${base(server)}${endpoint}`, {
          method: 'POST',
          headers: {
            origin: 'https://client.test',
            cookie: 'ebuhay_csrf=csrf',
            'x-csrf-token': 'csrf',
            'x-bootstrap-secret': 'bootstrap-secret',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ exchange_code: sentinel, invitation_token: sentinel }),
        });
        assert.equal(response.status, 404, `${mode} ${endpoint}`);
        assert.doesNotMatch(await response.text(), new RegExp(sentinel));
      }
    } finally {
      await close(server);
    }
  }
});

test('session token validation rejects malformed tokens before database access', async () => {
  assert.equal(await currentSession('raw.part.with.dots'), null);
  assert.equal(await currentSession(''), null);
  assert.equal(await currentSession('short'), null);
  assert.equal(await currentSession('invalid characters with spaces in between!!'), null);
});
