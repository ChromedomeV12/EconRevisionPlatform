const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('../account.js');

test('account client uses only same-origin cookies and does not upload browser persistence', async () => {
  const requests = [];
  const client = createClient(async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ id: 'synthetic' }) }; });
  await client('/api/me'); await client('/api/auth/sign-out', {});
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(requests[0].options.body, undefined);
  assert.equal(requests[1].options.body, '{}');
  await assert.rejects(client('https://foreign.invalid/api/me'), /Invalid API path/);
});

test('account client preserves server conflict and authorization failures', async () => {
  const client = createClient(async () => ({ ok: false, status: 409, json: async () => ({ error: { message: 'Stale submission version' } }) }));
  await assert.rejects(client('/api/v1/submissions/a', { expectedVersion: 1 }, 'PATCH'), error => error.status === 409 && /Stale/.test(error.message));
});
