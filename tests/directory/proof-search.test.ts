import { expect, test } from 'vitest';
import { generatePrivateKey, nip19 } from 'nostr-tools';
import { DirectoryStore } from '../../services/directory/src/store';
import { ProofChecks } from '../../services/directory/src/checks';
import { DirectorySearch } from '../../services/directory/src/search';
import { fixture } from '../identity/fixtures';

test('person and verified search join fresh independent checks, never signatures or removed entries', async () => {
  const store = new DirectoryStore(':memory:');
  const key = generatePrivateKey();
  const event = fixture({ tags: [['i', 'github:alice', 'abc123']] }, key);
  const input = { pubkey: event.pubkey, eventId: event.id, position: 0, platform: 'github', identity: 'alice', proof: 'abc123' };
  const checks = new ProofChecks({ isCurrent: i => store.isCurrentProof(i), storage: store.checkStorage(), budget: store.outboundBudget(),
    transport: async () => ({ id: 'abc123', owner: { login: 'alice', id: 1 }, files: { proof: { filename: 'proof', truncated: false, content: nip19.npubEncode(event.pubkey) } } }) });
  const search = new DirectorySearch(store, { query: async () => [] });
  try {
    store.apply(event);
    expect(search.person(event.pubkey).claims[0]?.state).toBe('claim');
    expect((await checks.check(input)).state).toBe('verified');
    expect(search.person(event.pubkey).claims[0]).toMatchObject({ state: 'verified', checkerVersion: expect.any(String), checkedAt: expect.any(String) });
    expect((await search.list({ state: 'verified' })).items).toHaveLength(1);
    store.apply(fixture({ created_at: event.created_at + 1, tags: [] }, key));
    expect((await search.list({ state: 'verified' })).items).toHaveLength(0);
  } finally { store.close(); }
});
