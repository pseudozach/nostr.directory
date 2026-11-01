import { directoryRequest } from './request';
import { editIdentityList } from '../../identity/editor';
import type { IdentityDraft } from '../../identity/editor';
import { validateDirectoryEvent } from '../../identity/events';
import type { DirectoryEvent } from '../../identity/events';
import { publishIdentityList } from '../../identity/publish';
import { signIdentityDraft } from '../../identity/signer';
import type { IdentitySigner } from '../../identity/signer';

export type Observation = {
  pubkey: string;
  currentEvent: DirectoryEvent | null;
  observedComplete: boolean;
};
export type IdentityEdit = { remove: number } | { append: string[] };

export async function observeList(
  pubkey: string,
  transport: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<Observation> {
  const person = await directoryRequest(async (boundedSignal) => {
    const response = await transport(`/api/directory/${pubkey}`, {
      signal: boundedSignal,
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!response.ok)
      throw new Error('Current list unavailable. Nothing has been replaced.');
    return response.json();
  }, signal);
  if (
    person.pubkey !== pubkey ||
    !Object.prototype.hasOwnProperty.call(person, 'currentEvent')
  )
    throw new Error('Current list unavailable.');
  const event = person.currentEvent;
  if (
    event !== null &&
    (!validateDirectoryEvent(event) ||
      event.kind !== 10011 ||
      event.pubkey !== pubkey)
  )
    throw new Error(
      'Unsupported encoding or invalid signed list. Editing is blocked; no opaque data will be dropped.'
    );
  return {
    pubkey,
    currentEvent: event,
    observedComplete: person.observedComplete === true,
  };
}

export function reviewEdit(
  base: Observation,
  edit: IdentityEdit,
  createdAt: number
): IdentityDraft {
  if (!base.observedComplete)
    throw new Error(
      'Observation incomplete. Fetch the full current list before editing.'
    );
  if (base.currentEvent)
    return editIdentityList(
      base.currentEvent,
      base.currentEvent,
      edit,
      createdAt
    );
  if (
    !('append' in edit) ||
    edit.append[0] !== 'i' ||
    !/^[^:]+:.+$/.test(edit.append[1] ?? '') ||
    edit.append.length < 3 ||
    edit.append.some((field) => typeof field !== 'string')
  )
    throw new Error('Invalid identity edit');
  return {
    pubkey: base.pubkey,
    kind: 10011,
    created_at: createdAt,
    content: '',
    tags: [[...edit.append]],
  };
}

export async function withDeadline<T>(
  operation: Promise<T>,
  milliseconds = 30000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error('Operation timed out; no success is confirmed.')),
          milliseconds
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function signReviewed(
  base: Observation,
  draft: IdentityDraft,
  signer: IdentitySigner | undefined,
  consent: boolean,
  read: () => Promise<Observation> = () => observeList(base.pubkey),
  isCurrent: () => boolean = () => true
): Promise<DirectoryEvent> {
  if (consent !== true) throw new Error('Explicit consent required');
  const latest = await withDeadline(read());
  if (
    !base.observedComplete ||
    !latest.observedComplete ||
    latest.pubkey !== base.pubkey ||
    (base.currentEvent?.id ?? null) !== (latest.currentEvent?.id ?? null)
  )
    throw new Error(
      'List changed or observation incomplete; rebase by loading the latest list and review again.'
    );
  let active = true;
  const assertCurrent = () => {
    if (!active || !isCurrent())
      throw new Error('Review invalidated; review again.');
  };
  assertCurrent();
  // Key lookup is asynchronous too: guard each extension entry point, not just
  // the call into signIdentityDraft, so revocation cannot open a late prompt.
  const guardedSigner = signer && {
    getPublicKey: () => {
      assertCurrent();
      return signer.getPublicKey();
    },
    signEvent: (request: IdentityDraft) => {
      assertCurrent();
      return signer.signEvent(request);
    },
  };
  try {
    const event = await withDeadline(
      signIdentityDraft(draft, guardedSigner, consent)
    );
    assertCurrent();
    return event;
  } finally {
    // A deadline cannot cancel an extension promise, but closes its entry points.
    active = false;
  }
}

export async function publishReviewed(
  event: DirectoryEvent,
  consent: boolean,
  transport: typeof fetch = fetch
) {
  return publishIdentityList(
    event,
    {
      async publish(original, signal) {
        const response = await transport('/api/directory/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(original),
          credentials: 'omit',
          redirect: 'error',
          signal,
        });
        if (!response.ok)
          throw new Error(
            'Publication unconfirmed. Retry only after checking current state.'
          );
        const result = await response.json();
        return { id: result.eventId, accepted: result.accepted === true };
      },
      async current(pubkey, _kind, signal) {
        const latest = await observeList(pubkey, transport, signal);
        return latest.observedComplete ? latest.currentEvent : null;
      },
    },
    consent
  );
}

export function importSignedList(
  json: string,
  expectedPubkey?: string
): DirectoryEvent {
  if (/nsec1/i.test(json))
    throw new Error(
      'Only public signed event JSON is accepted. Never paste a private key.'
    );
  if (new TextEncoder().encode(json).length > 16384)
    throw new Error('Signed event exceeds 16 KiB.');
  const event: unknown = JSON.parse(json);
  if (!validateDirectoryEvent(event) || event.kind !== 10011)
    throw new Error('Invalid or unsupported signed identity list.');
  if (expectedPubkey && event.pubkey !== expectedPubkey)
    throw new Error('Signed event author does not match this profile.');
  return event;
}
