import { expect, test, vi } from 'vitest';

import { fixture } from './fixtures';
import * as publication from '../../src/identity/publish';

test('publishes the exact signed list only after explicit publication consent', async () => {
  const event = fixture();
  const sent: unknown[] = [];
  const relay = {
    publish: async (original: unknown) => {
      sent.push(original);
      return { id: event.id, accepted: true };
    },
    current: async () => event,
  };
  expect(publication).toHaveProperty('publishIdentityList');
  await expect(
    publication.publishIdentityList(event, relay, false)
  ).rejects.toThrow('consent');
  expect(sent).toEqual([]);
  await expect(
    publication.publishIdentityList(event, relay, true)
  ).resolves.toEqual({
    state: 'observed',
    eventId: event.id,
  });
  expect(sent).toEqual([event]);
  expect(sent[0]).toBe(event);
});

test('rejects readback that does not independently validate the exact signed list', async () => {
  const event = fixture();
  await Promise.all(
    [null, fixture(), { ...event, tags: [] }].map(async (current) => {
      const relay = {
        publish: async () => ({ id: event.id, accepted: true }),
        current: async () => current,
      };
      await expect(
        publication.publishIdentityList(event, relay, true)
      ).rejects.toThrow('readback');
    })
  );
});

test('refuses invalid or non-list originals before contacting a relay', async () => {
  const event = fixture();
  const calls: unknown[] = [];
  const relay = {
    publish: async (original: unknown) => {
      calls.push(original);
      return { id: event.id, accepted: true };
    },
    current: async () => event,
  };
  await Promise.all(
    [fixture({ kind: 0 }), { ...event, tags: [] }].map(async (original) => {
      await expect(
        publication.publishIdentityList(original, relay, true)
      ).rejects.toThrow('invalid identity list');
    })
  );
  expect(calls).toEqual([]);
});

test('aborts stalled publication within three seconds even if transport ignores cancellation', async () => {
  vi.useFakeTimers();
  try {
    const event = fixture();
    let signal: AbortSignal | undefined;
    const relay = {
      publish: async (_event: unknown, received: AbortSignal) => {
        signal = received;
        return new Promise<{ id: string; accepted: boolean }>(() => {});
      },
      current: async () => event,
    };
    const outcome = publication.publishIdentityList(event, relay, true).then(
      () => 'observed',
      (error: Error) => error.message
    );
    const bounded = Promise.race([
      outcome,
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('still pending'), 3100);
      }),
    ]);
    await vi.advanceTimersByTimeAsync(3100);
    expect(await bounded).toBe('publication unconfirmed: timeout');
    expect(signal?.aborted).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

test('rejects a relay acknowledgement for a different event', async () => {
  const event = fixture();
  const relay = {
    publish: async () => ({ id: '0'.repeat(64), accepted: true }),
    current: async () => event,
  };
  await expect(
    publication.publishIdentityList(event, relay, true)
  ).rejects.toThrow('not accepted');
});
