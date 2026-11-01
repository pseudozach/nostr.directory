import { expect, test, vi } from 'vitest';

import { resolveProfile } from '../../src/components/directory/profile';

test('relay-only key needs no old Twitter lookup and unavailable data is not an empty list', async () => {
  const legacy = vi.fn();
  const key = 'a'.repeat(64);
  const transport = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          pubkey: key,
          metadata: { name: 'New person' },
          currentEvent: null,
          observedComplete: false,
        })
      )
  );
  const result = await resolveProfile(key, legacy, transport as typeof fetch);
  expect(result.person.metadata.name).toBe('New person');
  expect(result.person.observedComplete).toBe(false);
  expect(legacy).not.toHaveBeenCalled();
  await expect(
    resolveProfile(key, legacy, async () => new Response('{}', { status: 502 }))
  ).rejects.toThrow('unavailable');
});

test('legacy compatibility retains original verification evidence without substituting import dates', async () => {
  const key = 'a'.repeat(64);
  const verifiedAt = '2023-01-04T00:00:00Z';
  const result = await resolveProfile(
    'oldname',
    async () => ({
      nPubKey: key,
      verified: true,
      verifiedAt,
      method: 'tweet',
      proofUrl: 'https://twitter.com/oldname/status/123',
      importedAt: '2026-01-01T00:00:00Z',
    }),
    async () => new Response(JSON.stringify({ pubkey: key }))
  );
  expect(result.person.legacy[0]).toMatchObject({
    verifiedAt,
    method: 'tweet',
    proofUrl: 'https://twitter.com/oldname/status/123',
  });
  expect(result.person.legacy[0]).not.toHaveProperty('importedAt');
});

test('legacy handle resolves its public key but verified boolean stays only historical evidence', async () => {
  const key = 'a'.repeat(64);
  const legacy = vi.fn(async () => ({
    nPubKey: key,
    screenName: 'oldname',
    verified: true,
  }));
  const result = await resolveProfile(
    '@OldName',
    legacy,
    async () => new Response(JSON.stringify({ pubkey: key, claims: [] }))
  );
  expect(legacy).toHaveBeenCalledWith('oldname');
  expect(result.person.claims).toEqual([]);
  expect(result.person.legacy[0]).toEqual({
    platform: 'twitter',
    identity: 'oldname',
    historicallyVerified: true,
  });
});
