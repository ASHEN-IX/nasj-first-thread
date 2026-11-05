import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';

// Execute the actual routes, preflight, schemas and db adapter in an isolated VM.
// Neon is replaced before any route code can run; no .env files or network calls.
async function route(kind, options = {}) {
  const queries = [];
  const context = vm.createContext({
    process: { env: { DATABASE_URL: 'postgresql://test.invalid/isolated', IP_HASH_SECRET: 'isolated-test-secret-with-sufficient-length', ...options.env } },
    console: { error() {} }, URL,
  });
  const modules = new Map();
  async function synthetic(key, exports) {
    if (!modules.has(key)) {
      const names = Object.keys(exports);
      modules.set(key, new vm.SyntheticModule(names, function() { for (const name of names) this.setExport(name, exports[name]); }, { context }));
    }
    return modules.get(key);
  }
  const sql = async (strings, ...values) => {
    const query = strings.join('?'); queries.push({ query, values });
    if (options.databaseDown) throw new Error('offline');
    if (query.includes('submission_rate_limits')) return options.limited ? [] : [{ request_count: 1 }];
    return [];
  };
  async function source(file) {
    if (modules.has(file)) return modules.get(file);
    const code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const result = new vm.SourceTextModule(code, { context, identifier: file }); modules.set(file, result);
    return result;
  }
  const entry = await source(path.resolve(`app/api/${kind}/route.ts`));
  await entry.link(async specifier => {
    if (specifier.startsWith('@/')) return source(path.resolve(`${specifier.slice(2)}.ts`));
    if (specifier === 'server-only') return synthetic(specifier, {});
    if (specifier === '@neondatabase/serverless') return synthetic(specifier, { neon: () => sql });
    return synthetic(specifier, await import(specifier === 'next/server' ? 'next/server.js' : specifier));
  });
  await entry.evaluate();
  return { post: entry.namespace.POST, queries };
}

const alpha = { fullName: 'Test Artisan', email: 'TEST@example.invalid', role: 'artisan', testingInterest: 'Review the gifting journey', consent: true, website: '' };
const craft = { contactName: 'Test Artisan', email: 'TEST@example.invalid', participantType: 'cooperative', region: 'Tunis', craftTypes: ['embroidery'], aboutWork: 'Hand embroidered textiles for gifts.', openToCollaboration: false, consent: true, website: '' };
function request(kind, data, headers = {}) {
  return new NextRequest(`http://localhost/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost', origin: 'http://localhost', ...headers }, body: typeof data === 'string' ? data : JSON.stringify(data) });
}

for (const [kind, valid, table, routeKey] of [['early-access', alpha, 'early_access_applications', 'early_access'], ['craft-community', craft, 'craft_community_submissions', 'craft_community']]) {
  test(`${kind}: correct independent persistence, normalized email and generic confirmation`, async () => {
    const { post, queries } = await route(kind);
    const result = await post(request(kind, valid));
    assert.equal(result.status, 200); assert.equal((await result.json()).ok, true);
    assert.match(queries[0].query, /WHERE submission_rate_limits.request_count < 5/);
    assert.equal(queries[0].values[1], routeKey);
    assert.match(queries[1].query, new RegExp(`INSERT INTO ${table}`));
    assert.match(queries[1].query, /contact_consent_at/);
    assert.match(queries[1].query, /ON CONFLICT \(email\) DO NOTHING/);
    assert.ok(queries[1].values.includes('test@example.invalid'));
    if (kind === 'craft-community') assert.ok(queries[1].values.includes(false));
  });
  test(`${kind}: missing consent and populated honeypot never persist a form`, async () => {
    for (const invalid of [{ ...valid, consent: false }, { ...valid, website: 'spam' }, { ...valid, email: 'invalid' }]) {
      const { post, queries } = await route(kind);
      assert.equal((await post(request(kind, invalid))).status, 400);
      assert.equal(queries.length, 1); // preserved rate-limit preflight only
    }
  });
  test(`${kind}: content type/origin are rejected before database access`, async () => {
    for (const [headers, status] of [[{ 'content-type': 'text/plain' }, 415], [{ origin: 'https://untrusted.invalid' }, 403]]) {
      const { post, queries } = await route(kind);
      assert.equal((await post(request(kind, valid, headers))).status, status); assert.equal(queries.length, 0);
    }
  });
  test(`${kind}: rate limit blocks persistence and database failure stays recoverable`, async () => {
    const limited = await route(kind, { limited: true });
    assert.equal((await limited.post(request(kind, valid))).status, 429); assert.equal(limited.queries.length, 1);
    const offline = await route(kind, { databaseDown: true });
    const response = await offline.post(request(kind, valid));
    assert.equal(response.status, 503); assert.equal((await response.json()).ok, false);
    const missing = await route(kind, { env: { IP_HASH_SECRET: '' } });
    assert.equal((await missing.post(request(kind, valid))).status, 503); assert.equal(missing.queries.length, 0);
  });
  test(`${kind}: missing dedicated secret uses a stable, private derived key and still enforces limits`, async () => {
    const credential = 'isolated-mailjet-secret-with-sufficient-length';
    const env = { IP_HASH_SECRET: '', MAILJET_SECRET_KEY: credential };
    const first = await route(kind, { env });
    const second = await route(kind, { env });
    assert.equal((await first.post(request(kind, valid, { 'x-forwarded-for': '192.0.2.1' }))).status, 200);
    assert.equal((await second.post(request(kind, valid, { 'x-forwarded-for': '192.0.2.1' }))).status, 200);
    const derived = createHmac('sha256', credential).update('nasj.registration.ip-hash.v1').digest('hex');
    const expected = createHmac('sha256', derived).update('192.0.2.1').digest('hex');
    assert.equal(first.queries[0].values[0], expected);
    assert.equal(second.queries[0].values[0], expected);
    assert.notEqual(expected, createHmac('sha256', credential).update('192.0.2.1').digest('hex'));
    const limited = await route(kind, { env, limited: true });
    assert.equal((await limited.post(request(kind, valid))).status, 429);
    assert.equal(limited.queries.length, 1);
  });
  test(`${kind}: valid dedicated secret takes priority, short credentials cannot enable registration`, async () => {
    const dedicated = 'dedicated-private-hashing-secret';
    const configured = await route(kind, { env: { IP_HASH_SECRET: dedicated, MAILJET_SECRET_KEY: 'other-long-email-provider-credential' } });
    assert.equal((await configured.post(request(kind, valid, { 'x-forwarded-for': '192.0.2.2' }))).status, 200);
    assert.equal(configured.queries[0].values[0], createHmac('sha256', dedicated).update('192.0.2.2').digest('hex'));
    const missing = await route(kind, { env: { IP_HASH_SECRET: 'short', MAILJET_SECRET_KEY: 'short', RESEND_API_KEY: '' } });
    assert.equal((await missing.post(request(kind, valid))).status, 503);
    assert.equal(missing.queries.length, 0);
  });
}

test('craft form rejects an empty craft list without mixing alpha fields', async () => {
  const { post, queries } = await route('craft-community');
  assert.equal((await post(request('craft-community', { ...craft, craftTypes: [] }))).status, 400);
  assert.equal(queries.length, 1);
});
