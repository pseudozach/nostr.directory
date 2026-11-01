import { normalizePerson, publicKey, text } from './model';
import type { Person } from './model';
import { directoryRequest } from './request';

export type LegacyLookup = (
  handle: string
) => Promise<Record<string, unknown> | null>;

export async function resolveProfile(
  identifier: string,
  legacyLookup: LegacyLookup,
  transport: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<{ person: Person }> {
  return directoryRequest(async (boundedSignal) => {
    let key = publicKey(identifier);
    let legacy: Record<string, unknown> | null = null;
    if (!key) {
      const handle = identifier.replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_]{1,30}$/.test(handle))
        throw new Error(
          'Use a public npub, nprofile, hex key, or legacy handle.'
        );
      legacy = await legacyLookup(handle);
      key = publicKey(
        text(legacy?.nPubKey) ??
          text(legacy?.hexPubKey) ??
          text(legacy?.pubkey) ??
          ''
      );
      if (!key) throw new Error('No legacy mapping found for this handle.');
    }
    const response = await transport(`/api/directory/${key}`, {
      credentials: 'omit',
      cache: 'no-store',
      signal: boundedSignal,
    });
    if (!response.ok)
      throw new Error(
        'Directory unavailable for this public key. Current account-list state is unknown; retry later.'
      );
    const person = normalizePerson(await response.json());
    if (person.pubkey !== key)
      throw new Error('Directory returned a different public key.');
    if (legacy)
      person.legacy.push({
        platform: 'twitter',
        identity: text(legacy.screenName) ?? identifier,
        historicallyVerified: legacy.verified === true,
        ...(typeof legacy.verifiedAt === 'string'
          ? { verifiedAt: text(legacy.verifiedAt, 100) }
          : {}),
        ...(typeof legacy.verified_at === 'string'
          ? { verified_at: text(legacy.verified_at, 100) }
          : {}),
        ...(typeof legacy.method === 'string'
          ? { method: text(legacy.method, 128) }
          : {}),
        ...(typeof legacy.proofUrl === 'string'
          ? { proofUrl: text(legacy.proofUrl, 2048) }
          : {}),
      });
    return { person };
  }, signal);
}
