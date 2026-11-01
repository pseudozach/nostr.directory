import React from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

import { normalizePerson } from '../../src/components/directory/model';
import {
  PeopleResults,
  loadPeople,
} from '../../src/components/directory/PeopleSearch';

test('anonymous search calls local API with filters and renders actual people and honest coverage', async () => {
  const transport = vi.fn(
    async (_url: RequestInfo | URL, _options?: RequestInit) =>
      new Response(
        JSON.stringify({
          items: [{ pubkey: 'a'.repeat(64), metadata: { name: 'Alice' } }],
          coverage: { complete: false },
          stale: true,
          asOf: '2026-10-01',
          nextCursor: 'next',
        })
      )
  );
  const result = await loadPeople(
    'alice',
    'github',
    'claim',
    undefined,
    transport as typeof fetch
  );
  expect(String(transport.mock.calls[0]?.[0])).toBe(
    '/api/directory?q=alice&platform=github&state=claim'
  );
  const html = renderToStaticMarkup(
    React.createElement(PeopleResults, { result, loading: false, error: '' })
  );
  expect(html).toContain('Alice');
  expect(html).toContain('/p/npub1');
  expect(html).toContain('not a global census');
  expect(html).toContain('Stale');
  expect(html).toContain('2026-10-01');
});

test('backend failures never become a fake empty directory', async () => {
  await expect(
    loadPeople(
      '',
      '',
      '',
      undefined,
      async () => new Response('{}', { status: 503 })
    )
  ).rejects.toThrow('unavailable');
  const error = renderToStaticMarkup(
    React.createElement(PeopleResults, {
      loading: false,
      error: 'Directory unavailable',
    })
  );
  expect(error).toContain('role="alert"');
  expect(error).not.toContain('No people');
  const empty = renderToStaticMarkup(
    React.createElement(PeopleResults, {
      loading: false,
      error: '',
      result: {
        items: [],
        stale: false,
        coverage: {},
        asOf: null,
        nextCursor: null,
      },
    })
  );
  expect(empty).toContain('No people match');
  expect(
    renderToStaticMarkup(
      React.createElement(PeopleResults, { loading: true, error: '' })
    )
  ).toContain('Loading people');
});

test('valid public keys resolve directly without requiring a legacy row', async () => {
  const key = 'a'.repeat(64);
  const transport = vi.fn(
    async (_url: RequestInfo | URL, _options?: RequestInit) =>
      new Response(
        JSON.stringify({ pubkey: key, metadata: { name: 'Relay only' } })
      )
  );
  const result = await loadPeople(
    key,
    '',
    '',
    undefined,
    transport as typeof fetch
  );
  expect(transport.mock.calls[0]?.[0]).toBe(`/api/directory/${key}`);
  expect(result.items).toEqual([
    normalizePerson({ pubkey: key, metadata: { name: 'Relay only' } }),
  ]);
});
