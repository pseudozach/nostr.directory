import { expect, test } from 'vitest';
import * as events from '../../src/identity/events';
import { fixture } from './fixtures';
import { verifySignature } from 'nostr-tools';

test('a previously verified mutable object cannot bypass signature revalidation', () => {
  const event = fixture();
  expect(verifySignature(event)).toBe(true);
  event.sig = '0'.repeat(128);
  expect(events.validateDirectoryEvent(event)).toBe(false);
});

test('admits a cryptographically valid owner-signed identity list', () => {
  expect(events).toHaveProperty('validateDirectoryEvent');
  expect(events.validateDirectoryEvent(fixture())).toBe(true);
});

test('rejects signed events outside the two directory kinds', () => {
  expect(events.validateDirectoryEvent(fixture({ kind: 1 }))).toBe(false);
});

test.each([
  { created_at: -1 }, { created_at: 1.5 },
  { created_at: 9007199254740992 }, { tags: [[1]] },
  { tags: Array.from({ length: 257 }, () => ['x']) },
  { content: 'x'.repeat(16385) },
])('rejects a signed event outside the bounded directory schema: case %#', (overrides) => {
  expect(events.validateDirectoryEvent(fixture(overrides))).toBe(false);
});

test('rejects non-string signatures even when the crypto library accepts byte arrays', () => {
  const event = fixture();
  expect(events.validateDirectoryEvent({ ...event, sig: Buffer.from(event.sig, 'hex') })).toBe(false);
});

test.each(['tags', 'pubkey', 'id', 'sig'] as const)('rejects tampered %s', (field) => {
  const valid = fixture();
  const changes = { tags: [['i', 'github:attacker', 'gist']], pubkey: 'a'.repeat(64), id: '0'.repeat(64), sig: '0'.repeat(128) };
  expect(events.validateDirectoryEvent({ ...valid, [field]: changes[field] })).toBe(false);
});
