/* eslint-disable no-restricted-syntax, no-await-in-loop -- Exercise enabled/disabled lifecycles sequentially. */
import { generatePrivateKey } from 'nostr-tools';
import { expect, test, vi } from 'vitest';

import { createRuntime, loadConfig } from '../../services/directory/src/main';
import { ProofWorker } from '../../services/directory/src/proof-worker';
import { DirectoryStore } from '../../services/directory/src/store';
import { fixture } from '../identity/fixtures';

test('workers share the durable 500 outbound-per-day reservation rather than a process budget', async () => {
  const store = new DirectoryStore(':memory:');
  const budget = store.outboundBudget();
  for (let i = 0; i < 499; i += 1)
    expect(budget.reserve(Date.now())).toBe(true);
  store.apply(
    fixture({
      tags: [
        ['i', 'github:alice', 'abc123'],
        ['i', 'github:bob', 'abc124'],
      ],
    })
  );
  const transport = vi.fn(async () => ({}));
  const worker = new ProofWorker(store, { transport });
  try {
    await worker.tick();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(budget.reserve(Date.now())).toBe(false);
  } finally {
    await worker.stop();
    store.close();
  }
});

test('replacements invalidate queued snapshots without requesting their removed proofs', async () => {
  const store = new DirectoryStore(':memory:');
  const key = generatePrivateKey();
  const event = fixture(
    {
      tags: Array.from({ length: 4 }, (_, i) => [
        'i',
        `github:user${i}`,
        `abc12${i}`,
      ]),
    },
    key
  );
  store.apply(event);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const transport = vi.fn(async () => {
    await held;
    return {};
  });
  const worker = new ProofWorker(store, { transport });
  try {
    const tick = worker.tick();
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    store.apply(fixture({ created_at: event.created_at + 1, tags: [] }, key));
    release();
    await tick;
    expect(transport).toHaveBeenCalledTimes(2);
    expect(
      worker.checks.read({
        pubkey: event.pubkey,
        eventId: event.id,
        position: 0,
        platform: 'github',
        identity: 'user0',
        proof: 'abc120',
      }).reason
    ).toBe('removed-or-replaced');
  } finally {
    release();
    await worker.stop();
    store.close();
  }
});

test('stopping during unresolved DNS prevents a late request or cache write', async () => {
  const store = new DirectoryStore(':memory:');
  store.apply(fixture({ tags: [['i', 'github:alice', 'abc123']] }));
  let resolve!: (addresses: Array<{ address: string; family: number }>) => void;
  const request = vi.fn();
  const dns = vi.fn(
    () =>
      new Promise<Array<{ address: string; family: number }>>((done) => {
        resolve = done;
      })
  );
  const worker = new ProofWorker(store, { network: { resolve: dns, request } });
  const tick = worker.tick();
  await vi.waitFor(() => expect(dns).toHaveBeenCalledTimes(1));
  await worker.stop();
  await tick;
  store.close();
  resolve([{ address: '8.8.8.8', family: 4 }]);
  await Promise.resolve();
  expect(request).not.toHaveBeenCalled();
});

test('runtime starts periodic proofs only when enabled and closes the worker', async () => {
  vi.useFakeTimers();
  const tick = vi.spyOn(ProofWorker.prototype, 'tick').mockResolvedValue();
  try {
    for (const enabled of [false, true]) {
      const runtime = createRuntime({
        ...loadConfig({
          DIRECTORY_SQLITE_PATH: ':memory:',
          DIRECTORY_PEERS: '',
          DIRECTORY_PROOFS_ENABLED: String(enabled),
        }),
        port: 0,
      });
      expect(tick).not.toHaveBeenCalled();
      await runtime.start();
      await vi.advanceTimersByTimeAsync(120000);
      expect(tick).toHaveBeenCalledTimes(enabled ? 3 : 0);
      await runtime.close();
      tick.mockClear();
      await vi.advanceTimersByTimeAsync(120000);
      expect(tick).not.toHaveBeenCalled();
    }
  } finally {
    tick.mockRestore();
    vi.useRealTimers();
  }
});

test('stop aborts active requests, drains checks before closing storage, and starts no queued claims', async () => {
  const store = new DirectoryStore(':memory:');
  store.apply(
    fixture({
      tags: Array.from({ length: 5 }, (_, i) => [
        'i',
        `github:user${i}`,
        `abc12${i}`,
      ]),
    })
  );
  const signals: AbortSignal[] = [];
  const worker = new ProofWorker(store, {
    network: {
      resolve: async () => [{ address: '8.8.8.8', family: 4 }],
      request: async (_url, options) => {
        signals.push(options.signal);
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true }
          );
        });
      },
    },
  });
  const tick = worker.tick();
  await vi.waitFor(() => expect(signals).toHaveLength(2));
  await worker.stop();
  await tick;
  expect(signals.every((signal) => signal.aborted)).toBe(true);
  await worker.tick();
  expect(signals).toHaveLength(2);
  store.close();
});

test('construction is lazy and a tick durably checks exact current claim positions', async () => {
  const store = new DirectoryStore(':memory:');
  const event = fixture({
    tags: [
      ['p', 'ignored'],
      ['i', 'github:alice', 'abc123'],
    ],
  });
  store.apply(event);
  let requests = 0;
  const worker = new ProofWorker(store, {
    transport: async () => {
      requests += 1;
      return {};
    },
  });
  try {
    expect(requests).toBe(0);
    await worker.tick();
    expect(requests).toBe(1);
    const cachedTransport = vi.fn(async () => ({}));
    const second = new ProofWorker(store, { transport: cachedTransport });
    await second.tick();
    expect(cachedTransport).not.toHaveBeenCalled();
    expect(requests).toBe(1);
    expect(
      worker.checks.read({
        pubkey: event.pubkey,
        eventId: event.id,
        position: 1,
        platform: 'github',
        identity: 'alice',
        proof: 'abc123',
      }).reason
    ).not.toBe('unchecked');
    await second.stop();
  } finally {
    await worker.stop();
    store.close();
  }
});

test('finite rotating batches never exceed two checks or overlap ticks', async () => {
  const store = new DirectoryStore(':memory:');
  store.apply(
    fixture({
      tags: Array.from({ length: 7 }, (_, i) => [
        'i',
        `github:user${i}`,
        `abc12${i}`,
      ]),
    })
  );
  const releases: Array<() => void> = [];
  let active = 0;
  let peak = 0;
  let calls = 0;
  const worker = new ProofWorker(store, {
    batchSize: 3,
    transport: async () => {
      calls += 1;
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => {
        releases.push(resolve);
      });
      active -= 1;
      return {};
    },
  });
  try {
    const tick = worker.tick();
    await vi.waitFor(() => expect(calls).toBe(2));
    await worker.tick();
    expect(calls).toBe(2);
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(calls).toBe(3));
    releases.splice(0).forEach((release) => release());
    await tick;
    expect(peak).toBe(2);
    const next = worker.tick();
    await vi.waitFor(() => expect(calls).toBe(5));
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(calls).toBe(6));
    releases.splice(0).forEach((release) => release());
    await next;
  } finally {
    releases.splice(0).forEach((release) => release());
    await worker.stop();
    store.close();
  }
});
