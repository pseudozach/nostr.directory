import { nip19 } from 'nostr-tools';

import { safeFetchJson } from './safe-fetch';

export const CHECKER_VERSION = 'nip39-public-v2.1';
export const SUCCESS_TTL_MS = 86400000;
export const RETRY_TTL_MS = 900000;
export type ProofState =
  | 'verified'
  | 'claim'
  | 'not-checkable'
  | 'mismatch'
  | 'stale';
export type ProofInput = {
  pubkey: string;
  platform: string;
  identity: string;
  proof: unknown;
};
export type ProofResult = {
  state: ProofState;
  checkedAt: number;
  expiresAt: number;
  authorId?: string;
  reason: string;
  checkerVersion: string;
  lastSuccessAt?: number;
};
/** Trusted injectable internal JSON boundary; production always uses pinned safe networking. */
export type ProofTransport = (url: string) => Promise<unknown>;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('unestablished-format');
  return value as Record<string, unknown>;
}
function containsKey(text: string, npub: string): boolean {
  return text.split(/[^a-zA-Z0-9]/).includes(npub);
}

/** Parse only the constrained markup emitted by Mastodon; never search attributes or raw HTML. */
function mastodonText(html: string): string {
  let rest = html;
  let text = '';
  while (rest) {
    const plain = /^[^<]+/.exec(rest);
    if (plain) {
      text += plain[0];
      rest = rest.slice(plain[0].length);
    } else {
      const tag =
        /^<\/?(?:p|br|span|a|strong|em|b|i|u|s|blockquote|code|pre|ul|ol|li)(?:\s+[a-zA-Z_:][\w:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/.exec(
          rest
        );
      if (!tag) throw new Error('unsupported-markup');
      text += ' ';
      rest = rest.slice(tag[0].length);
    }
  }
  return text;
}

/** A declaration must already belong to a validated current signed event at the caller. */
export async function evaluateProof(
  input: ProofInput,
  transport: ProofTransport = safeFetchJson
): Promise<ProofResult> {
  const checkedAt = Date.now();
  const result = (
    state: ProofState,
    reason: string,
    authorId?: string
  ): ProofResult => ({
    state,
    reason,
    checkedAt,
    expiresAt:
      checkedAt + (state === 'verified' ? SUCCESS_TTL_MS : RETRY_TTL_MS),
    checkerVersion: CHECKER_VERSION,
    ...(authorId ? { authorId } : {}),
  });
  try {
    if (!/^[a-f0-9]{64}$/.test(input.pubkey))
      return result('not-checkable', 'invalid-pubkey');
    const npub = nip19.npubEncode(input.pubkey);
    if (input.platform === 'mastodon') {
      const identity =
        /^([a-z0-9_]{1,64})@((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63})$/i.exec(
          input.identity
        );
      if (
        !identity ||
        input.identity.length > 320 ||
        typeof input.proof !== 'string' ||
        !/^[0-9]{1,30}$/.test(input.proof)
      )
        return result('not-checkable', 'unsupported-proof-format');
      const username = identity[1]!;
      const host = identity[2]!.toLowerCase();
      const origin = `https://${host}`;
      const accountUrl = `${origin}/@${username}`;
      const account = object(
        await transport(
          `${origin}/api/v1/accounts/lookup?acct=${encodeURIComponent(
            username
          )}`
        )
      );
      if (
        typeof account.id !== 'string' ||
        !/^[0-9]{1,30}$/.test(account.id) ||
        account.username !== username ||
        account.acct !== username ||
        account.url !== accountUrl
      )
        return result('not-checkable', 'unestablished-local-account');
      const status = object(
        await transport(`${origin}/api/v1/statuses/${input.proof}`)
      );
      const author = object(status.account);
      const authorId = `${origin}/users/${account.id}`;
      if (
        status.id !== input.proof ||
        status.url !== `${accountUrl}/${input.proof}` ||
        status.reblog !== null ||
        typeof status.content !== 'string'
      )
        return result('not-checkable', 'unestablished-original-status');
      if (
        author.id !== account.id ||
        author.username !== username ||
        author.acct !== username ||
        author.url !== accountUrl
      )
        return result('mismatch', 'different-author');
      const matches = containsKey(mastodonText(status.content), npub);
      return result(
        matches ? 'verified' : 'mismatch',
        matches ? 'author-and-npub' : 'npub-not-found',
        authorId
      );
    }
    if (input.platform === 'bluesky') {
      if (
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(
          input.identity
        ) ||
        input.identity.length > 253 ||
        typeof input.proof !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(input.proof)
      )
        return result('not-checkable', 'unsupported-proof-format');
      const resolved = object(
        await transport(
          `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${input.identity}`
        )
      );
      if (
        typeof resolved.did !== 'string' ||
        !/^did:plc:[a-z2-7]{24}$/.test(resolved.did)
      )
        return result('not-checkable', 'unsupported-did');
      const uri = `at://${resolved.did}/app.bsky.feed.post/${input.proof}`;
      const response = object(
        await transport(
          `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(
            uri
          )}`
        )
      );
      if (!Array.isArray(response.posts) || response.posts.length !== 1)
        return result('not-checkable', 'unestablished-post');
      const post = object(response.posts[0]);
      const author = object(post.author);
      const record = object(post.record);
      if (
        post.uri !== uri ||
        record.$type !== 'app.bsky.feed.post' ||
        typeof record.text !== 'string' ||
        typeof author.did !== 'string' ||
        typeof author.handle !== 'string'
      )
        return result('not-checkable', 'unestablished-post');
      if (
        author.did !== resolved.did ||
        author.handle.toLowerCase() !== input.identity
      )
        return result('mismatch', 'different-author', author.did);
      return result(
        containsKey(record.text, npub) ? 'verified' : 'mismatch',
        containsKey(record.text, npub) ? 'author-and-npub' : 'npub-not-found',
        author.did
      );
    }
    if (input.platform !== 'github')
      return result('not-checkable', 'unsupported-public-proof');
    if (
      typeof input.proof !== 'string' ||
      !/^[a-f0-9]{5,64}$/.test(input.proof) ||
      !/^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(input.identity)
    )
      return result('not-checkable', 'unsupported-proof-format');
    const gist = object(
      await transport(`https://api.github.com/gists/${input.proof}`)
    );
    const owner = object(gist.owner);
    if (
      gist.id !== input.proof ||
      typeof owner.login !== 'string' ||
      !Number.isSafeInteger(owner.id) ||
      Number(owner.id) <= 0
    )
      return result('not-checkable', 'unestablished-author');
    const authorId = `github:${owner.id}`;
    if (owner.login.toLowerCase() !== input.identity.toLowerCase())
      return result('mismatch', 'different-author', authorId);
    const files = object(gist.files);
    const complete = Object.entries(files)
      .map(([name, value]) => ({ name, file: object(value) }))
      .filter(
        ({ name, file }) =>
          file.filename === name &&
          file.truncated === false &&
          typeof file.content === 'string'
      );
    if (complete.some(({ file }) => containsKey(file.content as string, npub)))
      return result('verified', 'author-and-npub', authorId);
    return result(
      complete.length ? 'mismatch' : 'not-checkable',
      complete.length ? 'npub-not-found' : 'incomplete-file',
      authorId
    );
  } catch {
    return result('not-checkable', 'unavailable-or-unestablished');
  }
}
