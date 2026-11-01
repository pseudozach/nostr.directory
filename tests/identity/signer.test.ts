import { expect, test } from 'vitest';
import { generatePrivateKey } from 'nostr-tools';
import * as signing from '../../src/identity/signer';
import { fixture } from './fixtures';

// Deterministic injected NIP07 transport double; not an owner/browser signer.
test('signing without explicit user consent never contacts the injected signer', async () => {
  let calls = 0;
  const signer = { getPublicKey: async () => { calls++; return 'key'; },
    signEvent: async () => { calls++; return fixture(); } };
  expect(typeof signing.signIdentityDraft).toBe('function');
  await expect(signing.signIdentityDraft(fixture(), signer, false)).rejects.toThrow('explicit consent required');
  expect(calls).toBe(0);
});

test('explicit consent returns the exact locally verified signer event without publishing', async () => {
  const event = fixture();
  const { id: _id, sig: _sig, ...draft } = event;
  let received: unknown;
  const signer = { getPublicKey: async () => event.pubkey,
    signEvent: async (request: unknown) => { received = request; return event; } };
  const result = await signing.signIdentityDraft(draft, signer, true);
  expect(received).toEqual(draft);
  expect(result).toBe(event);
});

test('a different connected signer cannot sign another persons identity list', async () => {
  const draft = fixture();
  let signs = 0;
  const signer = { getPublicKey: async () => fixture().pubkey,
    signEvent: async () => { signs++; return draft; } };
  await expect(signing.signIdentityDraft(draft, signer, true)).rejects.toThrow('signer author mismatch');
  expect(signs).toBe(0);
});

test('signer responses must match every requested field and pass real signature verification', async () => {
  const key = generatePrivateKey();
  const draft = fixture({}, key);
  const responses = [fixture({ content: 'changed' }, key), fixture({ tags: [] }, key),
    fixture({ created_at: draft.created_at + 1 }, key), fixture({ kind: 0 }, key), fixture(),
    { ...draft, sig: '0'.repeat(128) }, { ...draft, id: '0'.repeat(64) }, null];
  for (const response of responses) {
    const signer = { getPublicKey: async () => draft.pubkey, signEvent: async () => response };
    await expect(signing.signIdentityDraft(draft, signer, true)).rejects.toThrow('signer returned a different or invalid event');
  }
});

test('signer receives an isolated snapshot rather than mutable reviewed UI state', async () => {
  const event = fixture();
  const draft = { kind: event.kind, pubkey: event.pubkey, created_at: event.created_at,
    tags: event.tags.map((tag) => [...tag]), content: event.content };
  const original = JSON.stringify(draft);
  const signer = { getPublicKey: async () => event.pubkey,
    signEvent: async (request: typeof draft) => { request.tags[0]![1] = 'custom:mutated'; return event; } };
  expect(await signing.signIdentityDraft(draft, signer, true)).toBe(event);
  expect(JSON.stringify(draft)).toBe(original);
});

test('invalid drafts are rejected before a signer is contacted', async () => {
  const event = fixture();
  let contacts = 0;
  const signer = { getPublicKey: async () => { contacts++; return event.pubkey; }, signEvent: async () => event };
  for (const patch of [{ kind: 0 }, { created_at: -1 }, { created_at: NaN },
    { tags: [['i', 'custom:x', { unsupported: true }]] }, { tags: Array(257).fill(['x']) },
    { content: 'x'.repeat(17000) }, { pubkey: 'not-a-key' }]) {
    await expect(signing.signIdentityDraft({ ...event, ...patch } as any, signer, true))
      .rejects.toThrow('invalid identity draft');
  }
  expect(contacts).toBe(0);
});
