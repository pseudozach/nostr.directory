import { expect, test, vi } from 'vitest';

// HTTP request/response boundary doubles; no backend or relay is started.
test('GET forwards bounded search only to the server configured origin', async () => {
  const endpoint = await handler();
  const { res, result } = response();
  const calls: string[] = [];
  const data = { items: [], nextCursor: null, coverage: { complete: false }, asOf: null, stale: true };
  vi.stubEnv('DIRECTORY_SERVICE_ORIGIN', 'https://directory.example');
  vi.stubGlobal('fetch', async (url: URL) => { calls.push(String(url)); return Response.json(data); });
  try {
    await endpoint({ method: 'GET', query: { q: 'alice & bob' } }, res);
    expect(result.status).toBe(200);
    expect(result.body).toEqual(data);
    expect(calls).toEqual(['https://directory.example/api/directory?q=alice+%26+bob']);
    expect(result.headers['cache-control']).toBe('no-store');
  } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
});
async function handler() {
  const modulePath = '../../src/pages/api/directory/index';
  const module = await import(modulePath).catch(() => ({}));
  expect(typeof module.default).toBe('function');
  return module.default;
}

function response() {
  const result = { status: 0, body: undefined as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader(name: string, value: string) { result.headers[name.toLowerCase()] = value; return res; },
    status(value: number) { result.status = value; return res; },
    json(value: unknown) { result.body = value; return res; },
  };
  return { res, result };
}

test('the public directory endpoint rejects write methods without contacting any service', async () => {
  const endpoint = await handler();
  const { res, result } = response();
  await endpoint({ method: 'POST', query: { q: 'alice' } }, res);
  expect(result).toEqual({ status: 405, body: { error: 'method not allowed' }, headers: {
    allow: 'GET', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  } });
});
