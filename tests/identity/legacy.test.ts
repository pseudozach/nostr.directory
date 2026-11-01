import { expect, test } from 'vitest';

import { projectLegacyEvidence } from '../../src/identity/legacy';

const legacy = {
  sourceId: 'old:1',
  pubkey: 'a'.repeat(64),
  platform: 'github',
  identity: 'alice',
};

test.each([
  'http://example.com',
  // Deliberately hostile legacy input, never navigated or evaluated.
  // eslint-disable-next-line no-script-url
  'javascript:alert(1)',
  'https://u:p@example.com',
  'https://example.com:444',
  'not-a-url',
])(
  'drops unsafe legacy proof URL %s without upgrading evidence',
  (proofUrl) => {
    expect(
      projectLegacyEvidence({
        ...legacy,
        proofUrl,
        verifiedAt: '2023-01-04T00:00:00Z',
      })
    ).toMatchObject({
      state: 'claim',
      historicallyVerified: false,
      proofUrl: null,
    });
  }
);

test.each([
  { pubkey: 'bad' },
  { sourceId: '' },
  { sourceId: 'x'.repeat(257) },
  { platform: '' },
  { platform: 'x'.repeat(65) },
  { identity: '' },
  { identity: 'x'.repeat(321) },
])('rejects malformed legacy evidence %#', (patch) => {
  expect(() => projectLegacyEvidence({ ...legacy, ...patch })).toThrow(
    'invalid-legacy-evidence'
  );
});

test('safe historical link and method are metadata only, never proof of current ownership', () => {
  expect(
    projectLegacyEvidence({
      ...legacy,
      proofUrl: 'https://example.com/proof',
      method: 'x'.repeat(200),
    })
  ).toMatchObject({
    state: 'claim',
    proofUrl: 'https://example.com/proof',
    method: 'x'.repeat(128),
    verifiedAt: null,
  });
});

test('historical evidence retains original date and never becomes a current verification', () => {
  expect(
    projectLegacyEvidence({
      sourceId: 'old:1',
      pubkey: 'a'.repeat(64),
      platform: 'twitter',
      identity: 'alice',
      historicallyVerified: true,
      verifiedAt: '2023-01-04T00:00:00Z',
      method: 'legacy-tweet',
    })
  ).toEqual({
    sourceId: 'old:1',
    pubkey: 'a'.repeat(64),
    platform: 'twitter',
    identity: 'alice',
    state: 'historicallyVerified',
    historicallyVerified: true,
    verifiedAt: '2023-01-04T00:00:00Z',
    method: 'legacy-tweet',
    proofUrl: null,
  });
  expect(
    projectLegacyEvidence({
      sourceId: 'old:2',
      platform: 'github',
      identity: 'alice',
      pubkey: 'b'.repeat(64),
      historicallyVerified: true,
    }).verifiedAt
  ).toBeNull();
  expect(
    projectLegacyEvidence({
      sourceId: 'old:3',
      platform: 'github',
      identity: 'alice',
      pubkey: 'b'.repeat(64),
      historicallyVerified: false,
      verifiedAt: 'bad-date',
    })
  ).toMatchObject({
    state: 'claim',
    historicallyVerified: false,
    verifiedAt: null,
  });
});
