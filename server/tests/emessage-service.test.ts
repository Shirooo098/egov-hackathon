import assert from 'node:assert/strict';
import test from 'node:test';
import { redactErrorMessage, sendSMS } from '../src/services/eMessageService.js';

const withProviderConfig = async (run: () => Promise<void>) => {
  const previousUrl = process.env.EMESSAGE_BASE_URL;
  const previousToken = process.env.EMESSAGE_API_TOKEN;
  process.env.EMESSAGE_BASE_URL = 'https://emessage.test';
  process.env.EMESSAGE_API_TOKEN = 'test-token';
  try {
    await run();
  } finally {
    if (previousUrl === undefined) delete process.env.EMESSAGE_BASE_URL;
    else process.env.EMESSAGE_BASE_URL = previousUrl;
    if (previousToken === undefined) delete process.env.EMESSAGE_API_TOKEN;
    else process.env.EMESSAGE_API_TOKEN = previousToken;
  }
};

test('accepts the documented 201 response without claiming delivery', async () => {
  await withProviderConfig(async () => {
    const result = await sendSMS('+639171234567', 'Test SMS', {
      fetchImpl: async (input, init) => {
        assert.equal(input, 'https://emessage.test/messaging/v1/sms/push');
        assert.equal(init?.method, 'POST');
        assert.equal((init?.headers as Record<string, string>)['X-EMESSAGE-Auth'], 'test-token');
        assert.deepEqual(JSON.parse(String(init?.body)), { number: '+639171234567', message: 'Test SMS' });
        return new Response(JSON.stringify({ data: { message: 'SMS was successfully created.' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
        });
      },
    });

    assert.deepEqual(result, {
      success: true,
      accepted: true,
      status: 'accepted',
    });
  });
});

test('accepts a valid 201 response without relying on undocumented fields', async () => {
  await withProviderConfig(async () => {
    const result = await sendSMS('+639171234567', 'Test SMS', {
      fetchImpl: async () => new Response('', {
        status: 201,
      }),
    });

    assert.deepEqual(result, {
      success: true,
      accepted: true,
      status: 'accepted',
    });
  });
});

test('treats undocumented 200 and 204 responses as unconfirmed unavailable without definitive failure', async () => {
  await withProviderConfig(async () => {
    for (const status of [200, 204]) {
      const result = await sendSMS('+639171234567', 'Test SMS', {
        fetchImpl: async () => new Response(status === 204 ? null : JSON.stringify({ data: { message: 'SMS was successfully created.' } }), {
          status,
          headers: status === 204 ? {} : { 'content-type': 'application/json' },
        }),
      });

      assert.deepEqual(result, {
        success: false,
        error: 'delivery_unconfirmed',
        status: 'unavailable',
      });
    }
  });
});

test('does not treat non-201 non-2xx responses as accepted and reports upstream_error', async () => {
  await withProviderConfig(async () => {
    const result = await sendSMS('+639171234567', 'Test SMS', {
      fetchImpl: async () => new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    });

    assert.deepEqual(result, {
      success: false,
      error: 'upstream_error',
      status: 'failed',
    });
  });
});

test('bounds a stalled provider call', async () => {
  await withProviderConfig(async () => {
    const result = await sendSMS('+639171234567', 'Test SMS', {
      timeoutMs: 5,
      fetchImpl: async (_input, init) => new Promise<Response>((_resolve, reject) => {
        const keepAlive = setTimeout(() => reject(new Error('provider timeout was not enforced')), 1_000);
        const abort = () => {
          clearTimeout(keepAlive);
          reject(new DOMException('Timed out', 'TimeoutError'));
        };
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener('abort', abort, { once: true });
      }),
    });

    assert.deepEqual(result, {
      success: false,
      error: 'provider_timeout',
      status: 'unavailable',
    });
  });
});

test('redacts short lowercase and hyphenated secret-like provider exception', async () => {
  const secretError = 'secret-token-xyz-123';
  assert.equal(redactErrorMessage(secretError), 'delivery_failed');
  assert.equal(redactErrorMessage(new Error(secretError)), 'delivery_failed');

  await withProviderConfig(async () => {
    const result = await sendSMS('+639171234567', 'Test SMS', {
      fetchImpl: async () => {
        throw new Error(secretError);
      },
    });

    assert.deepEqual(result, {
      success: false,
      error: 'delivery_failed',
      status: 'unavailable',
    });
    assert.equal(result.error.includes(secretError), false);
    assert.equal(JSON.stringify(result).includes(secretError), false);
  });
});
