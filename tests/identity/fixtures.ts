import { generatePrivateKey, getPublicKey, getEventHash, signEvent } from 'nostr-tools';

// Fresh TEST-ONLY signer, never an owner key or public publication.
export function fixture(overrides: Record<string, unknown> = {}, key = generatePrivateKey()) {
  const event = {
    kind: 10011, created_at: 1700000000, content: '',
    tags: [['i', 'github:fixture', 'test-gist']], pubkey: getPublicKey(key),
    ...overrides,
  };
  return { ...event, id: getEventHash(event), sig: signEvent(event, key) };
}
