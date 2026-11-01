import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { generatePrivateKey } from 'nostr-tools';
import { DirectoryStore } from '../../services/directory/src/store';
import type { BoundProof } from '../../services/directory/src/checks';
import { ProofChecks } from '../../services/directory/src/checks';
import { fixture } from '../identity/fixtures';

test('durable proof adapters bind the exact current signed entry and retain cache across restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'directory-proofs-'));
  let store = new DirectoryStore(join(dir, 'cache.sqlite'));
  const key = generatePrivateKey();
  const event = fixture({ tags: [['i', 'github:alice', 'abc123']] }, key);
  const input = { pubkey: event.pubkey, eventId: event.id, position: 0, platform: 'github', identity: 'alice', proof: 'abc123' };
  try {
    store.apply(event);
    expect(store.isCurrentProof(input)).toBe(true);
    expect(store.isCurrentProof({ ...input, identity: 'mallory' })).toBe(false);
    expect(store.isCurrentProof({ ...input, proof: 'other' })).toBe(false);
    expect(store.isCurrentProof({ ...input, position: 1 })).toBe(false);
    expect(store.isCurrentProof({ ...input, eventId: '0'.repeat(64) })).toBe(false);
    const options = () => ({ isCurrent: (i: BoundProof) => store.isCurrentProof(i), storage: store.checkStorage(), transport: async () => { throw new Error('offline'); } });
    const result = await new ProofChecks(options()).check(input);
    store.close(); store = new DirectoryStore(join(dir, 'cache.sqlite'));
    expect(new ProofChecks(options()).read(input)).toEqual(result);
    store.apply(fixture({ created_at: event.created_at + 1, tags: [] }, key));
    expect(new ProofChecks(options()).read(input).reason).toBe('removed-or-replaced');
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('outbound reservations share a durable atomic 500/day ceiling and cannot reset by rewinding time', () => {
  const dir = mkdtempSync(join(tmpdir(), 'directory-budget-'));
  const path = join(dir, 'cache.sqlite');
  const first = new DirectoryStore(path);
  const second = new DirectoryStore(path);
  const day = 86400000;
  try {
    for (let i = 0; i < 500; i++) expect((i % 2 ? first : second).outboundBudget().reserve(day)).toBe(true);
    expect(first.outboundBudget().reserve(day)).toBe(false);
    expect(second.outboundBudget().reserve(0)).toBe(false);
    expect(first.outboundBudget().reserve(day * 2)).toBe(true);
    expect(second.outboundBudget().reserve(day)).toBe(false);
  } finally { first.close(); second.close(); }
  const reopened = new DirectoryStore(path);
  try {
    for (let i = 1; i < 500; i++) expect(reopened.outboundBudget().reserve(day * 2)).toBe(true);
    expect(reopened.outboundBudget().reserve(day * 2)).toBe(false);
  } finally { reopened.close(); rmSync(dir, { recursive: true, force: true }); }
});
