import assert from 'node:assert/strict';
import axios from 'axios';
import express from 'express';
import { createServer } from 'node:http';
import emessageRouter from '../src/routes/emessage.js';
import egovRouter from '../src/routes/egov.js';
import * as ai from '../src/services/eGovAIService.js';
import * as sms from '../src/services/eMessageService.js';

const nativeFetch = globalThis.fetch;
const axiosCalls: string[] = [];
const rejectAxios = (...args: unknown[]): never => {
  axiosCalls.push(String(args[0]));
  throw new Error('unexpected provider request');
};
axios.get = rejectAxios as typeof axios.get;
axios.post = rejectAxios as typeof axios.post;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.startsWith('http://127.0.0.1:')) return nativeFetch(input, init);
  throw new Error('unexpected provider request');
};

await assert.rejects(
  () => ai.askLawsAndRegulations('blood'),
  (err: unknown) => {
    const error = err as { status?: number; code?: string };
    return error.status === 503 && error.code === 'capability_deferred';
  }
);

const smsResult = await sms.sendSMS('+639171234567', 'test');
assert.equal(smsResult.status, 'unavailable');

const app = express();
app.use(express.json());
app.use('/egov', egovRouter);
app.use('/emessage', emessageRouter);
const server = createServer(app);
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
assert.equal((await fetch(`${base}/egov/token`, { method: 'POST', body: '{}' })).status, 404);
assert.equal((await fetch(`${base}/egov/sso-authenticate`, { method: 'POST', body: '{}' })).status, 404);

const liveness = await fetch(`${base}/egov/liveness/session`, { method: 'POST', body: JSON.stringify({ callback_url: 'about:blank' }) });
assert.equal(liveness.status, 503);
const livenessBody = (await liveness.json()) as { error?: string; retryable?: boolean };
assert.equal(livenessBody.error, 'capability_deferred');
assert.equal(livenessBody.retryable, true);

const livenessResult = await fetch(`${base}/egov/liveness/result/provider-token`);
assert.equal(livenessResult.status, 503);
const livenessResultBody = (await livenessResult.json()) as { error?: string };
assert.equal(livenessResultBody.error, 'capability_deferred');

const aiChat = await fetch(`${base}/egov/ai/chat`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'How does eBuhay coordination work?' })
});
assert.equal(aiChat.status, 503);
const aiChatBody = (await aiChat.json()) as { error?: string; retryable?: boolean };
assert.equal(aiChatBody.error, 'capability_deferred');
assert.equal(aiChatBody.retryable, true);

const emessagePush = await fetch(`${base}/emessage/sms/push`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: '+639171234567', message: 'test' })
});
assert.ok(emessagePush.status === 201 || emessagePush.status === 404);

assert.deepEqual(axiosCalls, []);
await new Promise<void>(resolve => server.close(() => resolve()));
console.log(`legacy adapter no-outbound check passed (${process.env.EBUHAY_MODE || '<unset>'})`);
