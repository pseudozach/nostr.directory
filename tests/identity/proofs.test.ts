import { nip19 } from 'nostr-tools';
import { expect, test } from 'vitest';

import { evaluateProof } from '../../services/directory/src/proofs';

const pubkey = 'a'.repeat(64);
const npub = nip19.npubEncode(pubkey);
const claim = {
  pubkey,
  platform: 'github',
  identity: 'alice',
  proof: 'abcdef1234',
};

const githubFixture = () => ({
  id: claim.proof,
  owner: { login: 'alice', id: 42 },
  files: { proof: { filename: 'proof', truncated: false, content: npub } },
});

test.each([
  ['wrong owner', { owner: { login: 'mallory', id: 8 } }, 'mismatch'],
  ['wrong gist', { id: 'deadbeef' }, 'not-checkable'],
  ['anonymous owner', { owner: null }, 'not-checkable'],
  [
    'unsafe numeric owner',
    { owner: { login: 'alice', id: Number.MAX_SAFE_INTEGER + 1 } },
    'not-checkable',
  ],
  ['missing files', { files: null }, 'not-checkable'],
])('GitHub fails closed for %s', async (_label, patch, state) => {
  expect(
    await evaluateProof(claim, async () => ({ ...githubFixture(), ...patch }))
  ).toMatchObject({ state });
});

test.each([
  [`${npub}x`, false, 'proof', 'mismatch'],
  [`x${npub}`, false, 'proof', 'mismatch'],
  [nip19.npubEncode('b'.repeat(64)), false, 'proof', 'mismatch'],
  [npub, true, 'proof', 'not-checkable'],
  [npub, false, 'different-filename', 'not-checkable'],
])(
  'GitHub requires an exact npub in a complete, identified file %#',
  async (content, truncated, filename, state) => {
    expect(
      await evaluateProof(claim, async () => ({
        ...githubFixture(),
        files: { proof: { content, truncated, filename } },
      }))
    ).toMatchObject({ state });
  }
);

test.each([
  ['twitter', 'alice', '123'],
  ['github', 'alice/../bob', 'abcdef'],
  ['github', 'alice', 'https://evil.example'],
  ['mastodon', 'alice@127.0.0.1', '123'],
  ['mastodon', 'alice@social.example', '../123'],
  ['bluesky', 'alice.bsky.social/evil', '123'],
  ['bluesky', 'alice.bsky.social', 'https://evil.example'],
])(
  'rejects unsupported provider/identifier/proof without outbound calls %#',
  async (platform, identity, proof) => {
    let calls = 0;
    expect(
      await evaluateProof({ pubkey, platform, identity, proof }, async () => {
        calls += 1;
        throw new Error('unexpected');
      })
    ).toMatchObject({ state: 'not-checkable' });
    expect(calls).toBe(0);
  }
);

test('rejects malformed pubkeys before outbound calls and unavailable providers never verify', async () => {
  let calls = 0;
  const transport = async () => {
    calls += 1;
    throw new Error('unavailable');
  };
  expect(
    await evaluateProof({ ...claim, pubkey: 'bad' }, transport)
  ).toMatchObject({ state: 'not-checkable', reason: 'invalid-pubkey' });
  expect(calls).toBe(0);
  expect(await evaluateProof(claim, transport)).toMatchObject({
    state: 'not-checkable',
  });
});

test('Mastodon checks local instance account and original status author, ignoring HTML attributes and boosts', async () => {
  const check = (id: string, content: string, reblog: unknown = null) =>
    evaluateProof(
      {
        pubkey,
        platform: 'mastodon',
        identity: 'alice@social.example',
        proof: '12345',
      },
      async (url) => {
        if (url.includes('/accounts/lookup'))
          return {
            id: '7',
            username: 'alice',
            acct: 'alice',
            url: 'https://social.example/@alice',
          };
        expect(url).toBe('https://social.example/api/v1/statuses/12345');
        return {
          id: '12345',
          url: 'https://social.example/@alice/12345',
          account: {
            id,
            username: 'alice',
            acct: 'alice',
            url: 'https://social.example/@alice',
          },
          content,
          reblog,
        };
      }
    );
  expect(await check('7', `<p>My key is ${npub}</p>`)).toMatchObject({
    state: 'verified',
    authorId: 'https://social.example/users/7',
  });
  expect(await check('8', npub)).toMatchObject({ state: 'mismatch' });
  expect(await check('7', `<a href="${npub}">unrelated</a>`)).toMatchObject({
    state: 'mismatch',
  });
  expect(await check('7', npub, { content: npub })).toMatchObject({
    state: 'not-checkable',
  });
});

test('GitHub verifies actual gist owner and complete file with correct npub, retaining stable author ID', async () => {
  const result = await evaluateProof(claim, async (url) => {
    expect(url).toBe('https://api.github.com/gists/abcdef1234');
    return {
      id: claim.proof,
      owner: { login: 'Alice', id: 42 },
      files: {
        'proof.txt': {
          filename: 'proof.txt',
          content: `Old wording: ${npub}`,
          truncated: false,
        },
      },
    };
  });
  expect(result).toMatchObject({
    state: 'verified',
    authorId: 'github:42',
    checkerVersion: 'nip39-public-v2.1',
  });
  expect(result.expiresAt - result.checkedAt).toBe(86400000);
});

test.each([
  { acct: 'alice@remote.example' },
  { url: 'https://remote.example/@alice' },
  { username: 'mallory' },
  { id: '' },
])(
  'Mastodon rejects remote or unestablished local account %# before status lookup',
  async (patch) => {
    let calls = 0;
    const result = await evaluateProof(
      {
        pubkey,
        platform: 'mastodon',
        identity: 'alice@social.example',
        proof: '12345',
      },
      async () => {
        calls += 1;
        return {
          id: '7',
          username: 'alice',
          acct: 'alice',
          url: 'https://social.example/@alice',
          ...patch,
        };
      }
    );
    expect(result.state).toBe('not-checkable');
    expect(calls).toBe(1);
  }
);

test.each([
  [{ id: '999' }, 'not-checkable'],
  [{ url: 'https://other.example/@alice/12345' }, 'not-checkable'],
  [{ reblog: {} }, 'not-checkable'],
  [
    {
      account: {
        id: '7',
        username: 'alice',
        acct: 'alice@remote.example',
        url: 'https://social.example/@alice',
      },
    },
    'mismatch',
  ],
  [{ content: `<p data-key="${npub}">unrelated</p>` }, 'mismatch'],
  [{ content: `<script>${npub}</script>` }, 'not-checkable'],
  [{ content: `<!--${npub}-->` }, 'not-checkable'],
  [{ content: `${npub}x` }, 'mismatch'],
])('Mastodon rejects status/author/npub ambiguity %#', async (patch, state) => {
  const account = {
    id: '7',
    username: 'alice',
    acct: 'alice',
    url: 'https://social.example/@alice',
  };
  const result = await evaluateProof(
    {
      pubkey,
      platform: 'mastodon',
      identity: 'alice@social.example',
      proof: '12345',
    },
    async (url) =>
      url.includes('/lookup')
        ? account
        : {
            id: '12345',
            url: 'https://social.example/@alice/12345',
            account,
            content: npub,
            reblog: null,
            ...patch,
          }
  );
  expect(result.state).toBe(state);
});

test.each([
  [{ uri: 'at://did:plc:other/app.bsky.feed.post/3abc123' }, 'not-checkable'],
  [
    {
      author: {
        did: 'did:plc:abcdefghijklmnopqrstuvwx',
        handle: 'mallory.bsky.social',
      },
    },
    'mismatch',
  ],
  [
    { author: { did: 'did:plc:other', handle: 'alice.bsky.social' } },
    'mismatch',
  ],
  [{ record: { $type: 'app.bsky.feed.repost', text: npub } }, 'not-checkable'],
  [{ record: { $type: 'app.bsky.feed.post', text: `${npub}x` } }, 'mismatch'],
  [
    {
      record: { $type: 'app.bsky.feed.post', text: '', embed: { text: npub } },
    },
    'mismatch',
  ],
])(
  'Bluesky rejects mismatching URI/author/record/npub %#',
  async (patch, state) => {
    const did = 'did:plc:abcdefghijklmnopqrstuvwx';
    const result = await evaluateProof(
      {
        pubkey,
        platform: 'bluesky',
        identity: 'alice.bsky.social',
        proof: '3abc123',
      },
      async (url) =>
        url.includes('resolveHandle')
          ? { did }
          : {
              posts: [
                {
                  uri: `at://${did}/app.bsky.feed.post/3abc123`,
                  author: { did, handle: 'alice.bsky.social' },
                  record: { $type: 'app.bsky.feed.post', text: npub },
                  ...patch,
                },
              ],
            }
    );
    expect(result.state).toBe(state);
  }
);

test.each([
  null,
  {},
  { did: 'did:web:evil.example' },
  { did: 'did:plc:invalid' },
])('Bluesky rejects unestablished handle resolution %#', async (resolved) => {
  let calls = 0;
  const result = await evaluateProof(
    {
      pubkey,
      platform: 'bluesky',
      identity: 'alice.bsky.social',
      proof: '3abc123',
    },
    async () => {
      calls += 1;
      return resolved;
    }
  );
  expect(result.state).toBe('not-checkable');
  expect(calls).toBe(1);
});

test('Bluesky resolves handle to DID then checks the exact post URI, actual author and record text', async () => {
  const urls: string[] = [];
  const did = 'did:plc:abcdefghijklmnopqrstuvwx';
  const uri = `at://${did}/app.bsky.feed.post/3abc123`;
  const check = (author: string, text: string) =>
    evaluateProof(
      {
        pubkey,
        platform: 'bluesky',
        identity: 'alice.bsky.social',
        proof: '3abc123',
      },
      async (url) => {
        urls.push(url);
        return url.includes('resolveHandle')
          ? { did }
          : {
              posts: [
                {
                  uri,
                  author: { did: author, handle: 'alice.bsky.social' },
                  record: { $type: 'app.bsky.feed.post', text },
                },
              ],
            };
      }
    );
  expect(await check(did, npub)).toMatchObject({
    state: 'verified',
    authorId: did,
  });
  expect(urls[0]).toBe(
    'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=alice.bsky.social'
  );
  expect(urls[1]).toBe(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(
      uri
    )}`
  );
  expect(await check('did:plc:other', npub)).toMatchObject({
    state: 'mismatch',
  });
  expect(await check(did, 'no key')).toMatchObject({ state: 'mismatch' });
});
