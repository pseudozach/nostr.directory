/* eslint-disable no-restricted-syntax, no-await-in-loop -- Sequential negative transport cases avoid cross-case side effects. */
import type { NextApiRequest, NextApiResponse } from 'next';
import { expect, test, vi } from 'vitest';

import { fixture } from './fixtures';
import publish, {
  postSignedEvent,
  readSignedBody,
} from '../../src/pages/api/directory/publish';

const stream = async function* signedBody(value: string) {
  yield Buffer.from(value);
};

test.each([undefined, 'http://127.0.0.1:3001'])(
  'handler uses shared fixed default or server-only override: %s',
  async (origin) => {
    const event = fixture();
    vi.stubEnv('DIRECTORY_SERVICE_ORIGIN', origin);
    const transport = vi.fn(
      async () =>
        new Response(JSON.stringify({ accepted: true, eventId: event.id }), {
          headers: { 'Content-Type': 'application/json' },
        })
    );
    vi.stubGlobal('fetch', transport);
    const req = Object.assign(stream(JSON.stringify(event)), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    try {
      await publish(
        req as unknown as NextApiRequest,
        res as unknown as NextApiResponse
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(transport).toHaveBeenCalledWith(
        new URL('/api/events', origin ?? 'https://api.nostr.directory'),
        expect.any(Object)
      );
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  }
);

test('signed POST proxy sends original only to configured fixed endpoint and requires matching durable acceptance', async () => {
  const event = fixture();
  const transport = vi.fn(
    async (_url: RequestInfo | URL, _options?: RequestInit) =>
      new Response(JSON.stringify({ accepted: true, eventId: event.id }), {
        headers: { 'Content-Type': 'application/json' },
      })
  );
  const result = await postSignedEvent(
    'https://directory.example',
    event,
    transport as typeof fetch
  );
  expect(result.status).toBe(200);
  expect(String(transport.mock.calls[0]?.[0])).toBe(
    'https://directory.example/api/events'
  );
  expect(transport.mock.calls[0]?.[1]).toMatchObject({
    method: 'POST',
    redirect: 'error',
    credentials: 'omit',
    body: JSON.stringify(event),
  });
  const wrong = await postSignedEvent(
    'https://directory.example',
    event,
    async () =>
      new Response(JSON.stringify({ accepted: true, eventId: 'wrong' }), {
        headers: { 'Content-Type': 'application/json' },
      })
  );
  expect(wrong.status).toBe(502);
});

test('invalid origins, secret forms, tampering, other kinds, oversized events never reach upstream', async () => {
  const event = fixture();
  const transport = vi.fn();
  for (const origin of [
    undefined,
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com/evil',
    'https://example.com/?to=evil',
  ]) {
    expect((await postSignedEvent(origin, event, transport)).status).toBe(503);
  }
  for (const invalid of [
    { nsec: 'nsec1private' },
    { ...event, content: 'tampered' },
    fixture({ kind: 0 }),
    { ...event, padding: 'x'.repeat(16384) },
  ]) {
    expect(
      (await postSignedEvent('https://directory.example', invalid, transport))
        .status
    ).toBe(400);
  }
  expect(transport).not.toHaveBeenCalled();
});

test('request stream is bounded at 16KiB even without Content-Length', async () => {
  const event = fixture();
  expect(await readSignedBody(stream(JSON.stringify(event)))).toEqual(event);
  await expect(readSignedBody(stream('x'.repeat(16385)))).rejects.toThrow(
    '16 KiB'
  );
  await expect(readSignedBody(stream('{invalid'))).rejects.toThrow();
});

test('redirects, failures and oversized upstream responses never report acceptance', async () => {
  const event = fixture();
  for (const response of [
    new Response('', {
      status: 302,
      headers: { location: 'https://evil.example' },
    }),
    new Response('{}', { status: 500 }),
    new Response('x'.repeat(16385), {
      headers: { 'Content-Type': 'application/json' },
    }),
  ]) {
    expect(
      (
        await postSignedEvent(
          'https://directory.example',
          event,
          async () => response
        )
      ).status
    ).toBe(502);
  }
});
