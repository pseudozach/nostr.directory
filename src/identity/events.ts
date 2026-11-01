import { getEventHash, verifySignature } from 'nostr-tools';

export type DirectoryEvent = {
  id: string;
  sig: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
};

/** Validate originals, never mutate or re-sign an imported event. */
export function validateDirectoryEvent(
  value: unknown
): value is DirectoryEvent {
  try {
    const event = value as DirectoryEvent;
    if (
      !event ||
      Object.keys(event).some(
        (key) =>
          ![
            'id',
            'sig',
            'pubkey',
            'kind',
            'created_at',
            'tags',
            'content',
          ].includes(key)
      ) ||
      typeof event.sig !== 'string' ||
      !/^[a-f0-9]{128}$/.test(event.sig) ||
      !Number.isSafeInteger(event.created_at) ||
      event.created_at < 0 ||
      !Array.isArray(event.tags) ||
      event.tags.length > 256 ||
      event.tags.some(
        (tag) =>
          !Array.isArray(tag) || tag.some((field) => typeof field !== 'string')
      ) ||
      new TextEncoder().encode(JSON.stringify(event)).length > 16384
    )
      return false;
    return (
      (event.kind === 0 || event.kind === 10011) &&
      event.id === getEventHash(event) &&
      // Verify a fresh wire-shaped object: SDK verification memoization on a
      // mutable signer object must never authorize a changed signature.
      verifySignature({
        id: event.id,
        sig: event.sig,
        pubkey: event.pubkey,
        kind: event.kind,
        created_at: event.created_at,
        tags: event.tags,
        content: event.content,
      })
    );
  } catch {
    return false;
  }
}

/** Caller scopes both candidates to the same (pubkey, kind). */
export function latest<T extends { id: string; created_at: number }>(
  a: T | null,
  b: T
): T {
  if (
    !a ||
    b.created_at > a.created_at ||
    (b.created_at === a.created_at && b.id < a.id)
  )
    return b;
  return a;
}
