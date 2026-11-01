import { getEventHash } from 'nostr-tools';

import type { IdentityDraft } from './editor';
import { validateDirectoryEvent } from './events';
import type { DirectoryEvent } from './events';

export type IdentitySigner = {
  getPublicKey(): Promise<string>;
  signEvent(draft: IdentityDraft): Promise<unknown>;
};

/** Call only from a reviewed, explicit user gesture; never publishes. */
export async function signIdentityDraft(
  draft: IdentityDraft,
  signer: IdentitySigner | undefined,
  consent: boolean
): Promise<DirectoryEvent> {
  if (consent !== true) throw new Error('explicit consent required');
  if (!signer) throw new Error('signer unavailable');
  if (
    !draft ||
    draft.kind !== 10011 ||
    !/^[a-f0-9]{64}$/.test(draft.pubkey) ||
    !Number.isSafeInteger(draft.created_at) ||
    draft.created_at < 0 ||
    typeof draft.content !== 'string' ||
    !Array.isArray(draft.tags) ||
    draft.tags.length > 256 ||
    draft.tags.some(
      (tag) =>
        !Array.isArray(tag) || tag.some((field) => typeof field !== 'string')
    ) ||
    new TextEncoder().encode(
      JSON.stringify({ ...draft, id: '0'.repeat(64), sig: '0'.repeat(128) })
    ).length > 16384
  ) {
    throw new Error('invalid identity draft');
  }
  const request = {
    kind: draft.kind,
    pubkey: draft.pubkey,
    created_at: draft.created_at,
    tags: draft.tags.map((tag) => [...tag]),
    content: draft.content,
  };
  const expectedId = getEventHash(request);
  if ((await signer.getPublicKey()) !== request.pubkey)
    throw new Error('signer author mismatch');
  const event = await signer.signEvent(request);
  if (
    !validateDirectoryEvent(event) ||
    event.kind !== 10011 ||
    event.id !== expectedId
  ) {
    throw new Error('signer returned a different or invalid event');
  }
  return event;
}
