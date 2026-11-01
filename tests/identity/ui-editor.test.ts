import {
  generatePrivateKey,
  getPublicKey,
  getEventHash,
  signEvent,
} from 'nostr-tools';
import { expect, test, vi } from 'vitest';

import { fixture } from './fixtures';
import {
  observeList,
  reviewEdit,
  signReviewed,
  publishReviewed,
  importSignedList,
} from '../../src/components/directory/workflow';

const observation = (
  event: ReturnType<typeof fixture> | null,
  pubkey = event?.pubkey ?? 'a'.repeat(64)
) => ({ pubkey, currentEvent: event, observedComplete: true });

test('review preserves every unknown string extension and content, and unknown observations block edits', () => {
  const base = fixture({
    tags: [
      ['client', 'opaque', 'extra'],
      ['i', 'custom:one', 'opaque', 'extension'],
    ],
    content: 'preserve me',
  });
  const draft = reviewEdit(
    observation(base),
    { append: ['i', 'github:two', 'gist'] },
    base.created_at + 1
  );
  expect(draft.tags).toEqual([...base.tags, ['i', 'github:two', 'gist']]);
  expect(draft.content).toBe('preserve me');
  expect(() =>
    reviewEdit(
      { ...observation(base), observedComplete: false },
      { remove: 1 },
      base.created_at + 1
    )
  ).toThrow('incomplete');
  expect(() =>
    reviewEdit(
      { ...observation(null), observedComplete: false },
      { append: ['i', 'custom:x', 'proof'] },
      base.created_at + 1
    )
  ).toThrow('incomplete');
});

test('failed fetch and opaque object encodings cannot silently become a new empty list', async () => {
  const base = fixture();
  await expect(
    observeList(base.pubkey, async () => new Response('{}', { status: 503 }))
  ).rejects.toThrow('unavailable');
  await expect(
    observeList(
      base.pubkey,
      async () =>
        new Response(
          JSON.stringify({
            ...observation(base),
            currentEvent: {
              ...base,
              tags: [['i', 'custom:x', { opaque: true }]],
            },
          })
        )
    )
  ).rejects.toThrow('encoding');
});

test('signing needs explicit consent, fresh identical base, and validated unchanged signer result', async () => {
  const key = generatePrivateKey();
  const base = fixture({}, key);
  const original = observation(base);
  const draft = reviewEdit(original, { remove: 0 }, base.created_at + 1);
  const signer = {
    getPublicKey: vi.fn(async () => getPublicKey(key)),
    signEvent: vi.fn(async (request: any) => ({
      ...request,
      id: getEventHash(request),
      sig: signEvent(request, key),
    })),
  };
  const read = vi.fn(async () => original);
  await expect(
    signReviewed(original, draft, signer, false, read)
  ).rejects.toThrow('consent');
  expect(signer.getPublicKey).not.toHaveBeenCalled();
  await expect(
    signReviewed(original, draft, signer, true, async () =>
      observation(fixture({ created_at: base.created_at + 1 }, key))
    )
  ).rejects.toThrow('rebase');
  expect(signer.signEvent).not.toHaveBeenCalled();
  expect(
    (await signReviewed(original, draft, signer, true, read)).tags
  ).toEqual([]);
  signer.signEvent.mockImplementationOnce(async (_request: any) => {
    throw new Error('User cancelled');
  });
  await expect(
    signReviewed(original, draft, signer, true, read)
  ).rejects.toThrow('cancelled');
  signer.signEvent.mockImplementationOnce(async (request: any) =>
    fixture({ ...request, content: 'tamper' }, key)
  );
  await expect(
    signReviewed(original, draft, signer, true, read)
  ).rejects.toThrow('different');
});

test('publication requires matching durable ACK and signed current-list readback, not arbitrary success JSON', async () => {
  const event = fixture();
  const calls: string[] = [];
  const transport = async (url: any) => {
    calls.push(String(url));
    return new Response(
      JSON.stringify(
        String(url).endsWith('/publish')
          ? { accepted: true, eventId: event.id }
          : observation(event)
      )
    );
  };
  expect(await publishReviewed(event, true, transport as typeof fetch)).toEqual(
    { state: 'observed', eventId: event.id }
  );
  expect(calls).toEqual([
    '/api/directory/publish',
    `/api/directory/${event.pubkey}`,
  ]);
  await expect(
    publishReviewed(event, false, transport as typeof fetch)
  ).rejects.toThrow('consent');
  await expect(
    publishReviewed(
      event,
      true,
      async () =>
        new Response(JSON.stringify({ accepted: true, eventId: 'wrong' }))
    )
  ).rejects.toThrow('accepted');
  await expect(
    publishReviewed(
      event,
      true,
      async (url: any) =>
        new Response(
          JSON.stringify(
            String(url).endsWith('/publish')
              ? { accepted: true, eventId: event.id }
              : observation(null, event.pubkey)
          )
        )
    )
  ).rejects.toThrow('readback');
});

test('signed import validates unchanged original, refuses secrets and wrong author', () => {
  const event = fixture();
  expect(
    JSON.stringify(importSignedList(JSON.stringify(event), event.pubkey))
  ).toBe(JSON.stringify(event));
  expect(() => importSignedList('nsec1private')).toThrow('public');
  expect(() => importSignedList(JSON.stringify(event), 'a'.repeat(64))).toThrow(
    'author'
  );
});
