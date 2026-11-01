import { nip19 } from 'nostr-tools';
import { expect, test, vi } from 'vitest';

import {
  createMemoryBudget,
  ProofChecks,
  proofCacheKey,
} from '../../services/directory/src/checks';

const input = {
  eventId: 'e'.repeat(64),
  position: 0,
  pubkey: 'a'.repeat(64),
  platform: 'github',
  identity: 'alice',
  proof: 'abcdef1234',
};
const gist = {
  id: input.proof,
  owner: { login: 'alice', id: 42 },
  files: {
    proof: {
      filename: 'proof',
      content: nip19.npubEncode(input.pubkey),
      truncated: false,
    },
  },
};

test('success expires to stale and failed refresh preserves last successful date separately with 15 minute retry', async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(100000000);
    let fail = false;
    let calls = 0;
    const cache = new ProofChecks({
      budget: createMemoryBudget(),
      isCurrent: () => true,
      transport: async () => {
        calls += 1;
        if (fail) throw new Error('blocked');
        return gist;
      },
    });
    const success = await cache.check(input);
    vi.setSystemTime(success.expiresAt);
    expect(cache.read(input)).toMatchObject({
      state: 'stale',
      lastSuccessAt: success.checkedAt,
    });
    fail = true;
    const refresh = await cache.check(input);
    expect(refresh).toMatchObject({
      state: 'not-checkable',
      lastSuccessAt: success.checkedAt,
    });
    expect(refresh.expiresAt - refresh.checkedAt).toBe(900000);
    await cache.check(input);
    expect(calls).toBe(2);
    vi.setSystemTime(refresh.expiresAt);
    expect(cache.read(input).state).toBe('stale');
  } finally {
    vi.useRealTimers();
  }
});

test('caps actual outbound requests at 500 per UTC day and two simultaneous evaluations', async () => {
  let calls = 0;
  const cache = new ProofChecks({
    budget: createMemoryBudget(),
    isCurrent: () => true,
    transport: async () => {
      calls += 1;
      return gist;
    },
  });
  await Array.from({ length: 501 }, (_, i) => i).reduce(async (previous, i) => {
    await previous;
    await cache.check({ ...input, eventId: i.toString(16).padStart(64, '0') });
  }, Promise.resolve());
  expect(calls).toBe(500);
  let active = 0;
  let peak = 0;
  const concurrent = new ProofChecks({
    budget: createMemoryBudget(),
    isCurrent: () => true,
    transport: async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      active -= 1;
      return gist;
    },
  });
  await Promise.all(
    Array.from({ length: 6 }, (_, position) =>
      concurrent.check({ ...input, position })
    )
  );
  expect(peak).toBe(2);
});

test('snapshots event binding before asynchronous evaluation', async () => {
  const mutable = { ...input };
  const checks = new ProofChecks({
    budget: createMemoryBudget(),
    isCurrent: (candidate) => candidate.pubkey === input.pubkey,
    transport: async () => gist,
  });
  const pending = checks.check(mutable);
  mutable.pubkey = 'b'.repeat(64);
  expect(await pending).toMatchObject({ state: 'verified' });
  expect(checks.read(input)).toMatchObject({ state: 'verified' });
});

test('shared injected storage deduplicates completed checks across checker instances and copies results', async () => {
  const storage = new Map();
  const transport = vi.fn(async () => gist);
  const options = {
    storage,
    transport,
    isCurrent: () => true,
    budget: createMemoryBudget(),
  };
  const first = new ProofChecks(options);
  const result = await first.check(input);
  result.state = 'mismatch';
  const second = new ProofChecks(options);
  expect(await second.check(input)).toMatchObject({ state: 'verified' });
  const read = second.read(input);
  read.state = 'mismatch';
  expect(second.read(input).state).toBe('verified');
  expect(transport).toHaveBeenCalledTimes(1);
});

test.each(['budget', 'membership'])(
  'rechecks %s before each provider request',
  async (mode) => {
    let calls = 0;
    const reserve = vi.fn(() => calls === 0);
    const checks = new ProofChecks({
      isCurrent: () => mode !== 'membership' || calls === 0,
      budget: mode === 'budget' ? { reserve } : createMemoryBudget(),
      transport: async () => {
        calls += 1;
        return { did: 'did:plc:abcdefghijklmnopqrstuvwx' };
      },
    });
    const result = await checks.check({
      ...input,
      platform: 'bluesky',
      identity: 'alice.bsky.social',
      proof: '3abc123',
    });
    expect(result.state).toBe(
      mode === 'membership' ? 'claim' : 'not-checkable'
    );
    expect(calls).toBe(1);
    if (mode === 'budget') expect(reserve).toHaveBeenCalledTimes(2);
  }
);

test('bounded queue rejects excess work and removed in-flight proofs never return verified', async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let current = true;
  const transport = vi.fn(async () => {
    await gate;
    return gist;
  });
  const checks = new ProofChecks({
    isCurrent: () => current,
    budget: createMemoryBudget(),
    transport,
  });
  const pending = Array.from({ length: 35 }, (_, position) =>
    checks.check({ ...input, position })
  );
  expect(await pending[34]).toMatchObject({
    state: 'not-checkable',
    reason: 'queue-unavailable',
  });
  current = false;
  release();
  const results = await Promise.all(pending.slice(0, 34));
  expect(results.every((result) => result.state === 'claim')).toBe(true);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(checks.read(input).state).toBe('claim');
});

test.each([-1, 256, 1.5, NaN])(
  'rejects invalid proof positions %s',
  (position) => {
    expect(() => proofCacheKey({ ...input, position })).toThrow(
      'invalid-event-binding'
    );
  }
);

test('memory budget resets only on a newer UTC day, never on clock rollback', () => {
  const budget = createMemoryBudget();
  expect(
    Array.from({ length: 500 }, () => budget.reserve(86400000)).every(Boolean)
  ).toBe(true);
  expect(budget.reserve(86400000)).toBe(false);
  expect(budget.reserve(0)).toBe(false);
  expect(budget.reserve(172800000)).toBe(true);
});

test('event+position+proof+checker-bound cache deduplicates and never returns a removed verification', async () => {
  let current = true;
  let calls = 0;
  const cache = new ProofChecks({
    budget: createMemoryBudget(),
    isCurrent: () => current,
    transport: async () => {
      calls += 1;
      return gist;
    },
  });
  const results = await Promise.all([cache.check(input), cache.check(input)]);
  expect(results.every((r) => r.state === 'verified')).toBe(true);
  expect(calls).toBe(1);
  expect((await cache.check(input)).state).toBe('verified');
  expect(proofCacheKey(input)).not.toBe(
    proofCacheKey({ ...input, eventId: 'f'.repeat(64) })
  );
  expect(proofCacheKey(input)).not.toBe(
    proofCacheKey({ ...input, position: 1 })
  );
  expect(proofCacheKey(input)).not.toBe(
    proofCacheKey({ ...input, proof: 'changed' })
  );
  expect(proofCacheKey(input)).not.toBe(proofCacheKey(input, 'other-version'));
  current = false;
  expect((await cache.read(input)).state).toBe('claim');
  expect((await cache.check(input)).state).toBe('claim');
  expect(calls).toBe(1);
});
