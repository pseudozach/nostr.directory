/* eslint-disable no-script-url, no-restricted-syntax -- Malicious URL fixtures and small synchronous rejection tables are intentional. */
import React from 'react';

import { nip19 } from 'nostr-tools';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { PersonCard } from '../../src/components/directory/PeopleSearch';
import { IdentityBadges } from '../../src/components/directory/IdentityBadges';
import {
  safeImage,
  publicKey,
  normalizePerson,
  directoryQuery,
} from '../../src/components/directory/model';

test('untrusted remote avatar hosts are never contacted on anonymous page render', () => {
  const person = normalizePerson({ pubkey: 'a'.repeat(64), metadata: { picture: 'https://images.example/a.png' } });
  const html = renderToStaticMarkup(React.createElement(PersonCard, { person }));
  expect(html).not.toContain('<img');
  expect(html).toContain('Load external avatar');
  expect(html).toContain('IP address');
});

test('public directory keys support npub and nprofile, never secret keys or arbitrary URLs', () => {
  const key = 'a'.repeat(64);
  expect(publicKey(nip19.npubEncode(key))).toBe(key);
  expect(publicKey(nip19.nprofileEncode({ pubkey: key, relays: [] }))).toBe(
    key
  );
  expect(publicKey('nsec1private')).toBeNull();
  expect(publicKey('https://example.com')).toBeNull();
});

test('directory metadata is bounded plain text and images are HTTPS without credentials or local hosts', () => {
  const person = normalizePerson({
    pubkey: 'a'.repeat(64),
    metadata: {
      display_name: { unsafe: true },
      name: 'Alice',
      picture: 'javascript:alert(1)',
    },
    claims: [{ platform: 'github', identity: 'a', verified: true }],
    legacy: [{ verified: true }],
  });
  expect(person.metadata.display_name).toBeUndefined();
  expect(person.metadata.name).toBe('Alice');
  expect(person.metadata.picture).toBeUndefined();
  expect(person.claims[0]?.state).toBe('claim');
  for (const url of [
    'http://images.example/a',
    'https://user:pass@example.com/a',
    'https://127.0.0.1/a',
    'https://localhost/a',
    'data:image/svg+xml,x',
  ])
    expect(safeImage(url)).toBeUndefined();
  expect(safeImage('https://images.example/a.png')).toBe(
    'https://images.example/a.png'
  );
});

test('image host checks canonicalize trailing dots and reject private/reserved DNS suffixes', () => {
  for (const host of [
    'a.localhost.',
    'host.internal.',
    'host.local.',
    'host.test.',
    'host.invalid',
    'host.home.arpa',
    'host.lan',
    'host.home',
    'host.onion',
    '127.0.0.1.nip.io',
    '127.0.0.1.sslip.io',
  ]) {
    expect(safeImage(`https://${host}/avatar.png`), host).toBeUndefined();
  }
  expect(safeImage('https://images.example./avatar.png')).toBe(
    'https://images.example./avatar.png'
  );
});

test('default claims stay unchecked and legacy booleans never become current verification', () => {
  const person = normalizePerson({
    pubkey: 'a'.repeat(64),
    claims: [{ platform: 'github', identity: '<script>', verified: true }],
    legacy: [{ verified: true }],
  });
  const html = renderToStaticMarkup(
    React.createElement(IdentityBadges, { person })
  );
  expect(html).toContain('Signed claim / unchecked');
  expect(html).toContain('Legacy evidence');
  expect(html).not.toContain('NIP39 verified');
  expect(html).toContain('&lt;script&gt;');
});

test('invalid check dates do not upgrade verification and legacy evidence keeps unknown dates honest', () => {
  const person = normalizePerson({
    pubkey: 'a'.repeat(64),
    claims: [
      {
        platform: 'github',
        identity: 'a',
        state: 'verified',
        checkedAt: 'not-a-date',
      },
    ],
    legacy: [
      {
        historicallyVerified: true,
        verifiedAt: 'not-a-date',
        importedAt: '2026-01-01T00:00:00Z',
        method: 'tweet',
        proofUrl: 'https://twitter.com/a/status/123',
      },
    ],
  });
  const html = renderToStaticMarkup(
    React.createElement(IdentityBadges, { person })
  );
  expect(html).not.toContain('NIP39 verified');
  expect(html).not.toContain('not-a-date');
  expect(html).not.toContain('2026-01-01');
  expect(html).toContain('verification date unknown');
  expect(html).toContain('tweet');
  expect(html).toContain('https://twitter.com/a/status/123');
});

test('search carries real filters but refuses private-key shaped input', () => {
  expect(directoryQuery(' alice ', 'github', 'claim')).toBe(
    'q=alice&platform=github&state=claim'
  );
  expect(() => directoryQuery('nsec1private', '', '')).toThrow('public');
});
