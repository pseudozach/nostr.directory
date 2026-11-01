import { expect, test, vi } from 'vitest';

import {
  reviewEdit,
  signReviewed,
} from '../../src/components/directory/workflow';
import type { DirectoryEvent } from '../../src/identity/events';
import type { IdentitySigner } from '../../src/identity/signer';

const { signDraft } = vi.hoisted(() => ({ signDraft: vi.fn() }));
vi.mock('../../src/identity/signer', () => ({ signIdentityDraft: signDraft }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const base = {
  pubkey: 'a'.repeat(64),
  currentEvent: null,
  observedComplete: true,
};
const draft = reviewEdit(base, { append: ['i', 'github:review', 'proof'] }, 1);

test('invalidated review cannot invoke the signer after a delayed fresh observation', async () => {
  signDraft.mockClear();
  const pending = deferred<typeof base>();
  let current = true;
  const operation = signReviewed(
    base,
    draft,
    undefined,
    true,
    () => pending.promise,
    () => current
  );
  const checked = expect(operation).rejects.toThrow(/invalidated/i);
  current = false;
  pending.resolve(base);
  await checked;
  expect(signDraft).not.toHaveBeenCalled();
});

test('invalidated review rejects a late signer result', async () => {
  const pending = deferred<DirectoryEvent>();
  signDraft.mockImplementationOnce(() => pending.promise);
  let current = true;
  const operation = signReviewed(
    base,
    draft,
    undefined,
    true,
    async () => base,
    () => current
  );
  const checked = expect(operation).rejects.toThrow(/invalidated/i);
  await vi.waitFor(() => expect(signDraft).toHaveBeenCalled());
  current = false;
  // Opaque boundary result: no keys, signatures or publication are needed.
  pending.resolve({ ...draft, id: 'late-result' } as DirectoryEvent);
  await checked;
});

test('invalidating during signer key lookup prevents the subsequent signEvent call', async () => {
  const pending = deferred<string>();
  const signer = {
    getPublicKey: vi.fn(() => pending.promise),
    signEvent: vi.fn(),
  };
  signDraft.mockImplementationOnce(
    async (_draft, guardedSigner: IdentitySigner) => {
      await guardedSigner.getPublicKey();
      return guardedSigner.signEvent(draft);
    }
  );
  let current = true;
  const operation = signReviewed(
    base,
    draft,
    signer,
    true,
    async () => base,
    () => current
  );
  const checked = expect(operation).rejects.toThrow(/invalidated/i);
  await vi.waitFor(() => expect(signer.getPublicKey).toHaveBeenCalledOnce());
  current = false;
  pending.resolve(base.pubkey);
  await checked;
  expect(signer.signEvent).not.toHaveBeenCalled();
});

test('browser signer deadline closes the operation before a late key lookup can sign', async () => {
  vi.useFakeTimers();
  try {
    const pending = deferred<string>();
    const signer = {
      getPublicKey: vi.fn(() => pending.promise),
      signEvent: vi.fn(),
    };
    signDraft.mockImplementationOnce(
      async (_draft, guardedSigner: IdentitySigner) => {
        await guardedSigner.getPublicKey();
        return guardedSigner.signEvent(draft);
      }
    );
    const operation = signReviewed(base, draft, signer, true, async () => base);
    const checked = expect(operation).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(30001);
    await checked;
    pending.resolve(base.pubkey);
    await vi.advanceTimersByTimeAsync(0);
    expect(signer.signEvent).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
