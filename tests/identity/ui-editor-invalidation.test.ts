import React from 'react';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { IdentityEditor } from '../../src/components/directory/IdentityEditor';

// Run the real editor handlers and workflow without a DOM, keys or signatures.
// Only React's hook scheduler and the cryptographic signer boundary are replaced.
const hooks = vi.hoisted(() => ({
  slots: [] as any[],
  cursor: 0,
  effects: [] as (() => void)[],
  cleanups: [] as (() => void)[],
  signDraft: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState(initial: unknown) {
    const index = hooks.cursor;
    hooks.cursor += 1;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [
      hooks.slots[index],
      (value: unknown) => {
        hooks.slots[index] = value;
      },
    ];
  },
  useRef(initial: unknown) {
    const index = hooks.cursor;
    hooks.cursor += 1;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect(effect: () => (() => void) | void, dependencies: unknown[]) {
    const index = hooks.cursor;
    hooks.cursor += 1;
    const previous = hooks.slots[index];
    if (!previous || dependencies.some((value, i) => value !== previous[i])) {
      hooks.slots[index] = dependencies;
      hooks.effects.push(() => {
        hooks.cleanups[index]?.();
        hooks.cleanups[index] = effect() ?? (() => {});
      });
    }
  },
}));
vi.mock('../../src/identity/signer', () => ({
  signIdentityDraft: hooks.signDraft,
}));

const pubkey = 'a'.repeat(64);
const observation = { pubkey, currentEvent: null, observedComplete: true };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function render(expectedPubkey = pubkey) {
  hooks.cursor = 0;
  const tree = IdentityEditor({ expectedPubkey });
  hooks.effects.splice(0).forEach((effect) => effect());
  return tree;
}
function nodes(tree: React.ReactNode): React.ReactElement<any>[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes(tree.props.children)];
}
function button(name: string) {
  return nodes(render()).find(
    (node) => node.type === 'button' && node.props.children === name
  )!;
}
function input(placeholder: string) {
  return nodes(render()).find(
    (node) => node.props.placeholder === placeholder
  )!;
}
function consent(checked: boolean) {
  nodes(render())
    .find((node) => node.type === 'input' && node.props.type === 'checkbox')!
    .props.onChange({ target: { checked } });
}
async function flush() {
  // Drain the bounded workflow's nested promise continuations deterministically.
  for (let i = 0; i < 30; i += 1) {
    // eslint-disable-next-line no-await-in-loop -- Drain nested asynchronous boundaries in order.
    await Promise.resolve();
  }
}
async function prepare() {
  consent(true);
  button('Connect browser signer / load latest list').props.onClick();
  await flush();
  input('github:username').props.onChange({
    target: { value: 'github:review' },
  });
  nodes(render())
    .find((node) => node.type === 'form')!
    .props.onSubmit({ preventDefault() {} });
  expect(button('Sign reviewed replacement')).toBeDefined();
}
function invalidate(kind: string) {
  if (kind === 'consent') consent(false);
  if (kind === 'identity')
    input('github:username').props.onChange({
      target: { value: 'github:edited' },
    });
  if (kind === 'proof')
    input('Platform-specific proof identifier').props.onChange({
      target: { value: 'new-proof' },
    });
  if (kind === 'import')
    nodes(render())
      .find((node) => node.type === 'textarea' && !node.props.readOnly)!
      .props.onChange({ target: { value: '{}' } });
  if (kind === 'profile') render('b'.repeat(64));
  if (kind === 'unmount') hooks.cleanups.forEach((cleanup) => cleanup());
}
function hasSignedReview() {
  return nodes(render()).some(
    (node) => node.props['aria-label'] === 'Signed publication review'
  );
}
beforeEach(() => {
  hooks.slots = [];
  hooks.cursor = 0;
  hooks.effects = [];
  hooks.cleanups = [];
  hooks.signDraft.mockReset();
  vi.stubGlobal('window', {
    nostr: { getPublicKey: vi.fn(async () => pubkey), signEvent: vi.fn() },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(observation)))
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

test.each(['consent', 'profile', 'unmount'])(
  '%s invalidation cannot restore a late connected base',
  async (kind) => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockImplementationOnce(() => pending.promise);
    consent(true);
    button('Connect browser signer / load latest list').props.onClick();
    await flush();
    invalidate(kind);
    pending.resolve(new Response(JSON.stringify(observation)));
    await flush();
    expect(nodes(render()).some((node) => node.type === 'form')).toBe(false);
    expect(hooks.signDraft).not.toHaveBeenCalled();
  }
);

test.each(['resolve', 'reject'])(
  'obsolete signing %s cannot clear or replace a newer prepared review',
  async (outcome) => {
    await prepare();
    let reject!: (cause: Error) => void;
    const pending = deferred<unknown>();
    const failed = new Promise<never>((_resolve, fail) => {
      reject = fail;
    });
    hooks.signDraft.mockImplementationOnce(() =>
      outcome === 'resolve' ? pending.promise : failed
    );
    button('Sign reviewed replacement').props.onClick();
    await flush();
    invalidate('identity');
    nodes(render())
      .find((node) => node.type === 'form')!
      .props.onSubmit({ preventDefault() {} });
    if (outcome === 'resolve') pending.resolve({ id: 'obsolete' });
    else reject(new Error('obsolete signer failure'));
    await flush();
    expect(button('Sign reviewed replacement')).toBeDefined();
    expect(JSON.stringify(render())).toContain('github:edited');
    expect(hasSignedReview()).toBe(false);
    expect(nodes(render()).some((node) => node.props.role === 'alert')).toBe(
      false
    );
  }
);

test('signing is click-only and leaves publication for a separate reviewed action', async () => {
  await prepare();
  expect(hooks.signDraft).not.toHaveBeenCalled();
  hooks.signDraft.mockResolvedValueOnce({
    id: 'opaque-signer-boundary-result',
  });
  button('Sign reviewed replacement').props.onClick();
  await flush();
  expect(hooks.signDraft).toHaveBeenCalledOnce();
  expect(hasSignedReview()).toBe(true);
  expect(button('Publish reviewed signed list').props.disabled).toBe(true);
  expect(
    vi
      .mocked(fetch)
      .mock.calls.every(([, options]) => options?.method !== 'POST')
  ).toBe(true);
});

test.each(['consent', 'identity', 'proof', 'import', 'profile', 'unmount'])(
  '%s invalidation during observation never invokes signing',
  async (kind) => {
    await prepare();
    const pending = deferred<Response>();
    vi.mocked(fetch).mockImplementationOnce(() => pending.promise);
    button('Sign reviewed replacement').props.onClick();
    invalidate(kind);
    pending.resolve(new Response(JSON.stringify(observation)));
    await flush();
    expect(hooks.signDraft).not.toHaveBeenCalled();
    expect(hasSignedReview()).toBe(false);
  }
);

test.each(['consent', 'identity', 'proof', 'import', 'profile', 'unmount'])(
  '%s invalidation discards a late signing result',
  async (kind) => {
    await prepare();
    const pending = deferred<unknown>();
    hooks.signDraft.mockImplementationOnce(() => pending.promise);
    button('Sign reviewed replacement').props.onClick();
    await flush();
    expect(hooks.signDraft).toHaveBeenCalledOnce();
    invalidate(kind);
    pending.resolve({ id: 'opaque-signer-boundary-result' });
    await flush();
    expect(hasSignedReview()).toBe(false);
  }
);
