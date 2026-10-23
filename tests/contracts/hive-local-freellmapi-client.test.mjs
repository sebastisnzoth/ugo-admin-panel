import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalModelClient, validateLocalEndpoint } from '../../scripts/hive-local-freellmapi-client.mjs';

test('only loopback FreeLLMAPI endpoint is allowed', () => {
  assert.equal(validateLocalEndpoint(), 'http://127.0.0.1:3001/v1');
  for (const url of ['http://evil.example:3001/v1','https://127.0.0.1:3001/v1','http://127.0.0.1:4000/v1','http://127.0.0.1:3001/v1?foo=bar','http://127.0.0.1:3001/']) assert.throws(() => validateLocalEndpoint(url), /HIVE_LOCAL_ENDPOINT_REQUIRED/);
});
test('rejects missing API key before any request', () => assert.throws(() => createLocalModelClient({ apiKey: '' }), /HIVE_LOCAL_API_KEY_REQUIRED/));
test('one inference uses supplied local API and never touches Supabase', async () => {
  let calls = 0;
  const client = createLocalModelClient({ apiKey: 'test-only', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:3001/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer test-only');
    assert.equal(options.redirect, 'error');
    return { ok: true, text: async () => JSON.stringify({ model: 'qwen', choices: [{ message: { content: 'ok' } }] }) };
  } });
  assert.deepEqual(await client.complete({ model: 'qwen', messages: [{ role: 'user', content: 'hola' }] }), { answer: 'ok', model: 'qwen' });
  assert.equal(calls, 1);
});
test('limits concurrency to one', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const client = createLocalModelClient({ apiKey: 'test', fetchImpl: async () => { await pending; return { ok: true, text: async () => '{"choices":[{"message":{"content":"ok"}}]}' }; } });
  const first = client.complete({model:'qwen',messages:[{role:'user',content:'a'}]});
  await assert.rejects(client.complete({model:'qwen',messages:[{role:'user',content:'b'}]}), /HIVE_BUSY/);
  release();
  await first;
});
